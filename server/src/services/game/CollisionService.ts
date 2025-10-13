import type { PlayerConnection, Position, Pellet, GlobalGameRoom } from 'shared';
import { asGamePlayer, GAMEPLAY_CONSTANTS, Logger, NETWORK_CONSTANTS } from 'shared';

/**
 * CollisionService - Handles all collision detection logic
 * Separated from GameLoopService for better maintainability
 */
export class CollisionService {
  /**
   * Check player-pellet collisions and update player stats
   * Returns array of pellet IDs that were eaten
   */
  public checkPlayerPelletCollisions(
    globalRoom: GlobalGameRoom,
    pellets: Map<string, Pellet>
  ): string[] {
    const eatenPellets: string[] = [];

    for (const [playerId, player] of globalRoom.players) {
      const gamePlayer = asGamePlayer(player);
      const isBot = player.isBot;
      const logPrefix = isBot ? '🤖' : '👤';

      for (const [pelletId, pellet] of pellets) {
        const distance = this.getDistance(player.position, pellet.position);
        // FIXED: Increase hitbox to compensate for latency
        const combinedRadius = (gamePlayer.size + pellet.size) * NETWORK_CONSTANTS.LATENCY_COMPENSATION;

        if (distance < combinedRadius) {
          // Player eats pellet - SERVER AUTHORITATIVE
          const pelletValue = pellet.value;
          const sizeGain = pelletValue * GAMEPLAY_CONSTANTS.PELLET.SIZE_GAIN_MULTIPLIER;
          const scoreGain = Math.floor(pelletValue * GAMEPLAY_CONSTANTS.PELLET.SCORE_MULTIPLIER);

          const oldSize = gamePlayer.size;
          const oldScore = gamePlayer.score;

          const newSize = Math.min(GAMEPLAY_CONSTANTS.PLAYER.MAX_SIZE, oldSize + sizeGain);
          const newScore = oldScore + scoreGain;

          // SERVER-AUTHORITATIVE UPDATE
          gamePlayer.size = newSize;
          gamePlayer.score = newScore;
          gamePlayer.mass = (newSize * newSize) / 100;

          eatenPellets.push(pelletId);

          // Only log for human players with significant changes
          if (!isBot && scoreGain >= 30) {
            Logger.debug(`Player ate pellet: size ${oldSize.toFixed(1)} → ${newSize.toFixed(1)}, score +${scoreGain}`);
          }

          break; // Only eat one pellet per tick
        }
      }
    }

    return eatenPellets;
  }

  /**
   * Check player vs player collisions
   * Returns array of death events { killerId, victimId }
   */
  public checkPlayerVsPlayerCollisions(
    globalRoom: GlobalGameRoom
  ): Array<{ killerId: string; victimId: string; killerNewSize: number; killerNewScore: number }> {
    const deathEvents: Array<{ killerId: string; victimId: string; killerNewSize: number; killerNewScore: number }> = [];
    const players = Array.from(globalRoom.players.values());

    for (let i = 0; i < players.length; i++) {
      const predator = players[i];
      const predatorPlayer = asGamePlayer(predator);

      // CRITICAL FIX: Skip dead predators
      if (!predator || !predatorPlayer.isAlive || predatorPlayer.size < GAMEPLAY_CONSTANTS.COMBAT.MIN_SIZE_TO_EAT) continue;

      for (let j = 0; j < players.length; j++) {
        if (i === j) continue;

        const prey = players[j];
        const preyPlayer = asGamePlayer(prey);

        // CRITICAL FIX: Skip dead prey to prevent death loop and multiple eating
        // Check isAlive FIRST to prevent processing already dead players
        if (!prey || !preyPlayer.isAlive) continue;

        // Skip if prey is too large to be eaten
        if (preyPlayer.size >= predatorPlayer.size * GAMEPLAY_CONSTANTS.COMBAT.EAT_MAX_PREY_RATIO)
          continue;

        // IMPROVED: Prevent split cells from eating each other
        const predatorIsSplit = (predator as any).isSplitCell;
        const preyIsSplit = (prey as any).isSplitCell;
        const predatorParentId = (predator as any).parentPlayerId;
        const preyParentId = (prey as any).parentPlayerId;

        // Check if they're splits from the same player
        // FIXED: Always use socketId for consistency
        const predatorSocketId = predator.socketId;
        const preySocketId = prey.socketId;

        if (predatorIsSplit && preyIsSplit && predatorParentId === preyParentId) {
          continue; // Same player's split cells can't eat each other
        }

        // Check if predator is eating its own split or vice versa
        // FIXED: Compare using socket IDs consistently
        if (predatorIsSplit && preyParentId === predatorSocketId) {
          continue; // Split can't eat its parent
        }
        if (preyIsSplit && predatorParentId === preySocketId) {
          continue; // Parent can't eat its split
        }
        if (!predatorIsSplit && preyIsSplit && preyParentId === predatorSocketId) {
          continue; // Parent can't eat its own split
        }
        if (!preyIsSplit && predatorIsSplit && predatorParentId === preySocketId) {
          continue; // Split can't eat its own parent
        }

        const distance = this.getDistance(predator.position, prey.position);
        const requiredSize = preyPlayer.size * GAMEPLAY_CONSTANTS.COMBAT.EAT_SIZE_RATIO;

        // IMPROVED: Better collision detection with overlap threshold
        // Predator must overlap significantly with prey (not just touch)
        const collisionRadius = (predatorPlayer.size + preyPlayer.size) * 0.5;
        const overlapThreshold = preyPlayer.size * 0.7; // Need 70% overlap to eat

        // Check if predator can eat prey
        if (predatorPlayer.size > requiredSize && distance < collisionRadius && distance < overlapThreshold) {
          // Predator eats prey - DEATH EVENT
          const gainedMass = preyPlayer.size * GAMEPLAY_CONSTANTS.COMBAT.MASS_GAIN_RATIO;
          const newPredatorSize = Math.min(
            GAMEPLAY_CONSTANTS.PLAYER.MAX_SIZE,
            predatorPlayer.size + gainedMass * GAMEPLAY_CONSTANTS.COMBAT.MASS_GAIN_MULTIPLIER
          );
          const scoreGain = Math.floor(preyPlayer.size * 25);
          const newPredatorScore = predatorPlayer.score + scoreGain;

          // Update predator stats
          predatorPlayer.size = newPredatorSize;
          predatorPlayer.score = newPredatorScore;
          predatorPlayer.mass = (newPredatorSize * newPredatorSize) / 100;

          // CRITICAL: Mark prey as dead IMMEDIATELY to prevent death loop
          preyPlayer.isAlive = false;

          const predatorIsBot = predator.isBot;
          const preyIsBot = prey.isBot;
          // Only log significant kills (non-bot kills bot, or PvP)
          if (!predatorIsBot || !preyIsBot) {
            Logger.info(`Kill: ${predator.playerId} (${predatorPlayer.size.toFixed(1)}) ate ${prey.playerId} (${preyPlayer.size.toFixed(1)}) → +${scoreGain}`);
          }

          deathEvents.push({
            killerId: predator.playerId,
            victimId: prey.playerId,
            killerNewSize: newPredatorSize,
            killerNewScore: newPredatorScore,
          });

          break; // Only eat one player per tick
        }
      }
    }

    return deathEvents;
  }

  /**
   * Calculate distance between two positions
   */
  private getDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
