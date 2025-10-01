import { Server, Socket } from 'socket.io';
import { GameService } from '../services/GameService';
import { BlockchainService } from '../services/BlockchainService';
import { StatsService } from '../services/StatsService';
import { GameRoomManager, PlayerInput } from '../services/GameRoomManager';

export function setupSocketHandlers(
  io: Server, 
  gameService: GameService, 
  blockchainService: BlockchainService,
  statsService: StatsService
) {
  // Initialize room manager
  const roomManager = new GameRoomManager(io, gameService, blockchainService, statsService);
  
  io.on('connection', (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Send available rooms to new player
    socket.emit('rooms_list', roomManager.getAvailableRooms());

    // Join an existing room
    socket.on('join_room', async (data: { roomId: string; walletAddress?: string }) => {
      try {
        const result = await roomManager.joinRoom(socket, data.roomId, data.walletAddress);
        
        if (result.success) {
          socket.emit('room_joined', {
            roomId: data.roomId,
            room: result.room,
            playerId: socket.id
          });
        } else {
          socket.emit('error', { message: result.error });
        }
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Create a new room
    socket.on('create_room', async (data: { entryFee: number; maxPlayers?: number }) => {
      try {
        const { entryFee, maxPlayers = 10 } = data;
        
        const isValidFee = await blockchainService.validateEntryFee(entryFee);
        if (!isValidFee) {
          socket.emit('error', { message: 'Invalid entry fee' });
          return;
        }

        const room = roomManager.createRoom(entryFee, maxPlayers);
        
        socket.emit('room_created', room);
        
        // Broadcast new room to all clients
        io.emit('new_room_available', room);
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('error', { message: 'Failed to create room' });
      }
    });

    // Handle player input (movement, actions)
    socket.on('player_input', (input: PlayerInput) => {
      roomManager.handlePlayerInput(socket, input);
    });

    // Get available rooms
    socket.on('get_rooms', () => {
      socket.emit('rooms_list', roomManager.getAvailableRooms());
    });

    // Player ready (for game start)
    socket.on('player_ready', () => {
      const room = roomManager.getPlayerRoom(socket.id);
      if (room) {
        const player = room.players.get(socket.id);
        if (player) {
          player.isReady = true;
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      
      // Handle player leaving room
      roomManager.leaveRoom(socket);
    });
  });

  // Cleanup room manager on shutdown
  process.on('SIGINT', () => {
    roomManager.destroy();
    process.exit(0);
  });
}