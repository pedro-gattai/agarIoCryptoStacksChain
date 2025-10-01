import { Player } from './Player';
import { Pellet } from './Pellet';
import { MathUtils } from '../utils/mathUtils';

export class CollisionSystem {
  static checkPlayerPelletCollisions(players: Player[], pellets: Pellet[]): void {
    players.forEach(player => {
      if (!player.isAlive) return;

      pellets.forEach(pellet => {
        if (!pellet.isAlive) return;

        const distance = MathUtils.distance(player.position, pellet.position);
        const combinedRadius = player.size + pellet.size;

        // Player touches pellet
        if (distance < combinedRadius) {
          // Player eats pellet
          player.grow(pellet.mass);
          pellet.isAlive = false;
        }
      });
    });
  }

  static checkPlayerPlayerCollisions(players: Player[]): void {
    for (let i = 0; i < players.length; i++) {
      const player1 = players[i];
      if (!player1.isAlive) continue;

      for (let j = i + 1; j < players.length; j++) {
        const player2 = players[j];
        if (!player2.isAlive) continue;

        const distance = MathUtils.distance(player1.position, player2.position);
        const combinedRadius = (player1.size + player2.size) * 0.8; // Slightly less than full radius for better gameplay

        if (distance < combinedRadius) {
          // Determine who eats whom
          if (player1.size > player2.size * 1.2) {
            // Player1 eats Player2
            player1.eat(player2);
          } else if (player2.size > player1.size * 1.2) {
            // Player2 eats Player1
            player2.eat(player1);
          }
          // If sizes are similar, no eating occurs (they bounce off each other)
        }
      }
    }
  }

  static checkWorldBoundaries(
    players: Player[],
    _worldWidth: number,
    _worldHeight: number
  ): void {
    players.forEach(player => {
      if (!player.isAlive) return;

      // Keep player within world bounds
      const radius = player.size;
      
      if (player.position.x - radius < 0) {
        player.position.x = radius;
        player.velocity.x = Math.abs(player.velocity.x) * 0.5;
      } else if (player.position.x + radius > _worldWidth) {
        player.position.x = _worldWidth - radius;
        player.velocity.x = -Math.abs(player.velocity.x) * 0.5;
      }

      if (player.position.y - radius < 0) {
        player.position.y = radius;
        player.velocity.y = Math.abs(player.velocity.y) * 0.5;
      } else if (player.position.y + radius > _worldHeight) {
        player.position.y = _worldHeight - radius;
        player.velocity.y = -Math.abs(player.velocity.y) * 0.5;
      }
    });
  }

  // Spatial partitioning for better performance with many entities
  static createSpatialGrid<T extends { position: { x: number; y: number } }>(
    entities: T[],
    cellSize: number,
    _worldWidth: number,
    _worldHeight: number
  ): Map<string, T[]> {
    const grid = new Map<string, T[]>();

    entities.forEach(entity => {
      const cellX = Math.floor(entity.position.x / cellSize);
      const cellY = Math.floor(entity.position.y / cellSize);
      const key = `${cellX},${cellY}`;

      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(entity);
    });

    return grid;
  }

  static getNearbyEntities<T extends { position: { x: number; y: number } }>(
    grid: Map<string, T[]>,
    position: { x: number; y: number },
    cellSize: number,
    radius: number = 1
  ): T[] {
    const nearby: T[] = [];
    const cellX = Math.floor(position.x / cellSize);
    const cellY = Math.floor(position.y / cellSize);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const entities = grid.get(key);
        if (entities) {
          nearby.push(...entities);
        }
      }
    }

    return nearby;
  }

  // Optimized collision checking using spatial partitioning
  static checkCollisionsOptimized(
    players: Player[],
    pellets: Pellet[],
    worldWidth: number,
    worldHeight: number
  ): void {
    const cellSize = 100; // Adjust based on average entity size

    // Create spatial grids
    const playerGrid = this.createSpatialGrid(
      players.filter(p => p.isAlive),
      cellSize,
      worldWidth,
      worldHeight
    );
    
    const pelletGrid = this.createSpatialGrid(
      pellets.filter(p => p.isAlive),
      cellSize,
      worldWidth,
      worldHeight
    );

    // Check player-pellet collisions
    players.forEach(player => {
      if (!player.isAlive) return;

      const nearbyPellets = this.getNearbyEntities(
        pelletGrid,
        player.position,
        cellSize,
        2
      );

      nearbyPellets.forEach(pellet => {
        if (!pellet.isAlive) return;

        const distance = MathUtils.distance(player.position, pellet.position);
        if (distance < player.size + pellet.size) {
          player.grow(pellet.mass);
          pellet.isAlive = false;
        }
      });
    });

    // Check player-player collisions
    players.forEach(player => {
      if (!player.isAlive) return;

      const nearbyPlayers = this.getNearbyEntities(
        playerGrid,
        player.position,
        cellSize,
        2
      );

      nearbyPlayers.forEach(otherPlayer => {
        if (player.id === otherPlayer.id || !otherPlayer.isAlive) return;

        const distance = MathUtils.distance(player.position, otherPlayer.position);
        const combinedRadius = (player.size + otherPlayer.size) * 0.8;

        if (distance < combinedRadius) {
          if (player.size > otherPlayer.size * 1.2) {
            player.eat(otherPlayer);
          }
        }
      });
    });

    // Check world boundaries
    this.checkWorldBoundaries(players, worldWidth, worldHeight);
  }
}