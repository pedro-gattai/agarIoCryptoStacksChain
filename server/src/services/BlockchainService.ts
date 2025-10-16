import {
  StacksNetwork,
  StacksTestnet,
  StacksMainnet
} from '@stacks/network';
import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  createSTXPostCondition,
  FungibleConditionCode,
  makeStandardSTXPostCondition,
  stringAsciiCV,
  uintCV,
  listCV,
  principalCV,
  contractPrincipalCV,
  bufferCV,
  someCV,
  noneCV,
  getAddressFromPrivateKey,
  TransactionVersion,
  cvToHex,
  hexToCV,
  cvToJSON,
  ClarityType
} from '@stacks/transactions';
import { Configuration, AccountsApi, TransactionsApi, SmartContractsApi } from '@stacks/blockchain-api-client';
import { BLOCKCHAIN_CONSTANTS, Logger } from 'shared';

// Blockchain types
export interface Transaction {
  signature: string;
  type: TransactionType;
  amount: number;
  playerId: string;
  gameId?: string;
  status: TransactionStatus;
  createdAt: Date;
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  ENTRY_FEE = 'entry_fee',
  PRIZE_PAYOUT = 'prize_payout'
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

export interface GamePool {
  gameId: string;
  totalPool: number;
  entryFee: number;
  houseFee: number;
  prizeDistribution: PrizeDistribution[];
}

export interface PrizeDistribution {
  position: number;
  percentage: number;
  amount: number;
}

export class BlockchainService {
  private network: StacksNetwork;
  private accountsApi: AccountsApi;
  private transactionsApi: TransactionsApi;
  private smartContractsApi: SmartContractsApi;
  private contractAddress: string;
  private contractName: string;
  private nextGameIdCounter: number = 1; // Sequential counter for game IDs

  constructor() {
    // Use testnet for development
    this.network = new StacksTestnet();
    const config = new Configuration({
      basePath: this.network.coreApiUrl
    });
    this.accountsApi = new AccountsApi(config);
    this.transactionsApi = new TransactionsApi(config);
    this.smartContractsApi = new SmartContractsApi(config);
    this.contractAddress = process.env.STACKS_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    this.contractName = process.env.STACKS_CONTRACT_NAME || 'game-pool';
  }

  async getWalletBalance(walletAddress: string): Promise<number> {
    try {
      const balance = await this.accountsApi.getAccountBalance({ principal: walletAddress });
      return parseInt(balance.stx.balance) / 1000000; // Convert microSTX to STX
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return 0;
    }
  }

  async verifyTransaction(txId: string): Promise<boolean> {
    try {
      console.log(`🔍 [BlockchainService] Fetching transaction ${txId}...`);
      const transaction = await this.transactionsApi.getTransactionById({ txId });
      const status = (transaction as any).tx_status;

      console.log(`📊 [BlockchainService] Transaction status: ${status}`);

      // In testnet/development, accept pending transactions
      // In production, only accept confirmed transactions
      const isTestnet = this.network.isMainnet() === false;

      if (isTestnet) {
        // Accept pending or success status in testnet
        const isValid = status === 'success' || status === 'pending';
        console.log(`✅ [BlockchainService] Testnet mode - Transaction ${isValid ? 'accepted' : 'rejected'} (status: ${status})`);
        return isValid;
      } else {
        // Only accept success in mainnet
        return status === 'success';
      }
    } catch (error) {
      console.error('❌ [BlockchainService] Error verifying transaction:', error);

      // In development mode, be more lenient
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ [BlockchainService] Development mode - accepting transaction despite error');
        return true;
      }

      return false;
    }
  }

  async getTransactionStatus(txId: string): Promise<string> {
    try {
      const transaction = await this.transactionsApi.getTransactionById({ txId });
      return (transaction as any).tx_status || 'pending';
    } catch (error) {
      console.error('Error getting transaction status:', error);
      return 'failed';
    }
  }

  async waitForTransaction(txId: string, maxWait: number = 120000): Promise<boolean> {
    Logger.warn(`[BlockchainService] ⏳ Waiting for transaction ${txId}...`);
    Logger.warn(`[BlockchainService] 🔗 Explorer: https://explorer.hiro.so/txid/${txId}?chain=testnet`);

    // Wait 10 seconds before starting to poll to allow transaction to propagate to mempool
    Logger.warn(`[BlockchainService] ⏸️ Waiting 10 seconds for transaction to propagate to mempool...`);
    await new Promise(resolve => setTimeout(resolve, 10000));

    const startTime = Date.now();
    let pollCount = 0;

    while (Date.now() - startTime < maxWait) {
      pollCount++;
      const status = await this.getTransactionStatus(txId);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      Logger.warn(`[BlockchainService] Poll ${pollCount} (${elapsed}s): Status = ${status}`);

      if (status === 'success') {
        Logger.warn(`[BlockchainService] ✅ Transaction SUCCESS after ${elapsed}s`);
        return true;
      } else if (status === 'abort_by_response' || status === 'abort_by_post_condition') {
        Logger.error(`[BlockchainService] ❌ Transaction ABORTED: ${status}`);
        return false;
      } else if (status === 'failed') {
        // Don't fail immediately - transaction may still be propagating
        Logger.warn(`[BlockchainService] ⚠️ Transaction status 'failed' - may still be propagating, continuing to poll...`);
      } else if (status === 'pending') {
        Logger.warn(`[BlockchainService] ⏳ Transaction still pending, will keep polling...`);
      }

      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    Logger.error(`[BlockchainService] ⏰ Transaction TIMEOUT after ${maxWait/1000}s`);
    return false;
  }

  async createGamePool(gameId: string, entryFee: number, maxPlayers: number): Promise<GamePool> {
    // Create contract call for initialize-game-pool
    const gamePool: GamePool = {
      gameId,
      totalPool: 0,
      entryFee: entryFee * 1000000, // Convert STX to microSTX
      houseFee: entryFee * BLOCKCHAIN_CONSTANTS.HOUSE_FEE_PERCENTAGE,
      prizeDistribution: BLOCKCHAIN_CONSTANTS.PRIZE_DISTRIBUTION.map(prize => ({
        position: prize.position,
        percentage: prize.percentage,
        amount: 0 // Will be calculated when game ends
      }))
    };

    return gamePool;
  }

  async processEntryPayment(
    walletAddress: string, 
    gameId: string, 
    entryFee: number
  ): Promise<Transaction> {
    // Create contract call for join-game
    const transaction: Transaction = {
      signature: this.generateMockSignature(),
      type: TransactionType.ENTRY_FEE,
      amount: entryFee,
      playerId: walletAddress,
      gameId,
      status: TransactionStatus.PENDING,
      createdAt: new Date()
    };

    // Mock transaction processing for now
    setTimeout(() => {
      transaction.status = TransactionStatus.CONFIRMED;
    }, 2000);

    return transaction;
  }

  async distributePrizes(
    gameId: string, 
    winners: { walletAddress: string; prize: number }[]
  ): Promise<Transaction[]> {
    const transactions: Transaction[] = [];

    for (const winner of winners) {
      // Create contract call for end-game-and-distribute
      const transaction: Transaction = {
        signature: this.generateMockSignature(),
        type: TransactionType.PRIZE_PAYOUT,
        amount: winner.prize,
        playerId: winner.walletAddress,
        gameId,
        status: TransactionStatus.PENDING,
        createdAt: new Date()
      };

      transactions.push(transaction);

      // Mock transaction processing for now
      setTimeout(() => {
        transaction.status = TransactionStatus.CONFIRMED;
      }, 3000);
    }

    return transactions;
  }

  async validateEntryFee(entryFee: number): Promise<boolean> {
    return entryFee >= BLOCKCHAIN_CONSTANTS.MIN_ENTRY_FEE && 
           entryFee <= BLOCKCHAIN_CONSTANTS.MAX_ENTRY_FEE;
  }

  calculatePrizeDistribution(totalPool: number): { position: number; amount: number }[] {
    const availablePool = totalPool * (1 - BLOCKCHAIN_CONSTANTS.HOUSE_FEE_PERCENTAGE);
    
    return BLOCKCHAIN_CONSTANTS.PRIZE_DISTRIBUTION.map(prize => ({
      position: prize.position,
      amount: availablePool * prize.percentage
    }));
  }

  // Read-only functions to query contract state
  async getGamePool(gameId: number): Promise<any> {
    try {
      const config = new Configuration({
        basePath: this.network.coreApiUrl
      });
      const contractsApi = new SmartContractsApi(config);

      // FIXED: Use correct format for Clarity uint argument
      // Convert CV to hex using cvToHex
      const gameIdArg = uintCV(gameId);
      const hexArg = cvToHex(gameIdArg);

      const result = await contractsApi.callReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'get-game-pool',
        readOnlyFunctionArgs: {
          sender: this.contractAddress,
          arguments: [hexArg]
        }
      });

      return result;
    } catch (error) {
      console.error('Error getting game pool:', error);
      return null;
    }
  }

  // Get game status from blockchain
  async getGameStatus(gameId: number): Promise<'waiting' | 'active' | 'finished' | 'error'> {
    try {
      const gamePool = await this.getGamePool(gameId);
      if (!gamePool || !gamePool.result) {
        Logger.error(`[BlockchainService] Game ${gameId} not found on blockchain`);
        return 'error';
      }

      // Parse the hex result using Stacks.js functions
      const resultHex = gamePool.result;

      try {
        // Convert hex to Clarity value and then to JSON
        const clarityValue = hexToCV(resultHex);
        const jsonValue = cvToJSON(clarityValue);

        Logger.info(`[BlockchainService] Parsed game pool data:`, JSON.stringify(jsonValue, null, 2));

        // Handle different response types
        if (jsonValue && typeof jsonValue === 'object') {
          // Check if it's an optional (Some) value with nested tuple
          if ('value' in jsonValue && jsonValue.value && typeof jsonValue.value === 'object') {
            const outerValue = jsonValue.value;

            // Check if there's another nested value (tuple inside optional)
            if ('value' in outerValue && outerValue.value && typeof outerValue.value === 'object') {
              const tupleData = outerValue.value;

              // Extract status from deeply nested tuple
              if ('status' in tupleData && tupleData.status && typeof tupleData.status === 'object') {
                const statusObj = tupleData.status;
                const statusValue = statusObj.value;

                Logger.info(`[BlockchainService] Extracted status value: ${statusValue}`);

                if (statusValue === 0 || statusValue === '0' || statusValue === '0n') {
                  return 'waiting';
                } else if (statusValue === 1 || statusValue === '1' || statusValue === '1n') {
                  return 'active';
                } else if (statusValue === 2 || statusValue === '2' || statusValue === '2n') {
                  return 'finished';
                }
              }
            }

            // Fallback: Check direct status in value
            if ('status' in outerValue) {
              const statusValue = outerValue.status;

              if (statusValue === 0 || statusValue === '0') {
                return 'waiting';
              } else if (statusValue === 1 || statusValue === '1') {
                return 'active';
              } else if (statusValue === 2 || statusValue === '2') {
                return 'finished';
              }
            }
          }

          // Direct tuple access (if not wrapped in optional)
          if ('status' in jsonValue) {
            const statusValue = jsonValue.status;

            if (statusValue === 0 || statusValue === '0') {
              return 'waiting';
            } else if (statusValue === 1 || statusValue === '1') {
              return 'active';
            } else if (statusValue === 2 || statusValue === '2') {
              return 'finished';
            }
          }
        }

        Logger.warn(`[BlockchainService] Could not extract status from parsed data:`, jsonValue);
        return 'error';

      } catch (parseError) {
        // Fallback to string parsing if hex decode fails
        Logger.warn(`[BlockchainService] Failed to decode hex, falling back to string parsing:`, parseError);

        const resultStr = resultHex.toString();
        if (resultStr.includes('status: u0')) {
          return 'waiting';
        } else if (resultStr.includes('status: u1')) {
          return 'active';
        } else if (resultStr.includes('status: u2')) {
          return 'finished';
        }

        Logger.warn(`[BlockchainService] Could not parse game status from: ${resultStr}`);
        return 'error';
      }

    } catch (error) {
      Logger.error('[BlockchainService] Error getting game status:', error);
      return 'error';
    }
  }

  async getNextGameId(): Promise<number> {
    // For development/hackathon: use sequential counter
    // In production with deployed contracts, this would query the contract's get-next-game-id
    const gameId = this.nextGameIdCounter++;
    console.log(`[BlockchainService] Generated game ID: ${gameId}`);
    return gameId;
  }

  // Extract game ID from initialize-game-pool transaction result
  async getGameIdFromTransaction(txId: string, maxWait: number = 120000): Promise<number | null> {
    try {
      Logger.info(`[BlockchainService] Waiting for initialize-game-pool transaction to confirm...`);

      // Wait for transaction to confirm
      const confirmed = await this.waitForTransaction(txId, maxWait);

      if (!confirmed) {
        Logger.error(`[BlockchainService] Transaction ${txId} did not confirm`);
        return null;
      }

      // Fetch transaction details to get the return value
      Logger.info(`[BlockchainService] Fetching transaction result for ${txId}...`);
      const transaction = await this.transactionsApi.getTransactionById({ txId });

      // Parse the result - should be (ok u{game-id})
      const txResult = (transaction as any).tx_result;

      if (!txResult || !txResult.repr) {
        Logger.error(`[BlockchainService] No result found in transaction`);
        return null;
      }

      Logger.info(`[BlockchainService] Transaction result: ${txResult.repr}`);

      // Extract number from "(ok u53)" format
      const match = txResult.repr.match(/\(ok u(\d+)\)/);

      if (match && match[1]) {
        const gameId = parseInt(match[1]);
        Logger.info(`[BlockchainService] ✅ Extracted game ID from blockchain: ${gameId}`);
        return gameId;
      }

      Logger.error(`[BlockchainService] Could not parse game ID from result: ${txResult.repr}`);
      return null;

    } catch (error) {
      Logger.error('[BlockchainService] Error getting game ID from transaction:', error);
      return null;
    }
  }

  // Create contract call for initialize-game-pool
  async createGamePoolContract(entryFee: number, maxPlayers: number, senderKey: string): Promise<string> {
    try {
      // Get sender address for logging
      const senderAddress = getAddressFromPrivateKey(
        senderKey,
        this.network.isMainnet() ? TransactionVersion.Mainnet : TransactionVersion.Testnet
      );

      Logger.warn(`[BlockchainService] 📡 Broadcasting initialize-game-pool...`);
      Logger.warn(`[BlockchainService] 👤 Sender: ${senderAddress}`);
      Logger.warn(`[BlockchainService] 💰 Entry fee: ${entryFee} STX, Max players: ${maxPlayers}`);
      Logger.warn(`[BlockchainService] 🔗 Check wallet: https://explorer.hiro.so/address/${senderAddress}?chain=testnet`);

      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'initialize-game-pool',
        functionArgs: [
          uintCV(entryFee * 1000000), // Convert STX to microSTX
          uintCV(maxPlayers)
        ],
        senderKey,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow
      };

      const transaction = await makeContractCall(txOptions);
      const broadcastResponse = await broadcastTransaction(transaction, this.network);

      // Check if broadcast had errors
      if ((broadcastResponse as any).error) {
        Logger.error(`[BlockchainService] ❌ Broadcast ERROR: ${(broadcastResponse as any).error}`);
        throw new Error(`Broadcast failed: ${(broadcastResponse as any).error}`);
      }

      Logger.warn(`[BlockchainService] ✅ Broadcast SUCCESS: ${broadcastResponse.txid}`);
      Logger.warn(`[BlockchainService] 🔗 Track: https://explorer.hiro.so/txid/${broadcastResponse.txid}?chain=testnet`);

      return broadcastResponse.txid;
    } catch (error) {
      Logger.error(`[BlockchainService] ❌ ERROR broadcasting initialize-game-pool:`, error);

      // Provide specific guidance based on error type
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes('insufficient') || errorMsg.includes('balance')) {
          Logger.error(`[BlockchainService] ⚠️ LIKELY CAUSE: Wallet has insufficient STX funds`);
          Logger.error(`[BlockchainService] 💰 Get testnet STX: https://explorer.hiro.so/sandbox/faucet?chain=testnet`);
        } else if (errorMsg.includes('nonce')) {
          Logger.error(`[BlockchainService] ⚠️ LIKELY CAUSE: Nonce mismatch - try again`);
        } else if (errorMsg.includes('contract') || errorMsg.includes('not found')) {
          Logger.error(`[BlockchainService] ⚠️ LIKELY CAUSE: Contract not deployed or address incorrect`);
          Logger.error(`[BlockchainService] Contract: ${this.contractAddress}.${this.contractName}`);
        }
      }

      throw error;
    }
  }

  // Create contract call for join-game
  async joinGameContract(gameId: number, entryFee: number, senderKey: string): Promise<string> {
    // FIXED: Convert private key to address for post condition
    const senderAddress = getAddressFromPrivateKey(
      senderKey,
      this.network.isMainnet() ? TransactionVersion.Mainnet : TransactionVersion.Testnet
    );

    console.log(`[BlockchainService] join-game: gameId=${gameId}, entryFee=${entryFee} STX (${entryFee * 1000000} microSTX)`);
    console.log(`[BlockchainService] Sender address: ${senderAddress}`);

    const txOptions = {
      contractAddress: this.contractAddress,
      contractName: this.contractName,
      functionName: 'join-game',
      functionArgs: [uintCV(gameId)],
      senderKey,
      network: this.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      postConditions: [
        makeStandardSTXPostCondition(
          senderAddress, // ✅ FIXED: Use address instead of private key
          FungibleConditionCode.Equal,
          entryFee * 1000000 // Convert STX to microSTX
        )
      ]
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, this.network);

    console.log(`[BlockchainService] join-game transaction broadcasted: ${broadcastResponse.txid}`);
    return broadcastResponse.txid;
  }

  // Create contract call for start-game
  async startGameContract(gameId: number, senderKey: string): Promise<string> {
    console.log(`[BlockchainService] Starting game ${gameId} on blockchain...`);

    const txOptions = {
      contractAddress: this.contractAddress,
      contractName: this.contractName,
      functionName: 'start-game',
      functionArgs: [uintCV(gameId)],
      senderKey,
      network: this.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, this.network);

    console.log(`[BlockchainService] start-game transaction broadcasted: ${broadcastResponse.txid}`);
    return broadcastResponse.txid;
  }

  // Create contract call for end-game-and-distribute
  async endGameContract(gameId: number, winners: string[], senderKey: string): Promise<string> {
    const txOptions = {
      contractAddress: this.contractAddress,
      contractName: this.contractName,
      functionName: 'end-game-and-distribute',
      functionArgs: [
        uintCV(gameId),
        listCV(winners.map(winner => principalCV(winner)))
      ],
      senderKey,
      network: this.network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, this.network);
    return broadcastResponse.txid;
  }

  // Create contract call for record-session-hash
  async recordSessionHash(
    gameId: number,
    sessionHash: string,
    dataUri: string | null,
    senderKey: string
  ): Promise<string> {
    try {
      // Convert hex hash to buffer (32 bytes)
      const hashBuffer = Buffer.from(sessionHash.substring(0, 64), 'hex');

      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'record-session-hash',
        functionArgs: [
          uintCV(gameId),
          bufferCV(hashBuffer),
          dataUri ? someCV(stringAsciiCV(dataUri)) : noneCV()
        ],
        senderKey,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow
      };

      const transaction = await makeContractCall(txOptions);
      const broadcastResponse = await broadcastTransaction(transaction, this.network);

      console.log(`[BlockchainService] Session hash recorded for game ${gameId}: ${broadcastResponse.txid}`);
      return broadcastResponse.txid;
    } catch (error) {
      console.error('[BlockchainService] Error recording session hash:', error);
      throw error;
    }
  }

  // Verify session hash on-chain
  async verifySessionHash(gameId: number, sessionHash: string): Promise<boolean> {
    try {
      const hashBuffer = Buffer.from(sessionHash.substring(0, 64), 'hex');

      const config = new Configuration({
        basePath: this.network.coreApiUrl
      });
      const contractsApi = new SmartContractsApi(config);

      // FIXED: Use correct format for Clarity arguments
      const gameIdArg = uintCV(gameId);
      const gameIdHex = cvToHex(gameIdArg);
      const hashArg = bufferCV(hashBuffer);
      const hashHex = cvToHex(hashArg);

      const result = await contractsApi.callReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'verify-session-hash',
        readOnlyFunctionArgs: {
          sender: this.contractAddress,
          arguments: [gameIdHex, hashHex]
        }
      });

      // Parse result - should be (ok true) or (ok false)
      return result.result ? result.result.includes('true') : false;
    } catch (error) {
      console.error('[BlockchainService] Error verifying session hash:', error);
      return false;
    }
  }

  private generateMockSignature(): string {
    // Generate a mock Stacks transaction signature
    const chars = '0123456789abcdef';
    let signature = '0x';
    for (let i = 0; i < 64; i++) {
      signature += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return signature;
  }
}