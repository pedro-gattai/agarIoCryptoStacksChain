import { Server, Socket } from 'socket.io';
import { GameService } from './GameService';
import { BlockchainService } from './BlockchainService';
import { StatsService } from './StatsService';

export interface GameRoom {
  id: string;
  gameId: string;
  players: Map<string, PlayerConnection>;
  maxPlayers: number;
  entryFee: number;
  status: 'waiting' | 'starting' | 'active' | 'finished';
  createdAt: Date;
}

export interface PlayerConnection {
  socketId: string;
  playerId: string;
  walletAddress?: string;
  isReady: boolean;
  lastSeen: Date;
  position: { x: number; y: number };
  inputBuffer: PlayerInput[];
}

export interface PlayerInput {
  timestamp: number;
  sequenceNumber: number;
  mousePosition: { x: number; y: number };
  actions: string[];
}

export class GameRoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerToRoom: Map<string, string> = new Map();
  private gameService: GameService;
  private blockchainService: BlockchainService;
  private statsService: StatsService;
  private io: Server;
  
  // Game tick rate (server updates per second)
  private readonly TICK_RATE = 30;
  private readonly TICK_INTERVAL = 1000 / this.TICK_RATE;
  
  private gameLoopInterval: NodeJS.Timeout | null = null;

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
    
    this.startGameLoop();
    this.startCleanupTask();
  }

  createRoom(entryFee: number, maxPlayers: number = 10): GameRoom {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const room: GameRoom = {
      id: roomId,
      gameId,
      players: new Map(),
      maxPlayers,
      entryFee,
      status: 'waiting',
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);
    
    // Create game instance
    this.gameService.createGame(entryFee, maxPlayers);
    
    return room;
  }

  async joinRoom(
    socket: Socket, 
    roomId: string, 
    walletAddress?: string
  ): Promise<{ success: boolean; error?: string; room?: GameRoom }> {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'Game already started' };
    }

    if (room.players.size >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    // Validate wallet balance if provided
    if (walletAddress) {
      const balance = await this.blockchainService.getWalletBalance(walletAddress);
      if (balance < room.entryFee) {
        return { success: false, error: 'Insufficient balance' };
      }
    }

    // Remove player from previous room if exists
    const existingRoomId = this.playerToRoom.get(socket.id);
    if (existingRoomId) {
      this.leaveRoom(socket);
    }

    const playerConnection: PlayerConnection = {
      socketId: socket.id,
      playerId: socket.id,
      walletAddress,
      isReady: false,
      lastSeen: new Date(),
      position: { x: 0, y: 0 },
      inputBuffer: []
    };

    // Add player to room
    room.players.set(socket.id, playerConnection);
    this.playerToRoom.set(socket.id, roomId);
    
    // Join socket room
    socket.join(roomId);
    
    // Add player to game
    const spawnPosition = this.getRandomSpawnPosition();
    const playerColor = this.getRandomColor();
    
    this.gameService.addPlayer(
      room.gameId, 
      socket.id, 
      walletAddress || 'anonymous',
      spawnPosition,
      playerColor
    );

    playerConnection.position = spawnPosition;

    // Notify room
    this.io.to(roomId).emit('player_joined', {
      playerId: socket.id,
      walletAddress,
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers
    });

    // Auto-start if room is full
    if (room.players.size >= room.maxPlayers) {
      this.startGame(roomId);
    }

    return { success: true, room };
  }

  leaveRoom(socket: Socket): void {
    const roomId = this.playerToRoom.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Remove player from room
    room.players.delete(socket.id);
    this.playerToRoom.delete(socket.id);
    
    // Leave socket room
    socket.leave(roomId);
    
    // Remove player from game
    // this.gameService.removePlayer(room.gameId, socket.id);

    // Notify room
    this.io.to(roomId).emit('player_left', {
      playerId: socket.id,
      playerCount: room.players.size
    });

    // Delete room if empty
    if (room.players.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  handlePlayerInput(socket: Socket, input: PlayerInput): void {
    const roomId = this.playerToRoom.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'active') return;

    const player = room.players.get(socket.id);
    if (!player) return;

    // Update last seen
    player.lastSeen = new Date();
    
    // Store input in buffer for server reconciliation
    player.inputBuffer.push(input);
    
    // Keep buffer size manageable
    if (player.inputBuffer.length > 60) { // 2 seconds at 30 FPS
      player.inputBuffer = player.inputBuffer.slice(-30);
    }

    // Update player position in game
    this.gameService.updatePlayerPosition(
      room.gameId,
      socket.id,
      input.mousePosition
    );
    
    player.position = input.mousePosition;

    // Handle actions
    input.actions.forEach(action => {
      switch (action) {
        case 'split':
          // this.gameService.splitPlayer(room.gameId, socket.id);
          break;
        case 'eject':
          // this.gameService.ejectMass(room.gameId, socket.id);
          break;
      }
    });
  }

  private startGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting') return;

    room.status = 'starting';
    
    // Notify players
    this.io.to(roomId).emit('game_starting', {
      countdown: 3
    });

    // Start countdown
    setTimeout(() => {
      room.status = 'active';
      
      // Start game instance
      this.gameService.startGame(room.gameId);
      
      this.io.to(roomId).emit('game_started', {
        gameId: room.gameId
      });
    }, 3000);
  }

  private startGameLoop(): void {
    this.gameLoopInterval = setInterval(() => {
      this.rooms.forEach(room => {
        if (room.status === 'active') {
          this.updateRoom(room);
        }
      });
    }, this.TICK_INTERVAL);
  }

  private updateRoom(room: GameRoom): void {
    // Get game state from service
    const gameState = this.gameService.getGame(room.gameId);
    if (!gameState) return;

    // Prepare update for clients
    const update = {
      timestamp: Date.now(),
      players: Array.from(room.players.values()).map(p => ({
        id: p.playerId,
        position: p.position,
        // Add other game state from GameService
      })),
      gameState: {
        pellets: gameState.pellets,
        // Add other relevant state
      }
    };

    // Send update to all players in room
    this.io.to(room.id).emit('game_update', update);
  }

  private startCleanupTask(): void {
    // Clean up inactive players every 30 seconds
    setInterval(() => {
      const now = new Date();
      const timeout = 30 * 1000; // 30 seconds

      this.rooms.forEach(room => {
        const playersToRemove: string[] = [];
        
        room.players.forEach((player, socketId) => {
          if (now.getTime() - player.lastSeen.getTime() > timeout) {
            playersToRemove.push(socketId);
          }
        });

        playersToRemove.forEach(socketId => {
          room.players.delete(socketId);
          this.playerToRoom.delete(socketId);
          
          this.io.to(room.id).emit('player_left', {
            playerId: socketId,
            playerCount: room.players.size
          });
        });

        // Delete empty rooms
        if (room.players.size === 0) {
          this.rooms.delete(room.id);
        }
      });
    }, 30000);
  }

  // Helper methods
  private getRandomSpawnPosition(): { x: number; y: number } {
    return {
      x: Math.random() * 2800 + 100, // Keep away from edges
      y: Math.random() * 2800 + 100
    };
  }

  private getRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#FFB347', '#87CEEB', '#F0E68C'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Public getters
  getRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }

  getAvailableRooms(): GameRoom[] {
    return Array.from(this.rooms.values()).filter(
      room => room.status === 'waiting' && room.players.size < room.maxPlayers
    );
  }

  getPlayerRoom(socketId: string): GameRoom | null {
    const roomId = this.playerToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) || null : null;
  }

  // Cleanup
  destroy(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }
  }
}