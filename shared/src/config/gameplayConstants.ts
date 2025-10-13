/**
 * Centralized gameplay constants
 * Single source of truth for all game mechanics
 */

export const GAMEPLAY_CONSTANTS = {
  // World settings
  WORLD: {
    WIDTH: 4000,
    HEIGHT: 4000,
    SPAWN_ZONE_MIN: 1500,
    SPAWN_ZONE_MAX: 2500,
  },

  // Player settings
  PLAYER: {
    INITIAL_SIZE: 25,
    MIN_SIZE: 10,
    MAX_SIZE: 300,
    BASE_SPEED: 2.5,
    SPEED_DECAY_FACTOR: 200, // Size impact on speed
    MIN_SPEED_MULTIPLIER: 0.15,
  },

  // Combat settings
  COMBAT: {
    EAT_SIZE_RATIO: 1.15, // Must be 15% bigger to eat (reduced from 25% for easier combat)
    EAT_MAX_PREY_RATIO: 0.9, // Can only eat players up to 90% of your size (increased from 80%)
    MASS_GAIN_RATIO: 0.8, // Gain 80% of eaten player's mass
    MASS_GAIN_MULTIPLIER: 0.6, // Applied to mass gain for size calculation
    MIN_SIZE_TO_EAT: 20, // Minimum size to eat other players (reduced from 30 for earlier combat)
    SAFE_SPAWN_BUFFER: 50, // Safe distance from other players on spawn
  },

  // Split mechanics
  SPLIT: {
    MIN_SIZE: 35,
    SIZE_RATIO: 0.7, // Each half gets 70% of original size
    COOLDOWN_MS: 2000,
    MERGE_TIME_MS: 30000, // 30 seconds until split cells can merge
  },

  // Eject mass mechanics
  EJECT: {
    MIN_SIZE: 25,
    MASS_AMOUNT: 5,
    MIN_REMAINING: 10,
  },

  // Pellet settings
  PELLET: {
    COUNT: 800,
    REGENERATION_THRESHOLD: 0.8, // Regenerate when below 80%
    SIZE: 3,
    VALUE: 1,
    SIZE_GAIN_MULTIPLIER: 0.4,
    SCORE_MULTIPLIER: 15,
  },

  // Mass decay (agar.io mechanic)
  DECAY: {
    THRESHOLD: 50, // Start decay above this size
    RATE: 0.002, // Decay rate per tick
    MIN_SIZE: 25, // Never decay below this
  },

  // Respawn settings
  RESPAWN: {
    DELAY_MS: 3000,
    SCORE_PENALTY: 0.1, // Lose 10% of score
    MAX_SPAWN_ATTEMPTS: 10,
  },

  // Network settings
  NETWORK: {
    TICK_RATE: 30, // Server ticks per second
    BROADCAST_RATE: 30, // Updates per second to clients
  },
} as const;

// Export individual sections for convenience
export const WORLD_CONFIG = GAMEPLAY_CONSTANTS.WORLD;
export const PLAYER_CONFIG = GAMEPLAY_CONSTANTS.PLAYER;
export const COMBAT_CONFIG = GAMEPLAY_CONSTANTS.COMBAT;
export const PELLET_CONFIG = GAMEPLAY_CONSTANTS.PELLET;
export const DECAY_CONFIG = GAMEPLAY_CONSTANTS.DECAY;
