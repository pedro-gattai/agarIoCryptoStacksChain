// Shared types for the server
export interface GameState {
  id: string;
  players: PlayerState[];
  pellets: Pellet[];
  gameMode: GameMode;
  prizePool: number;
  entryFee: number;
  startTime: number;
  endTime?: number;
  status: GameStatus;
}

export interface PlayerState {
  id: string;
  walletAddress: string;
  position: Position;
  size: number;
  color: string;
  score: number;
  isAlive: boolean;
}

export interface Pellet {
  id: string;
  position: Position;
  size: number;
  color: string;
  value: number;
}

export interface Position {
  x: number;
  y: number;
}

export enum GameMode {
  BATTLE_ROYALE = 'battle_royale',
  TIME_ATTACK = 'time_attack',
  TEAM_MODE = 'team_mode'
}

export enum GameStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  FINISHED = 'finished'
}

export interface GameConfig {
  worldSize: { width: number; height: number };
  maxPlayers: number;
  gameDuration: number; // in seconds
  pelletsCount: number;
}

// Constants - Updated for Global Room with 100 players
export const GAME_CONSTANTS = {
  WORLD_SIZE: { width: 4000, height: 4000 }, // 4x larger world
  MAX_PLAYERS: 100, // Increased to 100 players
  PELLETS_COUNT: 2000, // More pellets for larger world
  GAME_DURATION: 0, // Continuous game mode (no time limit)
  MIN_PLAYER_SIZE: 20,
  MAX_PLAYER_SIZE: 300, // Slightly larger max size
  PLAYER_SPEED_FACTOR: 0.08, // Slightly slower for better control with more players
  SPLIT_COOLDOWN: 3000, // 3 seconds - longer cooldown for balance
  EJECT_MASS_SIZE: 5,
  RESPAWN_DELAY: 5000, // 5 seconds respawn delay
  QUEUE_PROCESS_INTERVAL: 5000, // Process queue every 5 seconds
  CLEANUP_INTERVAL: 30000, // Clean inactive players every 30 seconds
  PLAYER_TIMEOUT: 60000 // 1 minute player timeout
} as const;

export const BLOCKCHAIN_CONSTANTS = {
  HOUSE_FEE_PERCENTAGE: 0.2, // 20%
  MIN_ENTRY_FEE: 0.001, // SOL
  MAX_ENTRY_FEE: 1, // SOL
  PRIZE_DISTRIBUTION: [
    { position: 1, percentage: 0.5 },  // 50% for 1st
    { position: 2, percentage: 0.3 },  // 30% for 2nd
    { position: 3, percentage: 0.2 }   // 20% for 3rd
  ]
} as const;

export const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#FFB347', '#87CEEB', '#F0E68C'
] as const;