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

export interface WalletInfo {
  address: string;
  balance: number;
  connected: boolean;
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