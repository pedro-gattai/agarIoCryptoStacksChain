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
  contractPrincipalCV
} from '@stacks/transactions';
import { Configuration, AccountsApi, TransactionsApi, SmartContractsApi } from '@stacks/blockchain-api-client';
import { BLOCKCHAIN_CONSTANTS } from '../types/shared';

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
      const transaction = await this.transactionsApi.getTransactionById({ txId });
      return (transaction as any).tx_status === 'success';
    } catch (error) {
      console.error('Error verifying transaction:', error);
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
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const status = await this.getTransactionStatus(txId);
      
      if (status === 'success') {
        return true;
      } else if (status === 'abort_by_response' || status === 'abort_by_post_condition') {
        return false;
      }
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
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
      
      const result = await contractsApi.callReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'get-game-pool',
        functionArgs: [`0x${gameId.toString(16).padStart(32, '0')}`]
      });
      
      return result;
    } catch (error) {
      console.error('Error getting game pool:', error);
      return null;
    }
  }

  async getNextGameId(): Promise<number> {
    try {
      const config = new Configuration({ 
        basePath: this.network.coreApiUrl 
      });
      const contractsApi = new SmartContractsApi(config);
      
      const result = await contractsApi.callReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'get-next-game-id',
        functionArgs: []
      });
      
      // Parse the result and return the game ID
      return parseInt(result.result || '0');
    } catch (error) {
      console.error('Error getting next game ID:', error);
      return Math.floor(Math.random() * 1000); // Fallback
    }
  }

  // Create contract call for initialize-game-pool
  async createGamePoolContract(entryFee: number, maxPlayers: number, senderKey: string): Promise<string> {
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
    return broadcastResponse.txid;
  }

  // Create contract call for join-game
  async joinGameContract(gameId: number, entryFee: number, senderKey: string): Promise<string> {
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
          senderKey,
          FungibleConditionCode.Equal,
          entryFee * 1000000
        )
      ]
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, this.network);
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