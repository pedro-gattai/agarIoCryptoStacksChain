import type { PlayerConnection } from './game.js';

/**
 * Game-specific data for a player in an active game session
 * This extends PlayerConnection with runtime game state
 */
export interface GamePlayerData {
  size: number;
  score: number;
  mass: number;
  isAlive: boolean;
  deathTime?: number;
  killedBy?: string;
  lastUpdate: number;
}

/**
 * Complete player representation during gameplay
 * Combines connection info with game state
 */
export interface GamePlayer extends PlayerConnection {
  // Game state - typed properly instead of using 'as any'
  size: number;
  score: number;
  mass: number;
  isAlive: boolean;
  deathTime?: number;
  killedBy?: string;
  lastUpdate?: number;
}

/**
 * Type guard to check if a PlayerConnection has game data
 */
export function isGamePlayer(player: PlayerConnection): player is GamePlayer {
  return (
    'size' in player &&
    'score' in player &&
    'isAlive' in player &&
    typeof (player as any).size === 'number' &&
    typeof (player as any).score === 'number'
  );
}

/**
 * Initialize a PlayerConnection as a GamePlayer
 */
export function initializeGamePlayer(
  player: PlayerConnection,
  initialSize: number = 25,
  initialScore: number = 0
): GamePlayer {
  return {
    ...player,
    size: initialSize,
    score: initialScore,
    mass: (initialSize * initialSize) / 100,
    isAlive: true,
    lastUpdate: Date.now(),
  };
}

/**
 * Safe cast PlayerConnection to GamePlayer
 * Ensures all required properties exist
 */
export function asGamePlayer(player: PlayerConnection): GamePlayer {
  const gp = player as GamePlayer;

  // Initialize missing properties with defaults
  if (typeof gp.size !== 'number') gp.size = 25;
  if (typeof gp.score !== 'number') gp.score = 0;
  if (typeof gp.mass !== 'number') gp.mass = (gp.size * gp.size) / 100;
  if (typeof gp.isAlive !== 'boolean') gp.isAlive = true;

  return gp;
}
