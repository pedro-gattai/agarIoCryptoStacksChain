import { Player } from './Player';
import { Pellet } from './Pellet';
import { Camera } from './Camera';
import { CollisionSystem } from './CollisionSystem';
import type { Vector2 } from '../utils/mathUtils';
import { MathUtils } from '../utils/mathUtils';

export interface GameConfig {
  worldWidth: number;
  worldHeight: number;
  pelletsCount: number;
  maxPlayers: number;
}

export interface GameState {
  players: Player[];
  pellets: Pellet[];
  localPlayerId: string | null;
  gameTime: number;
  isRunning: boolean;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private config: GameConfig;
  private state: GameState;
  
  private mousePosition: Vector2 = { x: 0, y: 0 };
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  
  // Multiplayer support
  private isMultiplayer: boolean = false;
  private onInputCallback?: (mousePosition: Vector2, actions: string[]) => void;
  private inputBuffer: string[] = [];
  
  // Performance tracking
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  
  // Event listener cleanup
  private eventCleanupFunctions: Function[] = [];

  constructor(
    canvas: HTMLCanvasElement, 
    config: GameConfig,
    isMultiplayer: boolean = false,
    onInputCallback?: (mousePosition: Vector2, actions: string[]) => void
  ) {
    console.log('GameEngine: Constructor called with config:', config);
    
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    this.ctx = ctx;
    
    console.log('GameEngine: Canvas context obtained, creating camera');
    this.camera = new Camera(canvas.width, canvas.height);
    
    this.config = config;
    this.isMultiplayer = isMultiplayer;
    this.onInputCallback = onInputCallback;
    
    console.log('GameEngine: Camera created, initializing state');
    
    this.state = {
      players: [],
      pellets: [],
      localPlayerId: null,
      gameTime: 0,
      isRunning: false
    };

    console.log('GameEngine: State initialized, setting up event listeners');
    this.setupEventListeners();
    
    console.log('GameEngine: Event listeners set up');
    
    // Only generate pellets locally if not multiplayer
    if (!isMultiplayer) {
      console.log('GameEngine: Single player mode, generating pellets');
      this.generateInitialPellets();
      console.log('GameEngine: Pellets generated');
    } else {
      console.log('GameEngine: Multiplayer mode, skipping pellet generation');
    }
    
    console.log('GameEngine: Constructor completed successfully');
  }

  private setupEventListeners(): void {
    // Mouse movement handler
    const handleMouseMove = (event: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    };

    // Keyboard controls handler
    const handleKeyDown = (event: KeyboardEvent) => {
      const localPlayer = this.getLocalPlayer();
      if (!localPlayer) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          if (this.isMultiplayer) {
            this.inputBuffer.push('split');
          } else {
            this.splitLocalPlayer();
          }
          break;
        case 'w':
        case 'W':
          event.preventDefault();
          if (this.isMultiplayer) {
            this.inputBuffer.push('eject');
          } else {
            this.ejectMass();
          }
          break;
      }
    };

    // Canvas resize handler
    const handleResize = () => {
      this.resizeCanvas();
    };

    // Add event listeners
    this.canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    // Store cleanup functions
    this.eventCleanupFunctions.push(
      () => this.canvas.removeEventListener('mousemove', handleMouseMove),
      () => window.removeEventListener('keydown', handleKeyDown),
      () => window.removeEventListener('resize', handleResize)
    );
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.width = container.clientWidth;
      this.canvas.height = container.clientHeight;
      this.camera.resize(this.canvas.width, this.canvas.height);
    }
  }

  private generateInitialPellets(): void {
    this.state.pellets = Pellet.generatePellets(
      this.config.pelletsCount,
      this.config.worldWidth,
      this.config.worldHeight
    );
  }

  private regeneratePellets(): void {
    const alivePellets = this.state.pellets.filter(p => p.isAlive);
    const deadPelletsCount = this.config.pelletsCount - alivePellets.length;
    
    if (deadPelletsCount > 0) {
      const newPellets = Pellet.generatePellets(
        deadPelletsCount,
        this.config.worldWidth,
        this.config.worldHeight,
        this.state.players.map(p => ({ position: p.position, radius: p.size + 50 }))
      );
      
      // Replace dead pellets
      let newPelletIndex = 0;
      for (let i = 0; i < this.state.pellets.length && newPelletIndex < newPellets.length; i++) {
        if (!this.state.pellets[i].isAlive) {
          this.state.pellets[i] = newPellets[newPelletIndex];
          newPelletIndex++;
        }
      }
    }
  }

  addPlayer(id: string, position: Vector2, color: string, isLocal: boolean = false): void {
    console.log(`🎮 GameEngine: Adding player`, { id, position, color, isLocal });
    
    // Check if player already exists
    const existingPlayer = this.state.players.find(p => p.id === id);
    if (existingPlayer) {
      if (isLocal && !existingPlayer.isLocalPlayer) {
        // Convert existing player to local player
        console.log(`🔄 GameEngine: Converting existing player ${id} to local player`);
        existingPlayer.isLocalPlayer = true;
        this.state.localPlayerId = id;
        console.log(`✅ GameEngine: Player ${id} converted to local successfully`);
        return;
      } else if (isLocal && existingPlayer.isLocalPlayer) {
        console.log(`ℹ️ GameEngine: Player ${id} is already a local player`);
        return;
      } else {
        console.log(`⚠️ GameEngine: Player ${id} already exists as non-local, skipping add`);
        return;
      }
    }
    
    const player = new Player(id, position, color, isLocal);
    this.state.players.push(player);
    
    console.log(`✅ GameEngine: Player added successfully`, {
      id,
      isLocal,
      totalPlayers: this.state.players.length,
      localPlayerId: this.state.localPlayerId
    });
    
    if (isLocal) {
      this.state.localPlayerId = id;
      console.log(`🎯 GameEngine: Local player set to ${id}`);
    }
  }

  removePlayer(id: string): void {
    this.state.players = this.state.players.filter(p => p.id !== id);
    
    if (this.state.localPlayerId === id) {
      this.state.localPlayerId = null;
    }
  }

  getLocalPlayer(): Player | null {
    if (!this.state.localPlayerId) return null;
    return this.state.players.find(p => p.id === this.state.localPlayerId) || null;
  }

  updatePlayerPosition(id: string, position: Vector2): void {
    const player = this.state.players.find(p => p.id === id);
    if (player && !player.isLocalPlayer) {
      player.setTargetPosition(position);
    }
  }

  splitLocalPlayer(): void {
    const localPlayer = this.getLocalPlayer();
    if (localPlayer) {
      const splitCells = localPlayer.split();
      this.state.players.push(...splitCells);
    }
  }

  ejectMass(): void {
    const localPlayer = this.getLocalPlayer();
    if (localPlayer) {
      const ejectedMass = localPlayer.ejectMass();
      if (ejectedMass) {
        // Create a temporary pellet for ejected mass
        const pellet = new Pellet(
          `ejected_${Date.now()}`,
          ejectedMass.position,
          ejectedMass.mass
        );
        pellet.color = ejectedMass.color;
        
        // Add to pellets array (replace a dead pellet or add new)
        const deadPelletIndex = this.state.pellets.findIndex(p => !p.isAlive);
        if (deadPelletIndex !== -1) {
          this.state.pellets[deadPelletIndex] = pellet;
        } else {
          this.state.pellets.push(pellet);
        }
      }
    }
  }

  start(): void {
    console.log('🎮 GameEngine: Start method called');
    console.log('🎮 GameEngine: Canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
    console.log('🎮 GameEngine: Config:', this.config);
    console.log('🎮 GameEngine: Players:', this.state.players.length);
    console.log('🎮 GameEngine: Pellets:', this.state.pellets.length);
    
    this.state.isRunning = true;
    this.lastTime = performance.now();
    console.log('🎮 GameEngine: Starting game loop...');
    this.gameLoop();
    console.log('🎮 GameEngine: Game loop initiated');
  }

  stop(): void {
    console.log('GameEngine: Stopping and cleaning up');
    
    // Stop game loop
    this.state.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Clean up event listeners
    this.eventCleanupFunctions.forEach(cleanup => cleanup());
    this.eventCleanupFunctions = [];
    
    // Clear game state
    this.state.players = [];
    this.state.pellets = [];
    this.state.localPlayerId = null;
    this.state.gameTime = 0;
    
    console.log('GameEngine: Cleanup completed');
  }

  private gameLoop = (currentTime: number = performance.now()): void => {
    if (!this.state.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.state.gameTime += deltaTime;

    // Update FPS
    this.updateFPS(deltaTime);

    // Update game state
    this.update(deltaTime);

    // Render
    this.render();

    // Continue loop
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsTime += deltaTime;
    
    if (this.fpsTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
    }
  }

  private update(_deltaTime: number): void {
    const localPlayer = this.getLocalPlayer();
    
    // Update local player with mouse position
    if (localPlayer && localPlayer.isAlive) {
      const worldMousePos = this.camera.screenToWorld(this.mousePosition);
      localPlayer.update(worldMousePos);
      
      // Update camera to follow local player
      this.camera.update(localPlayer.position, localPlayer.size);
      
      // Send input to server if multiplayer
      if (this.isMultiplayer && this.onInputCallback) {
        const actions = [...this.inputBuffer];
        this.inputBuffer = []; // Clear buffer
        this.onInputCallback(worldMousePos, actions);
      }
    } else {
      // Update camera with fallback if no local player
      this.camera.update();
    }

    // Update all other players
    this.state.players.forEach(player => {
      if (player.id !== this.state.localPlayerId) {
        player.update();
      }
    });

    if (!this.isMultiplayer) {
      // Single player: full collision detection and game logic
      CollisionSystem.checkCollisionsOptimized(
        this.state.players,
        this.state.pellets,
        this.config.worldWidth,
        this.config.worldHeight
      );

      // Regenerate pellets
      this.regeneratePellets();

      // Remove dead players (but keep local player even if dead for respawn)
      this.state.players = this.state.players.filter(
        p => p.isAlive || p.isLocalPlayer
      );
    } else {
      // Multiplayer: only apply boundary collision for client-side prediction/smoothing
      CollisionSystem.checkWorldBoundaries(
        this.state.players,
        this.config.worldWidth,
        this.config.worldHeight
      );
    }
  }

  private render(): void {
    // Enhanced debug render call every 60 frames (approx 1 second at 60fps)
    if (this.frameCount % 60 === 0) {
      const localPlayer = this.getLocalPlayer();
      console.log(`🎨 GameEngine: Render frame ${this.frameCount}`, {
        players: this.state.players.length,
        alivePlayers: this.state.players.filter(p => p.isAlive).length,
        pellets: this.state.pellets.length,
        canvasSize: `${this.canvas.width}x${this.canvas.height}`,
        isRunning: this.state.isRunning,
        localPlayerId: this.state.localPlayerId,
        hasLocalPlayer: !!localPlayer,
        localPlayerPosition: localPlayer?.position,
        localPlayerAlive: localPlayer?.isAlive,
        cameraPosition: { x: this.camera.position?.x, y: this.camera.position?.y },
        cameraZoom: this.camera.zoom,
        playersDetails: this.state.players.map(p => ({
          id: p.id,
          position: p.position,
          size: p.size,
          isLocal: p.isLocalPlayer,
          isAlive: p.isAlive
        }))
      });
    }

    // Clear canvas
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.drawGrid();

    // Draw world boundaries
    this.drawWorldBoundaries();

    // Get visible entities for performance
    const visiblePellets = this.state.pellets.filter(pellet =>
      pellet.isAlive && this.camera.isInView(pellet.position, pellet.size)
    );

    const visiblePlayers = this.state.players.filter(player =>
      player.isAlive && this.camera.isInView(player.position, player.size)
    );

    // Draw pellets first (behind players)
    visiblePellets.forEach(pellet => {
      pellet.render(this.ctx, this.camera);
    });

    // Draw players (sorted by size, smaller ones first)
    visiblePlayers
      .sort((a, b) => a.size - b.size)
      .forEach(player => {
        player.render(this.ctx, this.camera);
      });

    // Draw UI elements
    this.drawUI();
  }

  private drawGrid(): void {
    const bounds = this.camera.getViewBounds();
    const gridSize = 50;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;

    // Vertical lines
    const startX = Math.floor(bounds.left / gridSize) * gridSize;
    for (let x = startX; x < bounds.right; x += gridSize) {
      const screenX = this.camera.worldToScreen({ x, y: 0 }).x;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, this.canvas.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    const startY = Math.floor(bounds.top / gridSize) * gridSize;
    for (let y = startY; y < bounds.bottom; y += gridSize) {
      const screenY = this.camera.worldToScreen({ x: 0, y }).y;
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(this.canvas.width, screenY);
      this.ctx.stroke();
    }
  }

  private drawWorldBoundaries(): void {
    const topLeft = this.camera.worldToScreen({ x: 0, y: 0 });
    const bottomRight = this.camera.worldToScreen({
      x: this.config.worldWidth,
      y: this.config.worldHeight
    });

    this.ctx.strokeStyle = '#e74c3c';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y
    );
  }

  private drawUI(): void {
    const localPlayer = this.getLocalPlayer();
    
    // Player stats
    if (localPlayer) {
      this.ctx.fillStyle = 'white';
      this.ctx.font = '16px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`Score: ${localPlayer.score}`, 10, 30);
      this.ctx.fillText(`Mass: ${Math.floor(localPlayer.mass)}`, 10, 50);
      this.ctx.fillText(`Size: ${Math.floor(localPlayer.size)}`, 10, 70);
      this.ctx.fillText(`Pos: ${Math.floor(localPlayer.position.x)}, ${Math.floor(localPlayer.position.y)}`, 10, 90);
    } else {
      // Debug info when no local player
      this.ctx.fillStyle = 'red';
      this.ctx.font = '16px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('❌ NO LOCAL PLAYER', 10, 30);
      this.ctx.fillText(`Local ID: ${this.state.localPlayerId || 'null'}`, 10, 50);
      this.ctx.fillText(`Total Players: ${this.state.players.length}`, 10, 70);
    }

    // FPS counter
    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`FPS: ${this.fps}`, this.canvas.width - 10, 20);
    
    // Player count
    const alivePlayers = this.state.players.filter(p => p.isAlive).length;
    const localPlayers = this.state.players.filter(p => p.isLocalPlayer).length;
    this.ctx.fillText(
      `Players: ${alivePlayers}/${this.config.maxPlayers}`,
      this.canvas.width - 10,
      40
    );
    this.ctx.fillText(
      `Local: ${localPlayers}`,
      this.canvas.width - 10,
      60
    );

    // Camera debug info
    this.ctx.fillText(
      `Cam: ${Math.floor(this.camera.position.x)}, ${Math.floor(this.camera.position.y)}`,
      this.canvas.width - 10,
      80
    );
  }

  // Multiplayer synchronization methods
  updateFromServer(serverUpdate: {
    players: Array<{
      id: string;
      position: Vector2;
      size?: number;
      color?: string;
      score?: number;
    }>;
    gameState?: {
      pellets: Array<{
        id: string;
        position: Vector2;
        size: number;
        color: string;
      }>;
    };
  }): void {
    if (!this.isMultiplayer) return;

    console.log(`🔄 GameEngine: Received update with ${serverUpdate.players.length} players`);

    // Update players from server data
    serverUpdate.players.forEach(serverPlayer => {
      const existingPlayer = this.state.players.find(p => p.id === serverPlayer.id);
      
      // Debug: Log player data for human players
      if (!serverPlayer.id.includes('bot_')) {
        console.log(`👤 CLIENT: Processing human player ${serverPlayer.id}, size: ${serverPlayer.size}, score: ${serverPlayer.score}`);
      }
      
      if (existingPlayer) {
        // Debug: Check if this is the local player
        if (!serverPlayer.id.includes('bot_')) {
          console.log(`🔍 Found existing human player: ${existingPlayer.id}, isLocal: ${existingPlayer.isLocalPlayer}, localPlayerId: ${this.state.localPlayerId}`);
        }
        
        // Update existing player (except local player position - client prediction)
        if (!existingPlayer.isLocalPlayer) {
          existingPlayer.setTargetPosition(serverPlayer.position);
          if (serverPlayer.size !== undefined) {
            existingPlayer.size = serverPlayer.size;
            existingPlayer.mass = serverPlayer.size * serverPlayer.size / 100; // Approximate
          }
          if (serverPlayer.score !== undefined) {
            existingPlayer.score = serverPlayer.score;
          }
        } else {
          // For local player, only update non-position data
          console.log(`🎯 LOCAL PLAYER UPDATE: ${existingPlayer.id}, isLocal: ${existingPlayer.isLocalPlayer}`);
          console.log(`🎯 LOCAL PLAYER DATA: current size ${existingPlayer.size}, server size ${serverPlayer.size}`);
          
          const oldSize = existingPlayer.size;
          if (serverPlayer.size !== undefined) {
            existingPlayer.size = serverPlayer.size;
            existingPlayer.mass = serverPlayer.size * serverPlayer.size / 100;
            console.log(`🔄 LOCAL PLAYER GROWTH: ${oldSize} → ${serverPlayer.size} (mass: ${existingPlayer.mass}, score: ${serverPlayer.score})`);
            
            // Force visual update
            console.log(`✅ Applied size to local player: ${existingPlayer.size}`);
          }
          if (serverPlayer.score !== undefined) {
            existingPlayer.score = serverPlayer.score;
          }
        }
      } else {
        // Add new player
        const newPlayer = new Player(
          serverPlayer.id,
          serverPlayer.position,
          serverPlayer.color || MathUtils.randomColor(),
          false
        );
        if (serverPlayer.size) newPlayer.size = serverPlayer.size;
        if (serverPlayer.score) newPlayer.score = serverPlayer.score;
        this.state.players.push(newPlayer);
      }
    });

    // Remove players not in server update (but preserve local player if missing from server)
    const serverPlayerIds = serverUpdate.players.map(p => p.id);
    this.state.players = this.state.players.filter(player => {
      const shouldKeep = serverPlayerIds.includes(player.id);
      
      // Always preserve the local player, even if not in server update
      if (player.isLocalPlayer && !shouldKeep) {
        console.log(`🛡️ GameEngine: Preserving local player ${player.id} not found in server update`);
        return true;
      }
      
      return shouldKeep;
    });

    // Update pellets if provided
    if (serverUpdate.gameState?.pellets) {
      const oldPelletCount = this.state.pellets.length;
      const newPelletCount = serverUpdate.gameState.pellets.length;
      
      if (oldPelletCount !== newPelletCount) {
        console.log(`🟡 GameEngine: Pellets changed ${oldPelletCount} → ${newPelletCount} (${oldPelletCount - newPelletCount} removed)`);
      }
      
      this.state.pellets = [];
      serverUpdate.gameState.pellets.forEach(pelletData => {
        const pellet = new Pellet(
          pelletData.id,
          pelletData.position,
          pelletData.size
        );
        pellet.color = pelletData.color;
        this.state.pellets.push(pellet);
      });
    }
  }

  setLocalPlayer(playerId: string): void {
    this.state.localPlayerId = playerId;
    const localPlayer = this.getLocalPlayer();
    if (localPlayer) {
      localPlayer.isLocalPlayer = true;
    }
  }

  forceLocalPlayer(playerId: string): boolean {
    console.log(`🔧 GameEngine: Force setting local player to ${playerId}`);
    
    // Find player by ID
    const player = this.state.players.find(p => p.id === playerId);
    
    if (!player) {
      console.log(`❌ GameEngine: Cannot force local player - player ${playerId} not found`);
      return false;
    }
    
    // Clear any existing local player status
    this.state.players.forEach(p => {
      if (p.isLocalPlayer && p.id !== playerId) {
        p.isLocalPlayer = false;
        console.log(`🔄 GameEngine: Removed local status from ${p.id}`);
      }
    });
    
    // Set new local player
    player.isLocalPlayer = true;
    this.state.localPlayerId = playerId;
    
    console.log(`✅ GameEngine: Force local player set to ${playerId}`);
    return true;
  }

  // Public getters for external components
  getGameState(): GameState {
    return { ...this.state };
  }

  getLeaderboard(): Array<{ id: string; score: number; size: number }> {
    return this.state.players
      .filter(p => p.isAlive)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        score: p.score,
        size: Math.floor(p.size)
      }));
  }
}