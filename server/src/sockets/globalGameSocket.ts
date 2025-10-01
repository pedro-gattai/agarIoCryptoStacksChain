import { Server, Socket } from 'socket.io';
import { GlobalRoomManager } from '../services/GlobalRoomManager';
import type { PlayerInput } from 'shared';
import { GameService } from '../services/GameService';
import { BlockchainService } from '../services/BlockchainService';
import { StatsService } from '../services/StatsService';

export async function setupGlobalGameSocket(
  io: Server,
  gameService: GameService,
  blockchainService: BlockchainService,
  statsService: StatsService
): Promise<{ cleanup: () => void }> {
  const globalRoomManager = new GlobalRoomManager(io, gameService, blockchainService, statsService);
  
  // Initialize the global room manager
  await globalRoomManager.initialize();

  // Handle new connections
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 [CONNECTION] Player connected: ${socket.id}`);
    console.log(`🔌 [CONNECTION] Client address: ${socket.handshake.address}`);
    console.log(`🔌 [CONNECTION] Headers:`, socket.handshake.headers);
    console.log(`🔌 [CONNECTION] Total connected clients: ${io.sockets.sockets.size}`);

    // Handle join global room request
    socket.on('join_global_room', async (data: { walletAddress?: string }) => {
      console.log(`🌐 [JOIN_GLOBAL_ROOM] Player ${socket.id} requesting to join with wallet:`, data.walletAddress);
      
      try {
        await globalRoomManager.handlePlayerJoin(socket, data);
        
        console.log(`🎉 Player ${socket.id} join request processed`);
      } catch (error) {
        console.error(`❌ Error joining global room for ${socket.id}:`, error);
        socket.emit('join_error', {
          message: 'Failed to join game. Please try again.'
        });
      }
    });

    // Handle player input
    socket.on('player_input', (input: PlayerInput) => {
      try {
        globalRoomManager.handlePlayerInput(socket, input);
      } catch (error) {
        console.error('Error handling player input:', error);
      }
    });

    // Handle player actions
    socket.on('player_split', () => {
      try {
        globalRoomManager.handlePlayerInput(socket, {
          timestamp: Date.now(),
          sequenceNumber: 0,
          mousePosition: { x: 0, y: 0 },
          actions: ['split']
        });
      } catch (error) {
        console.error('Error handling player split:', error);
      }
    });

    socket.on('player_eject', () => {
      try {
        globalRoomManager.handlePlayerInput(socket, {
          timestamp: Date.now(),
          sequenceNumber: 0,
          mousePosition: { x: 0, y: 0 },
          actions: ['eject']
        });
      } catch (error) {
        console.error('Error handling player eject:', error);
      }
    });

    // Handle respawn request
    socket.on('request_respawn', () => {
      try {
        console.log(`🔄 Player ${socket.id} requested respawn`);
        socket.emit('respawn_denied', {
          message: 'Respawn not available yet. Please wait.'
        });
      } catch (error) {
        console.error('Error handling respawn:', error);
      }
    });

    // Handle room status request
    socket.on('get_room_status', () => {
      try {
        const status = globalRoomManager.getRoomStats();
        socket.emit('room_status', status);
      } catch (error) {
        console.error('Error getting room status:', error);
      }
    });

    // Handle player ready (for queue)
    socket.on('player_ready', () => {
      // Player is ready to join when a spot opens up
      // This is mainly for queue management
      socket.emit('ready_acknowledged', {
        message: 'You will be notified when a spot opens up!'
      });
    });

    // Legacy compatibility - redirect old room creation to global room
    socket.on('create_room', (data: { entryFee?: number; maxPlayers?: number }) => {
      socket.emit('redirect_to_global', {
        message: 'All games now use the global room! Redirecting...'
      });
      
      // Auto-join global room
      setTimeout(() => {
        socket.emit('join_global_room', {});
      }, 1000);
    });

    // Legacy compatibility - redirect old room joining to global room
    socket.on('join_room', (data: { roomId?: string; walletAddress?: string }) => {
      socket.emit('redirect_to_global', {
        message: 'All games now use the global room! Redirecting...'
      });
      
      // Auto-join global room
      setTimeout(() => {
        socket.emit('join_global_room', { walletAddress: data.walletAddress });
      }, 1000);
    });

    // Handle get_rooms request (legacy)
    socket.on('get_rooms', () => {
      const status = globalRoomManager.getRoomStats();
      socket.emit('rooms_list', [{
        id: 'global_room',
        gameId: 'global_game',
        maxPlayers: status.maxPlayers,
        playerCount: status.realPlayers,
        entryFee: 0.01,
        status: status.realPlayers < status.maxPlayers ? 'waiting' : 'active',
        createdAt: new Date().toISOString(),
        isGlobal: true,
        queueLength: status.queueLength
      }]);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 [DISCONNECT] Player disconnected: ${socket.id} (${reason})`);
      console.log(`🔌 [DISCONNECT] Remaining clients: ${io.sockets.sockets.size - 1}`);
      
      try {
        globalRoomManager.handlePlayerLeave(socket);
      } catch (error) {
        console.error('❌ [DISCONNECT] Error handling disconnection:', error);
      }
    });

    // Send initial room status
    setTimeout(() => {
      const status = globalRoomManager.getRoomStats();
      socket.emit('initial_room_status', status);
    }, 1000);
  });

  // Room statistics are now broadcast from within GlobalRoomManager

  console.log('🌍 Global Game Socket initialized successfully!');
  
  // Return cleanup function
  return {
    cleanup: () => {
      console.log('🧹 [SOCKET] Cleaning up Socket.IO connections...');
      globalRoomManager.cleanup();
      // Close all socket connections
      io.close();
      console.log('✅ [SOCKET] Socket.IO cleanup completed');
    }
  };
}