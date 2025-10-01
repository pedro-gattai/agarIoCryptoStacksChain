import { GameEngine } from '../game/GameEngine';
import type { GameConfig } from '../game/GameEngine';
import { getSocketService } from './socketService';
import { MathUtils } from '../utils/mathUtils';

/**
 * Singleton GameEngine Manager que persiste independente do React
 * Resolve problemas de React StrictMode destruindo GameCanvas prematuramente
 */
class GameEngineManager {
  private static instance: GameEngineManager | null = null;
  private gameEngine: GameEngine | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private config: GameConfig | null = null;
  private isMultiplayer: boolean = false;
  private onInputCallback: ((mousePosition: { x: number; y: number }, actions?: string[]) => void) | undefined;
  private listeners: Map<string, Function[]> = new Map();
  private isInitialized: boolean = false;
  private socketListenersSetup: boolean = false;
  private instanceId: string = '';

  static getInstance(): GameEngineManager {
    if (!GameEngineManager.instance) {
      GameEngineManager.instance = new GameEngineManager();
    }
    return GameEngineManager.instance;
  }

  private constructor() {
    this.instanceId = `engine_manager_${Date.now()}`;
    
    // Setup socket listeners immediately
    this.setupSocketListeners();
    
    // Also setup with a small delay as backup
    setTimeout(() => {
      this.setupSocketListeners();
    }, 500);
  }

  /**
   * Inicializa o GameEngine com a canvas e configuração
   */
  initialize(
    canvas: HTMLCanvasElement,
    config: GameConfig,
    isMultiplayer: boolean = false,
    onInputCallback?: (mousePosition: { x: number; y: number }, actions?: string[]) => void
  ): boolean {
    if (this.isInitialized && this.gameEngine) {
      return true;
    }

    try {
      this.canvas = canvas;
      this.config = config;
      this.isMultiplayer = isMultiplayer;
      this.onInputCallback = onInputCallback;

      // Create GameEngine
      this.gameEngine = new GameEngine(canvas, config, isMultiplayer, onInputCallback);
      this.isInitialized = true;

      // Start the game
      this.gameEngine.start();

      return true;
    } catch (error) {
      console.error(`[ENGINE_MANAGER] Failed to initialize:`, error);
      return false;
    }
  }

  /**
   * Obtém o GameEngine atual
   */
  getGameEngine(): GameEngine | null {
    return this.gameEngine;
  }

  /**
   * Força a criação do player local como fallback
   */
  createFallbackLocalPlayer(): boolean {
    if (!this.gameEngine) {
      return false;
    }

    const socketService = getSocketService();
    const playerId = socketService.getSocket()?.id || `fallback_local_${Date.now()}`;
    
    // Check if local player already exists
    const existingPlayer = this.gameEngine.getGameState().players.find(p => p.isLocalPlayer);
    if (existingPlayer) {
      return true;
    }

    try {
      const playerColor = MathUtils.randomColor();
      const position = { x: 1500, y: 1500 }; // Center of world
      
      this.gameEngine.addPlayer(playerId, position, playerColor, true);
      
      // Additional safety check: force local player status if it wasn't set correctly
      setTimeout(() => {
        if (this.gameEngine) {
          const gameState = this.gameEngine.getGameState();
          const localPlayer = gameState.players.find(p => p.isLocalPlayer);
          
          if (!localPlayer || localPlayer.id !== playerId) {
            this.gameEngine.forceLocalPlayer(playerId);
          }
        }
      }, 100);
      
      return true;
    } catch (error) {
      console.error('[ENGINE_MANAGER] Error creating fallback local player:', error);
      return false;
    }
  }

  /**
   * Verifica se está inicializado
   */
  isReady(): boolean {
    return this.isInitialized && this.gameEngine !== null;
  }

  /**
   * Setup dos socket listeners que persistem independente do React
   */
  private setupSocketListeners(): void {
    if (this.socketListenersSetup) {
      return;
    }

    const socketService = getSocketService();

    // Create handler functions that we can debug
    const handleGlobalRoomJoined = (data: { roomId: string; position: any; playersOnline: number; maxPlayers: number }) => {
      if (!this.gameEngine) {
        const retryWithBackoff = (attempt: number = 1, maxAttempts: number = 5) => {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          
          setTimeout(() => {
            if (this.gameEngine) {
              handleGlobalRoomJoined(data);
            } else if (attempt < maxAttempts) {
              retryWithBackoff(attempt + 1, maxAttempts);
            }
          }, delay);
        };
        
        retryWithBackoff();
        return;
      }

      try {
        const playerId = socketService.getSocket()?.id || `local_player_${Date.now()}`;
        const playerColor = MathUtils.randomColor();
        const position = data.position || { x: 1500, y: 1500 };
        
        // Double-check GameEngine is still valid before adding player
        if (!this.gameEngine) {
          return;
        }
        
        this.gameEngine.addPlayer(playerId, position, playerColor, true);
        
        // Additional safety check: force local player status if it wasn't set correctly
        setTimeout(() => {
          if (this.gameEngine) {
            const gameState = this.gameEngine.getGameState();
            const localPlayer = gameState.players.find(p => p.isLocalPlayer);
            
            if (!localPlayer || localPlayer.id !== playerId) {
              this.gameEngine.forceLocalPlayer(playerId);
            }
          }
        }, 100);
      } catch (error) {
        console.error('[ENGINE_MANAGER] Error creating local player:', error);
      }
    };

    const handlePlayerJoined = (data: { playerId: string; playersOnline: number; playerPosition: any; isBot?: boolean }) => {
      // Skip if no GameEngine, or if this is the local player
      if (!this.gameEngine || data.playerId === socketService.getSocket()?.id) {
        return;
      }

      try {
        const playerColor = MathUtils.randomColor();
        const position = data.playerPosition || { x: Math.random() * 3000, y: Math.random() * 3000 };
        
        // Double-check GameEngine is still valid
        if (!this.gameEngine) {
          return;
        }
        
        this.gameEngine.addPlayer(data.playerId, position, playerColor, false);
      } catch (error) {
        console.error('[ENGINE_MANAGER] Error adding player:', error);
      }
    };

    const handlePlayerLeft = (data: { playerId: string; playersOnline: number; isBot?: boolean }) => {
      if (!this.gameEngine) {
        return;
      }

      try {
        // Double-check GameEngine is still valid
        if (!this.gameEngine) {
          return;
        }
        
        this.gameEngine.removePlayer(data.playerId);
      } catch (error) {
        console.error('[ENGINE_MANAGER] Error removing player:', error);
      }
    };

    // Register the handlers
    socketService.on('global_room_joined', (data: any) => {
      handleGlobalRoomJoined(data);
    });
    
    socketService.on('player_joined', (data: any) => {
      handlePlayerJoined(data);
    });
    
    socketService.on('player_left', (data: any) => {
      handlePlayerLeft(data);
    });

    this.socketListenersSetup = true;
  }

  /**
   * Limpa recursos (só quando realmente necessário)
   */
  destroy(): void {
    if (this.gameEngine) {
      this.gameEngine.stop();
      this.gameEngine = null;
    }
    
    this.canvas = null;
    this.config = null;
    this.isInitialized = false;
    this.listeners.clear();
  }

  /**
   * Reset para permitir nova inicialização (para desenvolvimento)
   */
  reset(): void {
    this.destroy();
  }
}

export const gameEngineManager = GameEngineManager.getInstance();