import type { PlayerInput } from 'shared';
import { NETWORK_CONSTANTS, Logger } from 'shared';
import type { Player } from '../game/Player';
import type { Vector2 } from './mathUtils';

/**
 * Server Reconciliation Utilities
 * Handles client-side prediction with server correction
 */

export interface ReconciliationState {
  serverPosition: Vector2;
  lastProcessedInput: number;
}

/**
 * Apply server reconciliation to local player
 */
export function reconcilePlayerState(
  player: Player,
  serverState: ReconciliationState,
  pendingInputs: Map<number, PlayerInput>
): void {
  const { serverPosition, lastProcessedInput } = serverState;

  // Remove acknowledged inputs
  for (const [seq, _] of pendingInputs) {
    if (seq <= lastProcessedInput) {
      pendingInputs.delete(seq);
    }
  }

  // Calculate position error
  const posError = Math.hypot(
    player.position.x - serverPosition.x,
    player.position.y - serverPosition.y
  );

  // If error > threshold, correct position
  if (posError > NETWORK_CONSTANTS.RECONCILIATION_THRESHOLD) {
    if (posError > NETWORK_CONSTANTS.POSITION_SNAP_DISTANCE) {
      // Large error: snap to server position
      player.position = { ...serverPosition };
      Logger.warn(`Position snap: error ${posError.toFixed(1)}px`);
    } else {
      // Small error: smooth correction
      player.position = { ...serverPosition };

      // Re-apply pending inputs
      for (const [_, input] of pendingInputs) {
        applyInputToPlayer(player, input);
      }

      Logger.debug(`Position corrected: error ${posError.toFixed(1)}px`);
    }
  }
}

/**
 * Apply input to player (client-side prediction)
 */
export function applyInputToPlayer(player: Player, input: PlayerInput): void {
  if (!input.mousePosition) return;

  const dx = input.mousePosition.x - player.position.x;
  const dy = input.mousePosition.y - player.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 5) {
    const speedMultiplier = Math.max(0.15, 1 - (player.size - 25) / 200);
    const moveSpeed = 2.5 * speedMultiplier;

    player.position.x += (dx / distance) * moveSpeed;
    player.position.y += (dy / distance) * moveSpeed;
  }
}
