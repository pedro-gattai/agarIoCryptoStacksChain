export const GAME_CONSTANTS = {
  WORLD_SIZE: { width: 4000, height: 4000 }, // FIXED: Synchronized with server (was 3000x3000)
  MAX_PLAYERS: 20,
  PELLETS_COUNT: 1000,
  GAME_DURATION: 300, // 5 minutes
  MIN_PLAYER_SIZE: 20,
  MAX_PLAYER_SIZE: 200,
  PLAYER_SPEED_FACTOR: 0.1,
  SPLIT_COOLDOWN: 2000, // 2 seconds
  EJECT_MASS_SIZE: 5
} as const;

export const BLOCKCHAIN_CONSTANTS = {
  HOUSE_FEE_PERCENTAGE: 0.2, // 20%
  MIN_ENTRY_FEE: 0.001, // STX
  MAX_ENTRY_FEE: 1, // STX
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

// Demo mode constants - hardcoded for browser compatibility
export const DEMO_CONSTANTS = {
  ENABLED: true, // Always true for demo mode
  BYPASS_BLOCKCHAIN: true, // Always true for demo mode
  DEMO_ENTRY_FEE: 0,
  DEMO_WALLET_ADDRESS: 'DEMO_WALLET_ADDRESS',
  DEMO_PLAYER_NAME: 'DemoPlayer'
} as const;