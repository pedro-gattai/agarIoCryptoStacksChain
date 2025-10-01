import type { PlayerInput } from './player';

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
  worldWidth?: number; // For backwards compatibility
  worldHeight?: number; // For backwards compatibility
}

// Room interfaces
export interface GameRoom {
  id: string;
  gameId: string;
  maxPlayers: number;
  entryFee: number;
  status: 'waiting' | 'starting' | 'active' | 'finished';
  playerCount: number;
  createdAt: string;
}

export interface GlobalGameRoom {
  id: string;
  gameId: string;
  players: Map<string, PlayerConnection>;
  waitingQueue: PlayerConnection[];
  maxPlayers: number;
  currentPlayers: number;
  entryFee: number;
  status: 'active' | 'maintenance';
  createdAt: Date;
  lastActivity: Date;
}

// Player connection for rooms
export interface PlayerConnection {
  socketId: string;
  playerId: string;
  walletAddress?: string;
  isInGame: boolean;
  isReady: boolean;
  lastSeen: Date;
  position: Position;
  inputBuffer: PlayerInput[];
  joinedAt: Date;
  respawnTime?: number;
  isBot?: boolean;
  botAI?: BotAI;
}

// Bot AI
export interface BotAI {
  targetPosition: Position;
  moveSpeed: number;
  aggressiveness: number;
  lastDirectionChange: number;
  personalityType: 'aggressive' | 'passive' | 'neutral';
}

// Game updates for real-time communication
export interface GameUpdate {
  timestamp: number;
  players: Array<{
    id: string;
    position: Position;
    size?: number;
    color?: string;
    score?: number;
  }>;
  gameState: {
    pellets: Array<{
      id: string;
      position: Position;
      size: number;
      color: string;
    }>;
  };
}

// Queue status
export interface QueueStatus {
  position: number;
  estimatedWaitTime: number;
  playersAhead: number;
}