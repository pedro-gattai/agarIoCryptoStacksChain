export interface Player {
  id: string;
  walletAddress: string;
  username?: string;
  stats: PlayerStats;
  createdAt: Date;
  lastActive: Date;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalEarnings: number;
  totalLosses: number;
  highestScore: number;
  winRate: number;
}

export interface PlayerInput {
  playerId?: string; // Optional for client-side
  mousePosition: { x: number; y: number };
  actions: PlayerAction[] | string[]; // Support both enum and string arrays
  timestamp: number;
  sequenceNumber?: number; // For client-side input ordering
}

export enum PlayerAction {
  SPLIT = 'split',
  EJECT_MASS = 'eject_mass'
}