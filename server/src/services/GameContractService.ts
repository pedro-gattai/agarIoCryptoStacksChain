import { BlockchainService } from './BlockchainService';
import { GameService } from './GameService';

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
      console.log(`Creating blockchain game for gameId: ${gameId}`);
      
      // Deploy contract for this game
      const txId = await this.blockchainService.createGamePoolContract(
        entryFee, 
        maxPlayers, 
        creatorPrivateKey
      );

      // Get the next contract game ID (this would be the actual deployed game ID)
      const contractGameId = await this.blockchainService.getNextGameId();

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
      console.log(`Game ${gameId} created with contract ID ${contractGameId}`);
      
      return gameIntegration;
    } catch (error) {
      console.error('Error creating game contract:', error);
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

  async startGame(gameId: string): Promise<boolean> {
    try {
      const gameIntegration = this.activeGames.get(gameId);
      if (!gameIntegration) {
        throw new Error('Game not found');
      }

      gameIntegration.status = 'active';
      console.log(`Game ${gameId} started with ${gameIntegration.currentPlayers} players`);
      
      // Notify game service that game can start
      // This would trigger the actual game loop
      
      return true;
    } catch (error) {
      console.error('Error starting game:', error);
      return false;
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

      console.log(`Ending game ${gameId} with winners:`, winners);

      // Execute end-game-and-distribute contract call
      const txId = await this.blockchainService.endGameContract(
        gameIntegration.contractGameId,
        winners,
        gameAuthorityKey
      );

      // Wait for transaction confirmation
      const confirmed = await this.blockchainService.waitForTransaction(txId, 120000);
      
      if (confirmed) {
        gameIntegration.status = 'finished';
        console.log(`Game ${gameId} ended successfully, prizes distributed`);
        
        // Calculate prize distribution for logging
        const prizeDistribution = this.blockchainService.calculatePrizeDistribution(
          gameIntegration.prizePool
        );
        
        console.log('Prize distribution:', prizeDistribution);
        
        // Clean up the game
        this.activeGames.delete(gameId);
        
        return true;
      } else {
        throw new Error('Prize distribution transaction failed');
      }
    } catch (error) {
      console.error('Error ending game:', error);
      return false;
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