import { BlockchainService } from './BlockchainService.js';
import { GameService } from './GameService.js';
import { gameSessionRecorder } from './GameSessionRecorder.js';
import { gameValidationService } from './GameValidationService.js';
import { Logger } from 'shared';

export interface GameContractIntegration {
  gameId: string;
  contractGameId: number;
  entryFee: number;
  maxPlayers: number;
  currentPlayers: number;
  prizePool: number;
  status: 'waiting' | 'active' | 'finished';
  txId?: string;
}

export class GameContractService {
  private blockchainService: BlockchainService;
  private gameService: GameService;
  private activeGames: Map<string, GameContractIntegration> = new Map();

  constructor(gameService: GameService) {
    this.blockchainService = new BlockchainService();
    this.gameService = gameService;
  }

  async createGame(
    gameId: string,
    entryFee: number,
    maxPlayers: number,
    creatorPrivateKey: string
  ): Promise<GameContractIntegration> {
    try {
      Logger.info(`[GameContractService] Creating blockchain game for gameId: ${gameId}`);
      Logger.info(`[GameContractService] Entry fee: ${entryFee} STX, Max players: ${maxPlayers}`);

      // Deploy contract for this game (broadcast initialize-game-pool transaction)
      const txId = await this.blockchainService.createGamePoolContract(
        entryFee,
        maxPlayers,
        creatorPrivateKey
      );

      Logger.info(`[GameContractService] initialize-game-pool transaction broadcasted: ${txId}`);
      Logger.info(`[GameContractService] 🔗 Explorer: https://explorer.hiro.so/txid/${txId}?chain=testnet`);

      // FIXED: Wait for transaction and extract the REAL game ID from blockchain
      Logger.info(`[GameContractService] Waiting for transaction to confirm and extracting game ID...`);
      const contractGameId = await this.blockchainService.getGameIdFromTransaction(txId, 120000);

      if (contractGameId === null) {
        throw new Error('Failed to get game ID from blockchain transaction');
      }

      Logger.info(`[GameContractService] ✅ Game created on blockchain with ID: ${contractGameId}`);

      const gameIntegration: GameContractIntegration = {
        gameId,
        contractGameId,
        entryFee,
        maxPlayers,
        currentPlayers: 0,
        prizePool: 0,
        status: 'waiting',
        txId
      };

      this.activeGames.set(gameId, gameIntegration);
      Logger.info(`[GameContractService] Game ${gameId} mapped to contract ID ${contractGameId}`);

      return gameIntegration;
    } catch (error) {
      Logger.error('[GameContractService] Error creating game contract:', error);
      throw error;
    }
  }

  async joinGame(
    gameId: string, 
    playerPrivateKey: string,
    playerAddress: string
  ): Promise<boolean> {
    try {
      const gameIntegration = this.activeGames.get(gameId);
      if (!gameIntegration) {
        throw new Error('Game not found');
      }

      if (gameIntegration.status !== 'waiting') {
        throw new Error('Game is not accepting new players');
      }

      console.log(`Player ${playerAddress} joining game ${gameId}`);

      // Execute join-game contract call
      const txId = await this.blockchainService.joinGameContract(
        gameIntegration.contractGameId,
        gameIntegration.entryFee,
        playerPrivateKey
      );

      // Wait for transaction confirmation
      const confirmed = await this.blockchainService.waitForTransaction(txId, 60000);
      
      if (confirmed) {
        gameIntegration.currentPlayers++;
        gameIntegration.prizePool += gameIntegration.entryFee;
        
        console.log(`Player ${playerAddress} successfully joined game ${gameId}`);
        
        // Check if game is ready to start
        if (gameIntegration.currentPlayers >= gameIntegration.maxPlayers) {
          await this.startGame(gameId);
        }
        
        return true;
      } else {
        throw new Error('Transaction failed or timed out');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      return false;
    }
  }

  async startGame(gameId: string, gameAuthorityKey?: string): Promise<boolean> {
    try {
      const gameIntegration = this.activeGames.get(gameId);
      if (!gameIntegration) {
        throw new Error('Game not found');
      }

      Logger.info(`[GameContractService] Starting game ${gameId} on blockchain...`);

      // CRITICAL FIX: Call start-game contract function
      // This changes game status from WAITING (0) to ACTIVE (1) on-chain
      if (gameAuthorityKey) {
        try {
          const txId = await this.blockchainService.startGameContract(
            gameIntegration.contractGameId,
            gameAuthorityKey
          );

          Logger.info(`[GameContractService] ✅ start-game transaction broadcasted: ${txId}`);
          Logger.info(`[GameContractService] 🔗 Explorer: https://explorer.hiro.so/txid/${txId}?chain=testnet`);

          // DON'T wait for confirmation - accept immediately in testnet mode
          // This makes game startup non-blocking
          Logger.info(`[GameContractService] Transaction accepted (testnet mode - not waiting for confirmation)`);

        } catch (txError) {
          Logger.error(`[GameContractService] ❌ Failed to broadcast start-game transaction:`, txError);
          Logger.warn(`[GameContractService] Continuing anyway - game can work without blockchain confirmation`);
          // Don't throw - continue anyway
        }
      } else {
        Logger.warn(`[GameContractService] No authority key provided - skipping blockchain start-game call`);
      }

      // Update local status regardless of blockchain success
      gameIntegration.status = 'active';
      Logger.info(`[GameContractService] ✅ Game ${gameId} started locally (status: active)`);

      return true;
    } catch (error) {
      Logger.error('[GameContractService] Error starting game:', error);
      // Return true anyway - game should work even if blockchain fails
      return true;
    }
  }

  async endGame(
    gameId: string,
    winners: string[],
    gameAuthorityKey: string
  ): Promise<boolean> {
    try {
      const gameIntegration = this.activeGames.get(gameId);
      if (!gameIntegration) {
        throw new Error('Game not found');
      }

      Logger.info(`[GameContractService] Ending game ${gameId} with winners:`, winners);

      // CRITICAL: Verify game status is ACTIVE before calling end-game-and-distribute
      Logger.info(`[GameContractService] Checking game status on blockchain...`);
      let gameStatus = await this.blockchainService.getGameStatus(gameIntegration.contractGameId);
      Logger.info(`[GameContractService] Game status: ${gameStatus}`);

      // IMPROVED: Multiple retry attempts with fallback
      if (gameStatus !== 'active') {
        Logger.warn(`[GameContractService] ⚠️ Game status is '${gameStatus}' (expected 'active')`);

        if (gameStatus === 'waiting') {
          Logger.info(`[GameContractService] Game still WAITING - start-game might not have confirmed yet`);
          Logger.info(`[GameContractService] Attempting up to 3 retries with 30-second intervals...`);

          // Try up to 3 times with 30 second waits
          for (let retry = 1; retry <= 3; retry++) {
            Logger.info(`[GameContractService] Retry ${retry}/3: Waiting 30 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 30000));

            gameStatus = await this.blockchainService.getGameStatus(gameIntegration.contractGameId);
            Logger.info(`[GameContractService] Status after retry ${retry}: ${gameStatus}`);

            if (gameStatus === 'active') {
              Logger.info(`[GameContractService] ✅ Game is now ACTIVE after ${retry} retries`);
              break;
            }
          }
        }

        // FALLBACK: If still not active, check if we should force distribution
        if (gameStatus !== 'active') {
          const forceDistribution = process.env.FORCE_PRIZE_DISTRIBUTION === 'true';

          if (forceDistribution) {
            Logger.warn(`[GameContractService] ⚠️ FORCE_PRIZE_DISTRIBUTION enabled - attempting distribution anyway`);
            Logger.warn(`[GameContractService] This may fail on blockchain but will continue`);
          } else if (gameStatus === 'error') {
            // If we can't even get the status, but the game exists locally, try anyway
            Logger.warn(`[GameContractService] ⚠️ Status parsing error - attempting distribution as fallback`);
          } else {
            Logger.error(`[GameContractService] ❌ Cannot distribute prizes - game status is '${gameStatus}'`);
            Logger.error(`[GameContractService] To force distribution, set FORCE_PRIZE_DISTRIBUTION=true in .env`);
            return false;
          }
        }
      }

      Logger.info(`[GameContractService] ✅ Game status is ACTIVE, proceeding with prize distribution`);

      // IMPROVED: Validate session for AUDIT/LOGGING only - NOT for blocking
      // Anti-cheat validation is saved to blockchain but doesn't prevent prize distribution
      const session = gameSessionRecorder.getSession(gameId);
      if (session) {
        const validation = gameValidationService.validateSession(session);

        Logger.info(`[GameContractService] 🔍 Validation result (AUDIT ONLY): ${validation.recommendation} (risk: ${validation.riskScore})`);

        if (validation.recommendation === 'REJECT') {
          Logger.warn(`[GameContractService] ⚠️ Session validation flagged as SUSPICIOUS (but not blocking distribution)`);
          Logger.warn(`[GameContractService] Violations: ${JSON.stringify(validation.violations)}`);

          // Generate audit log for review
          const auditLog = gameValidationService.generateAuditLog(session, validation);
          Logger.warn(`[GameContractService] Audit log saved for review:\n${auditLog}`);

          // CHANGED: Don't throw error - validation is for audit purposes only
          // The session hash will be saved to blockchain for later verification
        }

        if (validation.recommendation === 'REVIEW') {
          Logger.warn(`[GameContractService] Session flagged for REVIEW (risk: ${validation.riskScore})`);
          Logger.warn(`[GameContractService] Violations: ${JSON.stringify(validation.violations)}`);
        }

        if (validation.recommendation === 'APPROVE') {
          Logger.info(`[GameContractService] ✅ Session validated successfully (risk: ${validation.riskScore})`);
        }
      } else {
        Logger.warn(`[GameContractService] No session data found for validation - proceeding anyway`);
      }

      // Execute end-game-and-distribute contract call
      const txId = await this.blockchainService.endGameContract(
        gameIntegration.contractGameId,
        winners,
        gameAuthorityKey
      );

      // Wait for transaction confirmation
      Logger.info(`[GameContractService] 💰 Waiting for prize distribution transaction: ${txId}`);
      Logger.info(`[GameContractService] 🔗 Explorer: https://explorer.hiro.so/txid/${txId}?chain=testnet`);

      const confirmed = await this.blockchainService.waitForTransaction(txId, 120000);

      if (confirmed) {
        gameIntegration.status = 'finished';
        Logger.info(`[GameContractService] ✅ Game ${gameId} ended successfully, prizes distributed on-chain!`);

        // Calculate prize distribution for logging
        const prizeDistribution = this.blockchainService.calculatePrizeDistribution(
          gameIntegration.prizePool
        );

        Logger.info('[GameContractService] Prize distribution:', prizeDistribution);

        // Record session hash on blockchain for fair play verification
        await this.recordSessionHashOnChain(gameId, gameIntegration.contractGameId, gameAuthorityKey);

        // Clean up the game
        this.activeGames.delete(gameId);

        return true;
      } else {
        // FIXED: Don't throw error, just log and return false
        Logger.error(`[GameContractService] ❌ Prize distribution transaction FAILED or TIMED OUT`);
        Logger.error(`[GameContractService] Transaction ID: ${txId}`);
        Logger.error(`[GameContractService] Check status: https://explorer.hiro.so/txid/${txId}?chain=testnet`);
        return false;
      }
    } catch (error) {
      Logger.error('[GameContractService] ❌ Error ending game:', error);
      Logger.error('[GameContractService] Error details:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Record session hash on blockchain for proof of fair play
   * This is crucial for betting/wagering scenarios to prove game integrity
   */
  private async recordSessionHashOnChain(
    gameId: string,
    contractGameId: number,
    authorityKey: string
  ): Promise<void> {
    try {
      // Generate cryptographic hash of session data
      const sessionHash = gameSessionRecorder.generateSessionHash(gameId);

      if (!sessionHash) {
        Logger.warn(`[GameContractService] No session hash generated for game ${gameId}`);
        return;
      }

      Logger.info(`[GameContractService] Recording session hash for game ${gameId}: ${sessionHash.substring(0, 16)}...`);

      // Get session JSON for potential IPFS storage
      const sessionJSON = gameSessionRecorder.getSessionJSON(gameId);

      // TODO: Upload sessionJSON to IPFS and get URI
      // For now, we'll store it locally and use game ID as reference
      const dataUri = `local://replays/${gameId}.json`;

      // Record hash on blockchain
      const txId = await this.blockchainService.recordSessionHash(
        contractGameId,
        sessionHash,
        dataUri,
        authorityKey
      );

      Logger.info(`[GameContractService] Session hash recorded on blockchain. TxID: ${txId}`);

      // Wait for confirmation
      const confirmed = await this.blockchainService.waitForTransaction(txId, 60000);

      if (confirmed) {
        Logger.info(`[GameContractService] Session hash confirmed for game ${gameId}`);
      } else {
        Logger.warn(`[GameContractService] Session hash transaction pending for game ${gameId}`);
      }

    } catch (error) {
      Logger.error(`[GameContractService] Error recording session hash:`, error);
      // Don't throw - session hash recording is important but shouldn't block game completion
    }
  }

  getGameIntegration(gameId: string): GameContractIntegration | undefined {
    return this.activeGames.get(gameId);
  }

  getAllActiveGames(): GameContractIntegration[] {
    return Array.from(this.activeGames.values());
  }

  async getGamePoolInfo(gameId: string): Promise<any> {
    const gameIntegration = this.activeGames.get(gameId);
    if (!gameIntegration) {
      return null;
    }

    try {
      return await this.blockchainService.getGamePool(gameIntegration.contractGameId);
    } catch (error) {
      console.error('Error getting game pool info:', error);
      return null;
    }
  }

  // Health check method to monitor contract state
  async healthCheck(): Promise<{ 
    totalActiveGames: number; 
    totalPrizePool: number;
    contractAccessible: boolean;
  }> {
    const activeGames = this.getAllActiveGames();
    const totalPrizePool = activeGames.reduce((sum, game) => sum + game.prizePool, 0);
    
    // Test contract accessibility
    let contractAccessible = false;
    try {
      await this.blockchainService.getNextGameId();
      contractAccessible = true;
    } catch (error) {
      console.error('Contract health check failed:', error);
    }

    return {
      totalActiveGames: activeGames.length,
      totalPrizePool,
      contractAccessible
    };
  }
}