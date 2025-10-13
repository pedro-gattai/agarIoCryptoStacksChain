import type { Position, Pellet, GlobalGameRoom } from 'shared';
import { asGamePlayer, GAMEPLAY_CONSTANTS } from 'shared';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

/**
 * PelletService - Manages pellet generation and lifecycle
 * Separated from GameLoopService for better maintainability
 */
export class PelletService {
  private pellets: Map<string, Pellet> = new Map();
  private pelletIdCounter: number = 0;
  private readonly PELLETS_COUNT = GAMEPLAY_CONSTANTS.PELLET.COUNT;
  private readonly WORLD_SIZE = {
    width: GAMEPLAY_CONSTANTS.WORLD.WIDTH,
    height: GAMEPLAY_CONSTANTS.WORLD.HEIGHT,
  };

  /**
   * Initialize pellets in the world
   */
  public initializePellets(): void {
    this.pellets.clear();
    this.pelletIdCounter = 0;

    for (let i = 0; i < this.PELLETS_COUNT; i++) {
      const pellet: Pellet = {
        id: `pellet_${this.pelletIdCounter++}`,
        position: {
          x: Math.random() * this.WORLD_SIZE.width,
          y: Math.random() * this.WORLD_SIZE.height,
        },
        size: GAMEPLAY_CONSTANTS.PELLET.SIZE,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        value: GAMEPLAY_CONSTANTS.PELLET.VALUE,
      };
      this.pellets.set(pellet.id, pellet);
    }

    console.log(`✅ Pellets initialized: ${this.pellets.size}`);
  }

  /**
   * Regenerate pellets when below threshold
   */
  public regeneratePellets(): void {
    const currentPellets = this.pellets.size;
    const targetPellets = this.PELLETS_COUNT;

    if (currentPellets < targetPellets * GAMEPLAY_CONSTANTS.PELLET.REGENERATION_THRESHOLD) {
      const pelletsToGenerate = Math.min(50, targetPellets - currentPellets); // Generate max 50 per tick

      for (let i = 0; i < pelletsToGenerate; i++) {
        const pellet: Pellet = {
          id: `pellet_${this.pelletIdCounter++}`,
          position: {
            x: Math.random() * this.WORLD_SIZE.width,
            y: Math.random() * this.WORLD_SIZE.height,
          },
          size: GAMEPLAY_CONSTANTS.PELLET.SIZE,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          value: GAMEPLAY_CONSTANTS.PELLET.VALUE,
        };
        this.pellets.set(pellet.id, pellet);
      }

      if (pelletsToGenerate > 0) {
        console.log(`🔄 Regenerated ${pelletsToGenerate} pellets. Total: ${this.pellets.size}`);
      }
    }
  }

  /**
   * Remove eaten pellets from the world
   */
  public removePellets(pelletIds: string[]): void {
    for (const pelletId of pelletIds) {
      this.pellets.delete(pelletId);
    }
  }

  /**
   * Get all pellets
   */
  public getPellets(): Map<string, Pellet> {
    return this.pellets;
  }

  /**
   * Get pellet count
   */
  public getPelletsCount(): number {
    return this.pellets.size;
  }

  /**
   * Generate a safe pellet position (not too close to players)
   */
  public generateSafePelletPosition(globalRoom: GlobalGameRoom): Position {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const position = {
        x: Math.random() * this.WORLD_SIZE.width,
        y: Math.random() * this.WORLD_SIZE.height,
      };

      // Check if position is far enough from players
      let tooClose = false;
      for (const [_, player] of globalRoom.players) {
        const distance = this.getDistance(position, player.position);
        const gamePlayer = asGamePlayer(player);

        if (distance < gamePlayer.size + 50) {
          // 50 unit buffer
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        return position;
      }

      attempts++;
    }

    // If no safe position found, return random position
    return {
      x: Math.random() * this.WORLD_SIZE.width,
      y: Math.random() * this.WORLD_SIZE.height,
    };
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
