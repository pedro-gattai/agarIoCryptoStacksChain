import { Server, Socket } from 'socket.io';
import type { 
  GlobalGameRoom, 
  PlayerConnection,
  Position,
  PlayerInput
} from 'shared';
import { GameService } from './GameService';
import { BlockchainService } from './BlockchainService';
import { StatsService } from './StatsService';
import { RoomService } from './room/RoomService';
import { BotService } from './bot/BotService';
import { QueueService } from './queue/QueueService';
import { GameLoopService } from './game/GameLoopService';

export class GlobalRoomManager {
  private io: Server;
  private gameService: GameService;
  private blockchainService: BlockchainService;
  private statsService: StatsService;
  
  // Refactored services
  private roomService: RoomService;
  private botService: BotService;
  private queueService: QueueService;
  private gameLoopService: GameLoopService;
  
  // Management intervals
  private botManagementInterval: NodeJS.Timeout | null = null;
  private queueProcessorInterval: NodeJS.Timeout | null = null;
  private broadcastInterval: NodeJS.Timeout | null = null;

  constructor(
    io: Server,
    gameService: GameService,
    blockchainService: BlockchainService,
    statsService: StatsService
  ) {
    this.io = io;
    this.gameService = gameService;
    this.blockchainService = blockchainService;
    this.statsService = statsService;

    // Initialize services
    this.roomService = new RoomService(gameService);
    this.botService = new BotService();
    this.queueService = new QueueService();
    this.gameLoopService = new GameLoopService(this.roomService, this.botService);
  }

  public async initialize(): Promise<void> {
    console.log('🌍 [GLOBAL_ROOM_MANAGER] Initializing...');
    
    try {
      // Initialize room
      await this.roomService.initializeGlobalRoom();
      
      // Start services
      this.startGameLoop();
      this.startBotManagement();
      this.startQueueProcessor();
      this.startBroadcastStats();
      
      console.log('✅ [GLOBAL_ROOM_MANAGER] Initialized successfully');
      
    } catch (error) {
      console.error('❌ [GLOBAL_ROOM_MANAGER] Failed to initialize:', error);
      throw error;
    }
  }

  public async handlePlayerJoin(socket: Socket, data: { walletAddress?: string }): Promise<void> {
    const playerId = socket.id;
    
    try {
      console.log(`🌐 [JOIN_GLOBAL_ROOM] Player ${playerId} requesting to join with wallet: ${data.walletAddress}`);
      
      // Create player connection
      const playerConnection: PlayerConnection = {
        socketId: socket.id,
        playerId,
        walletAddress: data.walletAddress,
        isInGame: true,
        isReady: false,
        lastSeen: new Date(),
        position: this.roomService.generateRandomPosition(),
        inputBuffer: [],
        joinedAt: new Date(),
        isBot: false
      };

      // Try to add player directly or queue them
      if (!this.roomService.isRoomFull()) {
        this.addPlayerToRoom(playerConnection, socket);
        
        // Emit success events
        const roomStats = this.roomService.getRoomStats();
        
        socket.emit('join_success', {
          message: 'Successfully joined global room',
          roomStatus: {
            playersOnline: roomStats.realPlayers,
            maxPlayers: roomStats.maxPlayers,
            queueLength: 0,
            status: 'active',
            uptime: this.getUptime()
          }
        });

        socket.emit('global_room_joined', {
          roomId: 'global_room',
          position: playerConnection.position,
          playersOnline: roomStats.realPlayers,
          maxPlayers: roomStats.maxPlayers
        });

        console.log(`🎉 Player ${playerId} successfully joined global room`);
        
      } else {
        // Add to queue
        const queueStatus = this.queueService.addPlayerToQueue(playerConnection);
        
        socket.emit('join_queued', {
          message: `Added to queue at position ${queueStatus.position}`,
          queueStatus,
          roomStatus: {
            playersOnline: this.roomService.getRealPlayersCount(),
            maxPlayers: 100,
            queueLength: this.queueService.getQueueLength(),
            status: 'active',
            uptime: this.getUptime()
          }
        });

        console.log(`📥 Player ${playerId} added to queue at position ${queueStatus.position}`);
      }
      
    } catch (error) {
      console.error(`❌ Error handling player join for ${playerId}:`, error);
      
      socket.emit('join_error', {
        message: 'Failed to join global room. Please try again.'
      });
    }
  }

  public handlePlayerLeave(socket: Socket): void {
    const playerId = socket.id;
    
    try {
      // Remove from room if present
      const removedPlayer = this.roomService.removePlayerFromRoom(playerId);
      
      if (removedPlayer) {
        const roomStats = this.roomService.getRoomStats();
        console.log(`👋 Player ${playerId} left global room (${roomStats.realPlayers}/${roomStats.maxPlayers})`);
        
        // Process queue to fill the spot
        this.processQueue();
      }
      
      // Remove from queue if present
      this.queueService.removePlayerFromQueue(playerId);
      
    } catch (error) {
      console.error(`❌ Error handling player leave for ${playerId}:`, error);
    }
  }

  public handlePlayerInput(socket: Socket, input: PlayerInput): void {
    const playerId = socket.id;
    
    try {
      // Add timestamp and sequence number if missing
      const processedInput: PlayerInput = {
        ...input,
        playerId,
        timestamp: input.timestamp || Date.now(),
        sequenceNumber: input.sequenceNumber || 0
      };

      // Add to game loop for processing
      this.gameLoopService.addPlayerInput(playerId, processedInput);
      
    } catch (error) {
      console.error(`❌ Error handling player input for ${playerId}:`, error);
    }
  }

  private addPlayerToRoom(player: PlayerConnection, socket: Socket): void {
    this.roomService.addPlayerToRoom(player, socket);
    
    const roomStats = this.roomService.getRoomStats();
    console.log(`👤 Player ${player.playerId} joined global room (${roomStats.realPlayers}/${roomStats.maxPlayers})`);
  }

  private startGameLoop(): void {
    this.gameLoopService.startGameLoop();
  }

  private startBotManagement(): void {
    this.botManagementInterval = setInterval(() => {
      this.manageBots();
    }, 10000); // Check every 10 seconds
  }

  private startQueueProcessor(): void {
    this.queueProcessorInterval = setInterval(() => {
      this.processQueue();
      this.queueService.cleanupQueue();
    }, 1000); // Process every second
  }

  private startBroadcastStats(): void {
    console.log('📡 Starting stats broadcast service...');
    this.broadcastInterval = setInterval(() => {
      try {
        const status = this.roomService.getRoomStats();
        this.io.emit('global_room_stats', {
          playersOnline: status.realPlayers,
          maxPlayers: status.maxPlayers,
          queueLength: status.queueLength,
          uptime: Math.floor((Date.now() - new Date().getTime()) / 1000)
        });
      } catch (error) {
        console.error('❌ Error broadcasting stats:', error);
      }
    }, 10000); // Broadcast every 10 seconds
  }

  private manageBots(): void {
    const roomStats = this.roomService.getRoomStats();
    
    // Spawn bots if needed
    if (this.botService.shouldSpawnBots(roomStats.realPlayers, roomStats.bots)) {
      const botsToSpawn = Math.min(3, 10 - roomStats.totalPlayers); // Spawn up to 3 at a time
      
      for (let i = 0; i < botsToSpawn; i++) {
        const bot = this.botService.createBot();
        this.roomService.addPlayerToRoom(bot, null);
        
        console.log(`🤖 Bot ${bot.playerId} spawned (${roomStats.bots + i + 1} bots, ${roomStats.realPlayers} real players)`);
      }
    }
    
    // Despawn bots if needed
    else if (this.botService.shouldDespawnBots(roomStats.realPlayers, roomStats.bots)) {
      const globalRoom = this.roomService.getGlobalRoom();
      const bots = Array.from(globalRoom.players.values()).filter(p => p.isBot);
      
      const botsToRemove = Math.min(2, bots.length); // Remove up to 2 at a time
      
      for (let i = 0; i < botsToRemove; i++) {
        const bot = bots[i];
        this.roomService.removePlayerFromRoom(bot.playerId);
        console.log(`🗑️ Bot ${bot.playerId} removed (${roomStats.bots - i - 1} bots remaining)`);
      }
    }
  }

  private processQueue(): void {
    this.queueService.processQueue(
      () => !this.roomService.isRoomFull(),
      (player) => {
        const socket = this.roomService.getPlayerSocket(player.playerId);
        if (socket) {
          this.addPlayerToRoom(player, socket);
          
          socket.emit('join_success', {
            message: 'Successfully joined global room from queue',
            roomStatus: {
              playersOnline: this.roomService.getRealPlayersCount(),
              maxPlayers: 100,
              queueLength: this.queueService.getQueueLength(),
              status: 'active',
              uptime: this.getUptime()
            }
          });
        }
      }
    );
  }

  private getUptime(): number {
    return Date.now(); // Simplified uptime
  }

  public cleanup(): void {
    console.log('🧹 [GLOBAL_ROOM_MANAGER] Cleaning up...');
    
    // Stop game loop
    this.gameLoopService.stopGameLoop();
    
    // Clear all intervals
    if (this.botManagementInterval) {
      clearInterval(this.botManagementInterval);
      this.botManagementInterval = null;
      console.log('🔄 Bot management interval cleared');
    }
    
    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval);
      this.queueProcessorInterval = null;
      console.log('🔄 Queue processor interval cleared');
    }
    
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
      console.log('🔄 Broadcast stats interval cleared');
    }
    
    console.log('✅ [GLOBAL_ROOM_MANAGER] Cleanup completed');
  }

  public getRoomStats() {
    return this.roomService.getRoomStats();
  }

  public getGlobalRoom(): GlobalGameRoom {
    return this.roomService.getGlobalRoom();
  }
}