import { Player } from './Player';
import { Pellet } from './Pellet';
import { Camera } from './Camera';
import { CollisionSystem } from './CollisionSystem';
import type { Vector2 } from '../utils/mathUtils';
import { MathUtils } from '../utils/mathUtils';
import { Logger, LogLevel } from 'shared';
import { reconcilePlayerState } from '../utils/reconciliation';
import { socketService } from '../services/socketService';

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

  // PHASE 5: Delta time for frame-rate independent movement
  private lastFrameTime: number = performance.now();
  private deltaTime: number = 0;
  
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
  
  // Visual effects (no game logic impact)
  private visualEffects: Array<{
    type: string;
    position: Vector2;
    timestamp: number;
    duration: number;
  }> = [];

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

  private update(deltaTime: number): void {
    const localPlayer = this.getLocalPlayer();

    // Update local player with mouse position
    if (localPlayer && localPlayer.isAlive) {
      const worldMousePos = this.camera.screenToWorld(this.mousePosition);
      // PHASE 5: Pass delta time for frame-rate independent movement
      localPlayer.update(worldMousePos, deltaTime);

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

    // Update all other players (remote players use interpolation, don't need deltaTime)
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
      // Multiplayer: CLIENT IS PASSIVE - Only server controls game logic
      // Only apply boundary collision for smooth movement prediction
      CollisionSystem.checkWorldBoundaries(
        this.state.players,
        this.config.worldWidth,
        this.config.worldHeight
      );
      
      // CLIENT: Passive mode - debug logging disabled to reduce spam
    }
  }

  private render(): void {
    // Debug logging removed to reduce console noise
    // Uncomment for debugging:
    // if (this.frameCount % 600 === 0) { // Log every 10 seconds
    //   const localPlayer = this.getLocalPlayer();
    //   console.log(`🎨 GameEngine: Render frame ${this.frameCount}`, {
    //     players: this.state.players.length,
    //     pellets: this.state.pellets.length,
    //     localPlayerAlive: localPlayer?.isAlive
    //   });
    // }
    if (this.frameCount % 60 === 0) {
      const localPlayer = this.getLocalPlayer();
      // Removed verbose logging - uncomment above for debugging
      const _debugData = {
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
      };
      void _debugData; // Prevent unused variable warning
    }

    // Clear canvas
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.drawGrid();

    // Draw world boundaries
    this.drawWorldBoundaries();

    // IMPROVED: Draw connection lines between split cells
    this.drawSplitCellConnections();

    // Get visible entities for performance
    const visiblePellets = this.state.pellets.filter(pellet =>
      pellet.isAlive && this.camera.isInView(pellet.position, pellet.size)
    );

    // IMPROVED: Filter out dead players from rendering completely
    const visiblePlayers = this.state.players.filter(player =>
      player.isAlive && this.camera.isInView(player.position, player.size)
    );

    // Draw pellets first (behind players)
    visiblePellets.forEach(pellet => {
      pellet.render(this.ctx, this.camera);
    });

    // Draw players (sorted by size, smaller ones first)
    // Debug: Log split cell count occasionally
    if (this.frameCount % 300 === 0) { // Every 5 seconds at 60fps
      const splitCells = this.state.players.filter(p => (p as any).isSplitCell);
      const splitCount = splitCells.length;
      if (splitCount > 0) {
        console.log(`🎨 [RENDER] ${splitCount} split cells in game state:`, splitCells.map(s => ({
          id: s.id.substring(0, 25),
          isAlive: s.isAlive,
          position: `(${s.position.x.toFixed(0)}, ${s.position.y.toFixed(0)})`,
          size: s.size.toFixed(1),
          visible: this.camera.isInView(s.position, s.size)
        })));
      }
    }

    // DEBUGGING: Log split cells that should be rendered
    const splitCellsToRender = visiblePlayers.filter(p => (p as any).isSplitCell);
    if (splitCellsToRender.length > 0 && this.frameCount % 60 === 0) {
      console.log(`🎨 [RENDER] Rendering ${splitCellsToRender.length} visible split cells`);
    }

    visiblePlayers
      .sort((a, b) => a.size - b.size)
      .forEach(player => {
        player.render(this.ctx, this.camera);
      });

    // Draw visual effects (no game logic impact)
    this.renderVisualEffects();

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

  private drawSplitCellConnections(): void {
    // Find all cells belonging to the local player
    const localPlayerId = this.state.localPlayerId;
    if (!localPlayerId) return;

    // Get all cells of the local player (parent + splits)
    const playerCells = this.state.players.filter(p => {
      if (p.id === localPlayerId) return true;
      const isSplitCell = (p as any).isSplitCell;
      const parentId = (p as any).parentPlayerId;
      return isSplitCell && parentId === localPlayerId;
    });

    // Draw connection lines between cells
    if (playerCells.length > 1) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 10]);

      // Draw lines connecting all cells
      for (let i = 0; i < playerCells.length; i++) {
        for (let j = i + 1; j < playerCells.length; j++) {
          const cell1 = playerCells[i];
          const cell2 = playerCells[j];

          const pos1 = this.camera.worldToScreen(cell1.position);
          const pos2 = this.camera.worldToScreen(cell2.position);

          this.ctx.beginPath();
          this.ctx.moveTo(pos1.x, pos1.y);
          this.ctx.lineTo(pos2.x, pos2.y);
          this.ctx.stroke();
        }
      }

      this.ctx.restore();
    }
  }

  private renderVisualEffects(): void {
    const now = Date.now();
    
    // Clean up expired effects
    this.visualEffects = this.visualEffects.filter(effect => 
      now - effect.timestamp < effect.duration
    );
    
    // Render active effects
    this.visualEffects.forEach(effect => {
      const age = (now - effect.timestamp) / effect.duration; // 0 to 1
      const alpha = 1 - age; // Fade out over time
      
      if (effect.type === 'eating') {
        this.renderEatingEffect(effect.position, alpha);
      }
    });
  }

  private renderEatingEffect(position: Vector2, alpha: number): void {
    const screenPos = this.camera.worldToScreen(position);
    
    // Only render if visible
    if (screenPos.x < -50 || screenPos.x > this.canvas.width + 50 ||
        screenPos.y < -50 || screenPos.y > this.canvas.height + 50) {
      return;
    }
    
    // Simple circle effect that expands and fades
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = '#4ECDC4';
    this.ctx.lineWidth = 3;
    
    const radius = 15 + (1 - alpha) * 20; // Expand from 15 to 35 pixels
    
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.restore();
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

  // REMOVED: Immediate updates cause conflicts with server authority
  // All updates now come exclusively from updateFromServer()
  updatePlayerImmediate(playerData: {
    id: string;
    position?: Vector2;
    size?: number;
    score?: number;
    pelletEaten?: string;
  }): void {
    if (!this.isMultiplayer) return;

    console.log(`🚫 DISABLED: Immediate updates disabled to prevent conflicts with server authority`);
    console.log(`📡 Waiting for official server update for player ${playerData.id}`);
    
    // Only visual effects, no state changes
    if (playerData.pelletEaten) {
      const player = this.state.players.find(p => p.id === playerData.id);
      if (player && player.isLocalPlayer) {
        this.addEatingEffect(player.position);
      }
    }
  }

  private addEatingEffect(position: Vector2): void {
    // Visual effect for eating (no game logic changes)
    console.log(`✨ VISUAL: Eating effect at (${Math.floor(position.x)}, ${Math.floor(position.y)})`);
    
    // Store effect for rendering (will be enhanced in future updates)
    // This could include particle effects, screen shake, etc.
    this.visualEffects = this.visualEffects || [];
    this.visualEffects.push({
      type: 'eating',
      position: { ...position },
      timestamp: Date.now(),
      duration: 500 // 500ms effect
    });
    
    // Clean up old effects
    const now = Date.now();
    this.visualEffects = this.visualEffects.filter(effect => 
      now - effect.timestamp < effect.duration
    );
  }

  // DISABLED: Immediate pellet removal causes state conflicts
  removePelletImmediate(pelletId: string): void {
    if (!this.isMultiplayer) return;

    console.log(`🚫 DISABLED: Immediate pellet removal disabled to prevent conflicts`);
    console.log(`📡 Pellet ${pelletId} removal will be handled by server update`);
    
    // Pellets will be removed via updateFromServer() only
  }

  // Respawn local player after death
  respawnLocalPlayer(): void {
    const localPlayer = this.getLocalPlayer();
    if (!localPlayer) {
      console.warn('⚠️ No local player found for respawn');
      return;
    }

    // Reset player stats
    localPlayer.size = 25;
    localPlayer.mass = (25 * 25) / 100;
    localPlayer.score = Math.max(0, Math.floor(localPlayer.score * 0.9)); // Keep 90% of score
    localPlayer.isAlive = true;

    // Reset position to center of world (2000, 2000 for 4000x4000 world)
    localPlayer.position = {
      x: this.config.worldWidth / 2,
      y: this.config.worldHeight / 2
    };

    // FIXED: Removed invalid camera.setTarget() - camera.update() handles following in game loop
    // Camera will automatically follow player on next update() call

    console.log(`🔄 Local player respawned at (${localPlayer.position.x}, ${localPlayer.position.y})`);
  }

  // Handle death events from other players
  handleDeathEvent(deathData: {
    killerId: string;
    killerName: string;
    victimId: string;
    victimName: string;
    timestamp: number;
  }): void {
    console.log(`💀 Death event: ${deathData.killerName} eliminated ${deathData.victimName}`);
    
    // Add visual notification or effect (can be enhanced later)
    this.addDeathNotification(deathData);
  }

  // Handle local player death
  handleLocalPlayerDeath(deathData: { killedBy: string; timestamp: number }): void {
    const localPlayer = this.getLocalPlayer();
    if (!localPlayer) return;

    // Mark local player as dead
    localPlayer.isAlive = false;

    console.log(`💀 LOCAL PLAYER DIED! Killed by: ${deathData.killedBy}`);

    // The GameCanvas component will detect this and show the game over modal
  }

  // IMPROVED: Handle split cell merge event
  handleSplitMerge(data: { splitCellId: string; parentId: string; timestamp: number }): void {
    // Remove the split cell from the game state
    const splitIndex = this.state.players.findIndex(p => p.id === data.splitCellId);
    if (splitIndex !== -1) {
      this.state.players.splice(splitIndex, 1);
      console.log(`🔄 Split cell ${data.splitCellId} merged back to parent ${data.parentId}`);
    }
  }

  private addDeathNotification(deathData: any): void {
    // Simple death notification (can be enhanced with proper UI later)
    console.log(`📢 DEATH NOTIFICATION: ${deathData.killerName} eliminated ${deathData.victimName}`);
    
    // Could add floating text, sound effects, etc.
  }

  // Multiplayer synchronization methods
  updateFromServer(serverUpdate: {
    timestamp?: number; // Server timestamp
    isDelta?: boolean; // PHASE 7: Delta compression flag
    players: Array<{
      id: string;
      position: Vector2;
      size?: number;
      color?: string;
      score?: number;
      lastProcessedInput?: number; // PHASE 2: For reconciliation
      isAlive?: boolean;
      isSplitCell?: boolean;
      parentPlayerId?: string;
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

    const pelletsCount = serverUpdate.gameState?.pellets?.length || 0;
    const humanPlayers = serverUpdate.players.filter(p => !p.id.includes('bot_'));

    // Server update logging disabled to reduce debug spam

    // Human player debug logging disabled to reduce spam

    // PHASE 7: Handle delta updates (only changed data) vs full updates
    const isDelta = serverUpdate.isDelta || false;

    // Log split cells received from server for debugging
    const splitCells = serverUpdate.players.filter(p => p.isSplitCell);
    if (splitCells.length > 0) {
      console.log(`📡 [GameEngine] Received ${splitCells.length} split cells from server (isDelta: ${isDelta}):`,
        splitCells.map(s => ({
          id: s.id.substring(0, 25),
          parentId: s.parentPlayerId,
          size: s.size,
          color: s.color,
          isAlive: s.isAlive,
          position: `(${s.position.x.toFixed(0)}, ${s.position.y.toFixed(0)})`
        }))
      );
    }

    // Update players from server data
    serverUpdate.players.forEach(serverPlayer => {
      const existingPlayer = this.state.players.find(p => p.id === serverPlayer.id);

      if (existingPlayer) {
        // Update existing player (except local player position - client prediction)
        if (!existingPlayer.isLocalPlayer) {
          // PHASE 3: Add server state to interpolation buffer
          if (serverPlayer.position && serverPlayer.size !== undefined && serverUpdate.timestamp) {
            existingPlayer.addServerState(
              serverPlayer.position,
              serverPlayer.size,
              serverUpdate.timestamp
            );
          }

          // Update score (immediate, no interpolation needed)
          if (serverPlayer.score !== undefined) {
            existingPlayer.score = serverPlayer.score;
          }

          // Update isAlive status (server authoritative)
          if ((serverPlayer as any).isAlive !== undefined) {
            existingPlayer.isAlive = (serverPlayer as any).isAlive;
          }
        } else {
          // For local player: server reconciliation
          if (serverPlayer.lastProcessedInput !== undefined) {
            reconcilePlayerState(
              existingPlayer,
              {
                serverPosition: serverPlayer.position,
                lastProcessedInput: serverPlayer.lastProcessedInput
              },
              socketService.pendingInputs
            );
          }

          // Update size/score (server authoritative)
          if (serverPlayer.size !== undefined) {
            existingPlayer.size = serverPlayer.size;
            existingPlayer.mass = serverPlayer.size * serverPlayer.size / 100;
          }

          if (serverPlayer.score !== undefined) {
            const oldScore = existingPlayer.score;
            existingPlayer.score = serverPlayer.score;

            if (oldScore !== serverPlayer.score) {
              Logger.debug(`Score: ${oldScore} → ${serverPlayer.score}`);
            }
          }

          // CRITICAL FIX: ALWAYS update isAlive status (server authoritative, can override client death)
          if (serverPlayer.isAlive !== undefined) {
            const wasAlive = existingPlayer.isAlive;
            existingPlayer.isAlive = serverPlayer.isAlive;

            // Log state changes for local player to debug death/respawn
            if (existingPlayer.isLocalPlayer && wasAlive !== serverPlayer.isAlive) {
              console.log(`🔄 [GameEngine] Local player isAlive changed: ${wasAlive} → ${serverPlayer.isAlive}`);
            }
          }
        }
      } else {
        // Add new player
        // Check if this is a split cell from the local player
        const isSplitCell = serverPlayer.isSplitCell || false;
        const parentPlayerId = serverPlayer.parentPlayerId;
        const isOwnSplitCell = isSplitCell && parentPlayerId === this.state.localPlayerId;

        // IMPROVED: Always use color from server for consistency
        let playerColor = serverPlayer.color;
        if (!playerColor) {
          // Fallback only if server didn't provide color (shouldn't happen)
          playerColor = '#4ECDC4';
          console.warn(`No color received from server for player ${serverPlayer.id}`);
        }

        // FIXED: Don't mark split cells as local (causes control conflicts)
        // Server will control split cell movement, we just render with same color as parent
        const newPlayer = new Player(
          serverPlayer.id,
          serverPlayer.position,
          playerColor,
          false // Never mark split cells as local player
        );
        if (serverPlayer.size) newPlayer.size = serverPlayer.size;
        if (serverPlayer.score) newPlayer.score = serverPlayer.score;

        // CRITICAL: Always set isAlive, defaulting to true for new players/split cells
        newPlayer.isAlive = serverPlayer.isAlive !== undefined ? serverPlayer.isAlive : true;

        // Mark as split cell for rendering purposes
        (newPlayer as any).isSplitCell = isSplitCell;
        (newPlayer as any).parentPlayerId = parentPlayerId;
        (newPlayer as any).canMergeAt = serverPlayer.canMergeAt;

        this.state.players.push(newPlayer);

        if (isSplitCell) {
          console.log(`🔀 [GameEngine] Split cell created:`, {
            id: serverPlayer.id,
            parentPlayerId,
            isAlive: newPlayer.isAlive,
            size: newPlayer.size,
            position: newPlayer.position,
            color: playerColor,
            isLocalPlayerSplit: isOwnSplitCell,
            localPlayerId: this.state.localPlayerId,
            totalPlayers: this.state.players.length
          });

          // DEBUGGING: Verify split cell was added to state
          const addedSplitCell = this.state.players.find(p => p.id === serverPlayer.id);
          if (addedSplitCell) {
            console.log(`✅ [GameEngine] Split cell ${serverPlayer.id} successfully added to game state`);
          } else {
            console.error(`❌ [GameEngine] Split cell ${serverPlayer.id} NOT found in game state after adding!`);
          }
        }
      }
    });

    // PHASE 7: Only remove players on full updates, not delta updates
    if (!isDelta) {
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
    }

    // Update pellets if provided (from both full and delta updates)
    if (serverUpdate.gameState?.pellets) {
      const oldPelletCount = this.state.pellets.length;
      const newPelletCount = serverUpdate.gameState.pellets.length;
      const oldPelletIds = this.state.pellets.map(p => p.id);
      const newPelletIds = serverUpdate.gameState.pellets.map(p => p.id);
      
      // Pellet update logging disabled to reduce debug spam
      
      if (oldPelletCount !== newPelletCount) {
        const removed = oldPelletIds.filter(id => !newPelletIds.includes(id));
        const added = newPelletIds.filter(id => !oldPelletIds.includes(id));
        
        console.log(`🟡 PELLET CHANGES:`, {
          removed: removed.slice(0, 5), // Show first 5
          added: added.slice(0, 5),     // Show first 5
          removedCount: removed.length,
          addedCount: added.length
        });
      }
      
      // Replace entire pellet array with server data
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
      
      // Pellet count logging disabled to reduce debug spam
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