import { io, Socket } from 'socket.io-client';
import type { PlayerInput } from 'shared';
import { Logger } from 'shared';

// Railway WebSocket fix: Using websocket + polling transports with credentials
export class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();
  private inputSequence: number = 0;
  private connectionPromise: Promise<void> | null = null;
  private clientCount: number = 0;

  // ADDED: Input buffer for server reconciliation
  public pendingInputs: Map<number, PlayerInput> = new Map();

  connect(serverUrl: string = 'http://localhost:3000'): Promise<void> {
    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    // If already connected, return resolved promise
    if (this.isConnected && this.socket) {
      return Promise.resolve();
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        console.log(`🔌 [SOCKET_CLIENT] Attempting connection to: ${serverUrl}`);
        
        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 10, // Increased from 5 for better reconnection
          withCredentials: true,
          // Increase timeouts for Railway deployment (high latency)
          timeout: 20000,
          // Match server ping configuration to prevent premature disconnects
          pingTimeout: 60000, // Match server (was default 20000)
          pingInterval: 25000, // Match server (was default 25000)
        });

        this.socket.on('connect', () => {
          console.log(`✅ [SOCKET_CLIENT] Connected to game server with ID: ${this.socket?.id}`);
          console.log(`🔌 [SOCKET_CLIENT] Connected to: ${serverUrl}`);
          this.isConnected = true;
          this.connectionPromise = null;
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log(`❌ [SOCKET_CLIENT] Disconnected from server: ${reason}`);
          this.isConnected = false;
          this.connectionPromise = null;
        });

        this.socket.on('connect_error', (error) => {
          console.error(`❌ [SOCKET_CLIENT] Connection error to ${serverUrl}:`, error);
          console.error('❌ [SOCKET_CLIENT] Error details:', {
            description: (error as any).description,
            type: (error as any).type,
            transport: (error as any).transport
          });
          this.connectionPromise = null;
          reject(error);
        });

        this.socket.on('error', (error) => {
          console.error('❌ [SOCKET_CLIENT] Socket error:', error);
          this.emit('error', error);
        });

        // Setup event forwarding
        this.setupEventForwarding();

      } catch (error) {
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    console.log('🔧 [SOCKET_SERVICE] Disconnecting and clearing all listeners');
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
    
    // Clear all listeners when disconnecting completely
    const totalListeners = Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0);
    this.listeners.clear();
    console.log(`🔧 [SOCKET_SERVICE] Cleared ${totalListeners} total listeners`);
  }

  // Client management for multi-tab support
  registerClient(): string {
    this.clientCount++;
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    // Log only removed to reduce noise
    return clientId;
  }

  unregisterClient(): void {
    this.clientCount = Math.max(0, this.clientCount - 1);
    console.log(`🔧 [SOCKET_SERVICE] Client unregistered, remaining clients: ${this.clientCount}`);
    
    // Only disconnect if no clients remain
    if (this.clientCount <= 0) {
      console.log('🔧 [SOCKET_SERVICE] No clients remaining, disconnecting socket');
      this.disconnect();
    }
  }
  
  // Debug method to check current listeners
  debugListeners(): void {
    console.log('🔍 [SOCKET_SERVICE] Current event listeners:');
    this.listeners.forEach((callbacks, event) => {
      console.log(`  - ${event}: ${callbacks.size} callbacks`);
    });
    console.log(`🔍 [SOCKET_SERVICE] Total events: ${this.listeners.size}`);
  }

  // Event listening with Set to avoid duplicates and better debugging
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    const callbacks = this.listeners.get(event)!;
    
    // Check if this exact callback is already registered
    if (callbacks.has(callback)) {
      console.warn(`⚠️ [SOCKET_SERVICE] Callback already registered for event '${event}', skipping duplicate`);
      return;
    }
    
    callbacks.add(callback);
    // Log removed to reduce noise - use debugListeners() for debugging
  }

  off(event: string, callback?: Function): void {
    if (!this.listeners.has(event)) {
      console.log(`🔧 [SOCKET_SERVICE] No listeners found for event '${event}'`);
      return;
    }
    
    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const removed = callbacks.delete(callback);
      
      if (removed) {
        console.log(`🔧 [SOCKET_SERVICE] Removed callback from event '${event}', remaining: ${callbacks.size}`);
      } else {
        console.warn(`⚠️ [SOCKET_SERVICE] Callback not found for event '${event}'`);
      }
      
      // Clean up empty event entries
      if (callbacks.size === 0) {
        this.listeners.delete(event);
        console.log(`🔧 [SOCKET_SERVICE] Cleaned up empty event '${event}'`);
      }
    } else {
      this.listeners.delete(event);
      console.log(`🔧 [SOCKET_SERVICE] Removed all listeners for event '${event}'`);
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || new Set();

    if (callbacks.size === 0) return;

    // Only log for critical events, not for game_update which happens 30x/sec
    const shouldLog = !['game_update', 'global_room_stats'].includes(event);
    if (shouldLog) {
      console.log(`🔄 [SOCKET_SERVICE] Emitting '${event}' to ${callbacks.size} callbacks`);
    }

    callbacks.forEach((callback, index) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`🔄 [SOCKET_SERVICE] Error in callback ${Number(index) + 1} for event ${event}:`, error);
      }
    });
  }

  private setupEventForwarding(): void {
    if (!this.socket) return;

    // Forward connection events first
    this.socket.on('connect', () => {
      console.log('socketService: Socket connected');
      this.isConnected = true;
      this.emit('connect', {});
    });

    this.socket.on('disconnect', (reason) => {
      console.log('socketService: Socket disconnected', reason);
      this.isConnected = false;
      this.emit('disconnect', reason);
    });

    // Forward all other relevant events
    const events = [
      'rooms_list',
      'room_created',
      'room_joined',
      'new_room_available',
      'player_joined',
      'player_left',
      'existing_players', // ADDED: Receive list of existing players when joining
      'game_starting',
      'game_started',
      'game_update',
      'game_ended',
      'error',
      // Global room events
      'join_success',
      'join_queued',
      'join_error',
      'global_room_stats',
      'initial_room_status',
      'global_room_joined',
      'queue_position_updated',
      'player_died',
      'player_respawned',
      'you_died',
      'room_status',
      'split_merged',
      // Contract/Payment events
      'contract_game_id',
      'payment_verified'
    ];

    events.forEach(event => {
      this.socket!.on(event, (data) => {
        // Only log non-game_update events (game_update happens 30x/sec)
        if (event !== 'game_update') {
          Logger.debug(`[SOCKET] ${event}`, data);
        }
        this.emit(event, data);
      });
    });

    console.log(`🔧 [SOCKET_SERVICE] Event forwarding setup completed for ${events.length} events:`, events);
  }

  // Room management
  getRooms(): void {
    this.socket?.emit('get_rooms');
  }

  createRoom(entryFee: number, maxPlayers: number = 10): void {
    this.socket?.emit('create_room', { entryFee, maxPlayers });
  }

  joinRoom(roomId: string, walletAddress?: string): void {
    this.socket?.emit('join_room', { roomId, walletAddress });
  }

  joinGlobalRoom(walletAddress?: string): void {
    if (!this.socket) {
      console.error('❌ [JOIN_GLOBAL_ROOM] No socket available!');
      return;
    }

    if (!this.isConnected) {
      console.error('❌ [JOIN_GLOBAL_ROOM] Socket not connected!');
      return;
    }

    console.log(`📤 [JOIN_GLOBAL_ROOM] Joining with wallet: ${walletAddress || 'none'}`);
    this.socket.emit('join_global_room', { walletAddress });
  }

  // Game input
  sendInput(mousePosition: { x: number; y: number }, actions: string[] = []): void {
    if (!this.socket || !this.isConnected) return;

    const input: PlayerInput = {
      timestamp: Date.now(),
      sequenceNumber: this.inputSequence++,
      mousePosition,
      actions
    };

    // Store in pending inputs for reconciliation
    this.pendingInputs.set(input.sequenceNumber!, input);

    // Limit buffer size to prevent memory leak
    if (this.pendingInputs.size > 100) {
      const oldestKey = Array.from(this.pendingInputs.keys())[0];
      this.pendingInputs.delete(oldestKey);
    }

    this.socket.emit('player_input', input);
  }

  // Player actions
  split(): void {
    this.sendInput({ x: 0, y: 0 }, ['split']);
  }

  ejectMass(): void {
    this.sendInput({ x: 0, y: 0 }, ['eject']);
  }

  playerReady(): void {
    this.socket?.emit('player_ready');
  }

  // Generic method to send events to server
  sendToServer(event: string, data?: any): void {
    if (!this.socket) {
      console.warn(`❌ [SOCKET_SERVICE] Cannot send '${event}' - socket not initialized`);
      return;
    }

    if (!this.isConnected) {
      console.warn(`❌ [SOCKET_SERVICE] Cannot send '${event}' - not connected`);
      return;
    }

    console.log(`📤 [SOCKET_SERVICE] Sending '${event}' to server`, data);
    this.socket.emit(event, data);
  }

  // Getters
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton - only one instance for entire app
let _socketServiceInstance: SocketService | null = null;

export const getSocketService = (): SocketService => {
  if (!_socketServiceInstance) {
    _socketServiceInstance = new SocketService();
  }
  return _socketServiceInstance;
};

// Export singleton for backward compatibility
export const socketService = getSocketService();

// Remove createSocketService to prevent multiple instances
// Use getSocketService() instead