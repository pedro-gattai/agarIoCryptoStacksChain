/**
 * Network Constants - Configurações de rede e sincronização
 * Centralizadas para facilitar ajustes de performance
 */

export const NETWORK_CONSTANTS = {
  // Interpolation settings
  INTERPOLATION_DELAY: 100, // ms - render outros players 100ms no passado (suaviza)
  INTERPOLATION_BUFFER_SIZE: 1000, // ms - manter 1 segundo de estados

  // Latency compensation
  LATENCY_COMPENSATION: 1.25, // 25% maior hitbox para compensar latência média
  AVERAGE_LATENCY: 50, // ms - latência média esperada

  // Reconciliation
  MAX_INPUT_BUFFER: 100, // máximo de inputs pendentes
  RECONCILIATION_THRESHOLD: 5, // px - diferença mínima para triggerar correção
  POSITION_SNAP_DISTANCE: 50, // px - se erro > 50px, teleportar em vez de corrigir

  // Broadcast optimization
  ADAPTIVE_BROADCAST: {
    MOVING_RATE: 30, // TPS quando player está se movendo
    IDLE_RATE: 10, // TPS quando player está parado
    MOVEMENT_THRESHOLD: 1, // px/tick - abaixo disso considera parado
  },

  // Spatial partitioning
  VISIBILITY_RADIUS: {
    PLAYERS: 1000, // px - distância máxima para ver outros players
    PELLETS: 800, // px - distância máxima para ver pellets
  },

  // Delta compression
  DELTA_COMPRESSION: {
    POSITION_EPSILON: 0.5, // px - mudança mínima para enviar update
    SIZE_EPSILON: 0.1, // tamanho mínimo para enviar update
    SCORE_EPSILON: 1, // score mínimo para enviar update
  },
} as const;

// Helper type for type safety
export type NetworkConstants = typeof NETWORK_CONSTANTS;
