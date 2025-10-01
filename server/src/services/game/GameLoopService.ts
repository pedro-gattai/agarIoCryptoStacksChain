import type { PlayerConnection, PlayerInput, Pellet, Position } from 'shared';
import { GAME_CONSTANTS, COLORS } from 'shared';
import { RoomService } from '../room/RoomService';
import { BotService } from '../bot/BotService';

export class GameLoopService {
  private roomService: RoomService;
  private botService: BotService;
  private gameLoopInterval: NodeJS.Timeout | null = null;
  
  private readonly TICK_RATE = 30;
  private readonly TICK_INTERVAL = 1000 / this.TICK_RATE;
  
  // Game state
  private pellets: Map<string, Pellet> = new Map();
  private readonly WORLD_SIZE = { width: 4000, height: 4000 };
  private readonly PELLETS_COUNT = 800; // Slightly less for better performance with 100 players
  private pelletIdCounter = 0;

  constructor(roomService: RoomService, botService: BotService) {
    this.roomService = roomService;
    this.botService = botService;
    this.initializePellets();
  }

  public startGameLoop(): void {
    if (this.gameLoopInterval) {
      console.log('⚠️ Game loop already running');
      return;
    }

    console.log(`🔄 Starting game loop at ${this.TICK_RATE} TPS`);
    
    this.gameLoopInterval = setInterval(() => {
      this.gameLoopTick();
    }, this.TICK_INTERVAL);
  }

  public stopGameLoop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
      console.log('⏹️ Game loop stopped');
    }
  }

  private gameLoopTick(): void {
    try {
      // Process player inputs
      this.processPlayerInputs();
      
      // Update bot AI
      this.updateBots();
      
      // Update game state and physics
      this.updateGameState();
      
      // Process collisions
      this.processCollisions();
      
      // Regenerate pellets if needed
      this.regeneratePellets();
      
      // Broadcast updates to players
      this.broadcastUpdates();
      
    } catch (error) {
      console.error('❌ Error in game loop:', error);
    }
  }

  private processPlayerInputs(): void {
    const globalRoom = this.roomService.getGlobalRoom();
    
    for (const [playerId, player] of globalRoom.players) {
      if (player.isBot) continue;
      
      // Process buffered inputs
      while (player.inputBuffer.length > 0) {
        const input = player.inputBuffer.shift();
        if (input) {
          this.processInput(player, input);
        }
      }
    }
  }

  private processInput(player: PlayerConnection, input: PlayerInput): void {
    // Initialize player properties if not exists
    if (!(player as any).size) (player as any).size = 25;
    if (!(player as any).score) (player as any).score = 0;
    
    // Update player position based on mouse position
    if (input.mousePosition) {
      // Simple movement towards mouse position
      const dx = input.mousePosition.x - player.position.x;
      const dy = input.mousePosition.y - player.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 5) {
        // Speed decreases with size (same logic as client)
        const playerSize = (player as any).size || 25;
        const speedMultiplier = Math.max(0.2, 1 - (playerSize - 25) / 120);
        const baseSpeed = 0.5; // Further reduced for slower, more strategic gameplay
        const moveSpeed = baseSpeed * speedMultiplier;
        
        const newX = player.position.x + (dx / distance) * moveSpeed;
        const newY = player.position.y + (dy / distance) * moveSpeed;
        
        // Apply boundary constraints
        player.position.x = Math.max(20, Math.min(this.WORLD_SIZE.width - 20, newX));
        player.position.y = Math.max(20, Math.min(this.WORLD_SIZE.height - 20, newY));
      }
    }

    // Process actions
    if (input.actions && Array.isArray(input.actions)) {
      for (const action of input.actions) {
        this.processPlayerAction(player, action);
      }
    }
  }

  private processPlayerAction(player: PlayerConnection, action: string): void {
    switch (action) {
      case 'split':
        // Handle split action
        console.log(`🔀 Player ${player.playerId} split`);
        break;
        
      case 'eject':
      case 'eject_mass':
        // Handle eject mass action
        console.log(`💨 Player ${player.playerId} ejected mass`);
        break;
        
      default:
        console.log(`❓ Unknown action: ${action} from player ${player.playerId}`);
    }
  }

  private updateBots(): void {
    const globalRoom = this.roomService.getGlobalRoom();
    
    for (const [playerId, player] of globalRoom.players) {
      if (player.isBot && player.botAI) {
        this.botService.updateBotAI(player);
      }
    }
  }

  private updateGameState(): void {
    // Update game state logic here
    const globalRoom = this.roomService.getGlobalRoom();
    globalRoom.lastActivity = new Date();
    
    // Apply boundary constraints to all players
    for (const [playerId, player] of globalRoom.players) {
      player.position.x = Math.max(20, Math.min(this.WORLD_SIZE.width - 20, player.position.x));
      player.position.y = Math.max(20, Math.min(this.WORLD_SIZE.height - 20, player.position.y));
    }
  }

  private broadcastUpdates(): void {
    const globalRoom = this.roomService.getGlobalRoom();
    const playerSockets = this.roomService.getAllPlayerSockets();
    
    // Create game update with pellets
    const gameUpdate = {
      timestamp: Date.now(),
      players: Array.from(globalRoom.players.values()).map(player => ({
        id: player.playerId,
        position: player.position,
        size: (player as any).size || 25,
        color: player.isBot ? '#888888' : '#4ECDC4',
        score: (player as any).score || 0
      })),
      gameState: {
        pellets: Array.from(this.pellets.values()).map(pellet => ({
          id: pellet.id,
          position: pellet.position,
          size: pellet.size,
          color: pellet.color
        }))
      }
    };

    // Broadcast to all connected players
    for (const [playerId, socket] of playerSockets) {
      if (socket && socket.connected) {
        socket.emit('game_update', gameUpdate);
      }
    }
  }

  public addPlayerInput(playerId: string, input: PlayerInput): void {
    const globalRoom = this.roomService.getGlobalRoom();
    const player = globalRoom.players.get(playerId);
    
    if (player && !player.isBot) {
      player.inputBuffer.push(input);
      
      // Limit buffer size to prevent memory issues
      if (player.inputBuffer.length > 10) {
        player.inputBuffer.shift();
      }
    }
  }

  public isRunning(): boolean {
    return this.gameLoopInterval !== null;
  }

  public getTickRate(): number {
    return this.TICK_RATE;
  }
  
  private initializePellets(): void {
    console.log(`🟡 Initializing ${this.PELLETS_COUNT} pellets...`);
    for (let i = 0; i < this.PELLETS_COUNT; i++) {
      const pellet: Pellet = {
        id: `pellet_${this.pelletIdCounter++}`,
        position: {
          x: Math.random() * this.WORLD_SIZE.width,
          y: Math.random() * this.WORLD_SIZE.height
        },
        size: Math.random() * 3 + 2, // Size between 2-5
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        value: Math.random() * 2 + 1 // Value between 1-3
      };
      this.pellets.set(pellet.id, pellet);
    }
    console.log(`✅ Pellets initialized: ${this.pellets.size}`);
  }
  
  private processCollisions(): void {
    const globalRoom = this.roomService.getGlobalRoom();
    
    // Check player-pellet collisions
    for (const [playerId, player] of globalRoom.players) {
      const playerSize = (player as any).size || 25;
      
      for (const [pelletId, pellet] of this.pellets) {
        const distance = this.getDistance(player.position, pellet.position);
        const combinedRadius = playerSize / 2 + pellet.size;
        
        if (distance < combinedRadius) {
          // Player eats pellet
          const newSize = Math.min(100, playerSize + pellet.value * 0.5);
          const newScore = ((player as any).score || 0) + Math.floor(pellet.value * 10);
          
          // Update player
          (player as any).size = newSize;
          (player as any).score = newScore;
          
          // Remove pellet
          this.pellets.delete(pelletId);
          
          const isBot = player.isBot;
          const logPrefix = isBot ? '🤖' : '👤';
          console.log(`${logPrefix} Player ${playerId} ate pellet ${pelletId}, size: ${playerSize} → ${newSize}`);
          break; // Only eat one pellet per tick to prevent issues
        }
      }
    }
    
    // Check player-player collisions
    this.processPlayerVsPlayerCollisions(globalRoom);
  }
  
  private regeneratePellets(): void {
    const currentPellets = this.pellets.size;
    const targetPellets = this.PELLETS_COUNT;
    
    if (currentPellets < targetPellets * 0.8) { // Regenerate when below 80%
      const pelletsToGenerate = Math.min(50, targetPellets - currentPellets); // Generate max 50 per tick
      
      for (let i = 0; i < pelletsToGenerate; i++) {
        const pellet: Pellet = {
          id: `pellet_${this.pelletIdCounter++}`,
          position: this.generateSafePelletPosition(),
          size: Math.random() * 3 + 2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          value: Math.random() * 2 + 1
        };
        this.pellets.set(pellet.id, pellet);
      }
      
      if (pelletsToGenerate > 0) {
        console.log(`🔄 Regenerated ${pelletsToGenerate} pellets. Total: ${this.pellets.size}`);
      }
    }
  }
  
  private generateSafePelletPosition(): Position {
    const globalRoom = this.roomService.getGlobalRoom();
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const position = {
        x: Math.random() * this.WORLD_SIZE.width,
        y: Math.random() * this.WORLD_SIZE.height
      };
      
      // Check if position is far enough from players
      let tooClose = false;
      for (const [_, player] of globalRoom.players) {
        const distance = this.getDistance(position, player.position);
        const playerSize = (player as any).size || 25;
        
        if (distance < playerSize + 50) { // 50 unit buffer
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
      y: Math.random() * this.WORLD_SIZE.height
    };
  }
  
  private getDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  public getPelletsCount(): number {
    return this.pellets.size;
  }
  
  private processPlayerVsPlayerCollisions(globalRoom: any): void {
    const players = Array.from(globalRoom.players.values());
    
    for (let i = 0; i < players.length; i++) {
      const predator = players[i];
      const predatorSize = (predator as any).size || 25;
      
      if (!predator || predatorSize < 30) continue; // Must be reasonable size to eat others
      
      for (let j = 0; j < players.length; j++) {
        if (i === j) continue;
        
        const prey = players[j];
        const preySize = (prey as any).size || 25;
        
        if (!prey || preySize >= predatorSize * 0.8) continue; // Can only eat much smaller players
        
        const distance = this.getDistance((predator as any).position, (prey as any).position);
        const requiredSize = preySize * 1.2; // Must be 20% bigger to eat
        
        if (predatorSize > requiredSize && distance < predatorSize / 2) {
          // Predator eats prey
          const gainedMass = preySize * 0.8; // Gain 80% of eaten player's mass
          const newSize = Math.min(120, predatorSize + gainedMass * 0.5);
          const newScore = ((predator as any).score || 0) + Math.floor(preySize * 20);
          
          // Update predator
          (predator as any).size = newSize;
          (predator as any).score = newScore;
          
          // Mark prey as dead (will be handled by respawn system)
          const preyId = (prey as any).playerId;
          const predatorId = (predator as any).playerId;
          
          const predatorIsBot = (predator as any).isBot;
          const preyIsBot = (prey as any).isBot;
          const predatorPrefix = predatorIsBot ? '🤖' : '👤';
          const preyPrefix = preyIsBot ? '🤖' : '👤';
          
          console.log(`🍽️ ${predatorPrefix} ${predatorId} (${predatorSize}) ate ${preyPrefix} ${preyId} (${preySize}) → size: ${newSize}`);
          
          // Remove eaten player and respawn them
          this.respawnPlayer(globalRoom, preyId);
          break; // Only eat one player per tick
        }
      }
    }
  }
  
  private respawnPlayer(globalRoom: any, playerId: string): void {
    const player = globalRoom.players.get(playerId);
    if (!player) return;
    
    // Reset player stats
    (player as any).size = 25;
    (player as any).score = Math.max(0, ((player as any).score || 0) - 50); // Lose some score
    
    // Respawn at random position
    player.position = {
      x: Math.random() * this.WORLD_SIZE.width,
      y: Math.random() * this.WORLD_SIZE.height
    };
    
    const isBot = player.isBot;
    const logPrefix = isBot ? '🤖' : '👤';
    console.log(`🔄 ${logPrefix} Player ${playerId} respawned at (${Math.floor(player.position.x)}, ${Math.floor(player.position.y)})`);
  }
}