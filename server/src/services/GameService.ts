import { GameState, PlayerState, Pellet, GameMode, GameStatus, GameConfig, Position, GAME_CONSTANTS, COLORS } from '../types/shared.js';
import { DEMO_CONSTANTS } from 'shared';
import type { StatsService, GameResult } from './StatsService.js';
import { GameContractService } from './GameContractService.js';

export class GameService {
  private games: Map<string, GameState> = new Map();
  private statsService: StatsService | null = null;
  private contractService: GameContractService | null = null;
  private gameConfig: GameConfig = {
    worldSize: GAME_CONSTANTS.WORLD_SIZE,
    maxPlayers: GAME_CONSTANTS.MAX_PLAYERS,
    gameDuration: GAME_CONSTANTS.GAME_DURATION,
    pelletsCount: GAME_CONSTANTS.PELLETS_COUNT
  };

  setStatsService(statsService: StatsService): void {
    this.statsService = statsService;
  }

  setContractService(contractService: GameContractService): void {
    this.contractService = contractService;
  }

  async createGame(entryFee: number, maxPlayers = 100): Promise<GameState> {
    const gameId = this.generateGameId();
    
    // In demo mode, set entry fee to 0
    const actualEntryFee = DEMO_CONSTANTS.ENABLED ? DEMO_CONSTANTS.DEMO_ENTRY_FEE : entryFee;
    
    const game: GameState = {
      id: gameId,
      players: [],
      pellets: this.generatePellets(),
      gameMode: GameMode.BATTLE_ROYALE,
      prizePool: 0,
      entryFee: actualEntryFee,
      startTime: Date.now(),
      status: GameStatus.ACTIVE // Global room starts immediately
    };

    // Update config with maxPlayers for large scale
    this.gameConfig.maxPlayers = maxPlayers;
    this.gameConfig.worldSize = GAME_CONSTANTS.WORLD_SIZE;
    this.gameConfig.pelletsCount = GAME_CONSTANTS.PELLETS_COUNT;

    this.games.set(gameId, game);
    console.log(`🎮 Created global game ${gameId} with capacity for ${maxPlayers} players`);
    return game;
  }

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  getAllGames(): GameState[] {
    return Array.from(this.games.values());
  }

  getActiveGames(): GameState[] {
    return Array.from(this.games.values()).filter(
      game => game.status !== GameStatus.FINISHED
    );
  }

  addPlayer(
    gameId: string, 
    playerId: string, 
    walletAddress: string,
    position?: { x: number; y: number },
    color?: string
  ): boolean {
    const game = this.games.get(gameId);
    if (!game) {
      return false;
    }

    // In demo mode, allow joining active games, not just waiting games
    if (!DEMO_CONSTANTS.ENABLED && game.status !== GameStatus.WAITING) {
      return false;
    }

    if (game.players.length >= this.gameConfig.maxPlayers) {
      return false;
    }

    // Use demo wallet address if in demo mode
    const actualWalletAddress = DEMO_CONSTANTS.ENABLED ? DEMO_CONSTANTS.DEMO_WALLET_ADDRESS : walletAddress;

    const player: PlayerState = {
      id: playerId,
      walletAddress: actualWalletAddress,
      position: position || this.getRandomSpawnPosition(),
      size: GAME_CONSTANTS.MIN_PLAYER_SIZE,
      color: color || COLORS[game.players.length % COLORS.length],
      score: 0,
      isAlive: true
    };

    game.players.push(player);
    
    // Only add to prize pool if not in demo mode
    if (!DEMO_CONSTANTS.ENABLED) {
      game.prizePool += game.entryFee;
    }

    // Auto-start game if full (skip in demo mode for continuous play)
    if (!DEMO_CONSTANTS.ENABLED && game.players.length >= this.gameConfig.maxPlayers) {
      this.startGame(gameId);
    }

    return true;
  }

  startGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== GameStatus.WAITING) {
      return false;
    }

    game.status = GameStatus.ACTIVE;
    game.startTime = Date.now();
    
    // Set game end timer
    setTimeout(() => {
      this.endGame(gameId);
    }, this.gameConfig.gameDuration * 1000);

    return true;
  }

  updatePlayerPosition(gameId: string, playerId: string, position: Position): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status !== GameStatus.ACTIVE) {
      return false;
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player || !player.isAlive) {
      return false;
    }

    // Validate position bounds
    const bounds = this.gameConfig.worldSize;
    position.x = Math.max(player.size, Math.min(bounds.width - player.size, position.x));
    position.y = Math.max(player.size, Math.min(bounds.height - player.size, position.y));

    player.position = position;
    this.checkCollisions(game, player);
    
    return true;
  }

  private checkCollisions(game: GameState, player: PlayerState): void {
    // Optimized collision detection using spatial partitioning for 100 players
    const gridSize = 200; // Grid cell size for spatial partitioning
    const playerGridX = Math.floor(player.position.x / gridSize);
    const playerGridY = Math.floor(player.position.y / gridSize);
    
    // Check pellet collisions (optimize by checking nearby pellets only)
    game.pellets = game.pellets.filter(pellet => {
      const pelletGridX = Math.floor(pellet.position.x / gridSize);
      const pelletGridY = Math.floor(pellet.position.y / gridSize);
      
      // Skip distant pellets for performance
      if (Math.abs(pelletGridX - playerGridX) > 1 || Math.abs(pelletGridY - playerGridY) > 1) {
        return true; // Keep pellet, don't check collision
      }
      
      const distance = this.getDistance(player.position, pellet.position);
      if (distance < player.size / 2) {
        player.size += pellet.value;
        player.score += pellet.value * 10;
        return false; // Remove pellet
      }
      return true; // Keep pellet
    });

    // Optimized player collision detection (only check nearby players)
    const nearbyPlayers = game.players.filter(otherPlayer => {
      if (otherPlayer.id === player.id || !otherPlayer.isAlive) return false;
      
      const otherGridX = Math.floor(otherPlayer.position.x / gridSize);
      const otherGridY = Math.floor(otherPlayer.position.y / gridSize);
      
      // Only check players in nearby grid cells
      return Math.abs(otherGridX - playerGridX) <= 2 && Math.abs(otherGridY - playerGridY) <= 2;
    });

    nearbyPlayers.forEach(otherPlayer => {
      const distance = this.getDistance(player.position, otherPlayer.position);
      const combinedSize = (player.size + otherPlayer.size) * 0.8;

      if (distance < combinedSize) {
        if (player.size > otherPlayer.size * 1.2) {
          // Player eats other player
          player.size = Math.min(GAME_CONSTANTS.MAX_PLAYER_SIZE, player.size + otherPlayer.size * 0.5);
          player.score += otherPlayer.score;
          otherPlayer.isAlive = false;
        } else if (otherPlayer.size > player.size * 1.2) {
          // Other player eats player
          otherPlayer.size = Math.min(GAME_CONSTANTS.MAX_PLAYER_SIZE, otherPlayer.size + player.size * 0.5);
          otherPlayer.score += player.score;
          player.isAlive = false;
        }
      }
    });

    // Batch pellet regeneration for better performance
    if (game.pellets.length < this.gameConfig.pelletsCount * 0.4) {
      const pelletsToGenerate = Math.floor(this.gameConfig.pelletsCount * 0.2); // Generate 20% at a time
      const newPellets = this.generatePellets(pelletsToGenerate);
      game.pellets.push(...newPellets);
    }
  }

  private endGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game || game.status !== GameStatus.ACTIVE) return;

    game.status = GameStatus.FINISHED;
    game.endTime = Date.now();

    // Sort players by score
    const sortedPlayers = game.players.sort((a, b) => b.score - a.score);
    const winners = sortedPlayers.filter(p => p.isAlive);

    // Calculate game results for stats
    if (this.statsService && game.endTime && game.startTime) {
      const gameResults: GameResult[] = game.players.map((player, index) => {
        const position = sortedPlayers.findIndex(p => p.id === player.id) + 1;
        const survivalTime = game.endTime! - game.startTime!;
        
        // Simple kill/death calculation (could be enhanced with actual tracking)
        const kills = Math.floor(player.score / 100); // Rough estimate
        const deaths = player.isAlive ? 0 : 1;
        
        // Prize calculation based on position and entry fee
        let earnings = 0;
        if (position === 1 && game.players.length > 1) {
          earnings = game.entryFee * game.players.length * 0.7; // 70% to winner
        } else if (position === 2 && game.players.length > 3) {
          earnings = game.entryFee * game.players.length * 0.2; // 20% to 2nd
        } else if (position === 3 && game.players.length > 5) {
          earnings = game.entryFee * game.players.length * 0.1; // 10% to 3rd
        } else {
          earnings = -game.entryFee; // Entry fee lost
        }

        return {
          playerId: player.id,
          won: position === 1,
          score: player.score,
          kills,
          deaths,
          survivalTime,
          maxCellSize: player.size,
          earnings
        };
      });

      // Initialize player stats if needed
      game.players.forEach(player => {
        if (player.walletAddress) {
          this.statsService!.initializePlayer(player.id, player.walletAddress);
        }
      });

      // Update stats
      this.statsService.updatePlayerStats(gameResults);

      // Check for achievements (sync operation)
      game.players.forEach((player) => {
        try {
          const achievements = this.statsService!.checkAchievements(player.id);
          if (achievements.length > 0) {
            console.log(`Player ${player.id} unlocked achievements:`, achievements);
            // Emit achievement notifications via socket
          }
        } catch (error) {
          console.error(`Error checking achievements for ${player.id}:`, error);
        }
      });
    }

    console.log(`Game ${gameId} ended. Winners:`, winners.slice(0, 3));
    
    // Clean up game after 5 minutes
    setTimeout(() => {
      this.games.delete(gameId);
    }, 5 * 60 * 1000);
  }

  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePellets(count: number = this.gameConfig.pelletsCount): Pellet[] {
    const pellets: Pellet[] = [];
    
    for (let i = 0; i < count; i++) {
      pellets.push({
        id: `pellet_${i}_${Date.now()}`,
        position: {
          x: Math.random() * this.gameConfig.worldSize.width,
          y: Math.random() * this.gameConfig.worldSize.height
        },
        size: Math.random() * 3 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        value: Math.random() * 2 + 1
      });
    }
    
    return pellets;
  }

  private getRandomSpawnPosition(): Position {
    const bounds = this.gameConfig.worldSize;
    return {
      x: Math.random() * (bounds.width - 200) + 100,
      y: Math.random() * (bounds.height - 200) + 100
    };
  }

  private getDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}