import { Server, Socket } from 'socket.io';
import { GlobalRoomManager } from '../services/GlobalRoomManager';
import type { PlayerInput } from 'shared';
import { GameService } from '../services/GameService';
import { GameContractService } from '../services/GameContractService';
// import { BlockchainService } from '../services/BlockchainService'; // Conditionally imported
import { StatsService } from '../services/StatsService';

export async function setupGlobalGameSocket(
  io: Server,
  gameService: GameService,
  blockchainService: any, // Make blockchain service optional for demo mode
  statsService: StatsService,
  gameContractService: GameContractService | null = null
): Promise<{ cleanup: () => void }> {
  const globalRoomManager = new GlobalRoomManager(
    io,
    gameService,
    blockchainService,
    statsService,
    gameContractService
  );
  
  // Initialize the global room manager
  await globalRoomManager.initialize();

  // Handle new connections
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 [CONNECTION] Player connected: ${socket.id} (Total: ${io.sockets.sockets.size})`);

    // Handle join global room request (FREE - no payment required)
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

    // Handle join with payment (PAID - requires STX payment)
    socket.on('join_with_payment', async (data: {
      walletAddress: string;
      txId: string;
      entryFee: number;
    }) => {
      console.log(`💰 [JOIN_WITH_PAYMENT] Player ${socket.id} joining with payment`);
      console.log(`💰 Wallet: ${data.walletAddress}, TxID: ${data.txId}, Fee: ${data.entryFee} STX`);

      try {
        // CRITICAL: Check blockchain game status FIRST
        const gameStatus = globalRoomManager.getBlockchainGameStatus();
        console.log(`🎮 [JOIN_WITH_PAYMENT] Current blockchain game status: ${gameStatus}`);

        if (gameStatus === 'active') {
          console.warn(`⚠️ [JOIN_WITH_PAYMENT] Game is ACTIVE - rejecting join attempt`);
          socket.emit('join_error', {
            message: 'Game in progress. Please wait for the next round.',
            code: 'GAME_IN_PROGRESS'
          });
          return;
        }

        if (gameStatus === 'finished') {
          console.warn(`⚠️ [JOIN_WITH_PAYMENT] Game is FINISHED - rejecting join attempt`);
          socket.emit('join_error', {
            message: 'Round has ended. New round starting soon...',
            code: 'ROUND_ENDED'
          });
          return;
        }

        // Verify transaction on blockchain
        if (!blockchainService) {
          throw new Error('Blockchain service not available');
        }

        // Check if transaction exists and is confirmed
        console.log(`🔍 Verifying transaction ${data.txId}...`);
        const txValid = await blockchainService.verifyTransaction(data.txId);

        if (!txValid) {
          console.error(`❌ Transaction ${data.txId} verification failed`);
          socket.emit('join_error', {
            message: 'Payment verification failed. Please try again or contact support.',
            code: 'PAYMENT_VERIFICATION_FAILED'
          });
          return;
        }

        console.log(`✅ Transaction ${data.txId} verified successfully`);

        // Transaction verified - allow player to join
        await globalRoomManager.handlePlayerJoin(socket, {
          walletAddress: data.walletAddress
        });

        // Send payment success event
        socket.emit('payment_verified', {
          txId: data.txId,
          entryFee: data.entryFee,
          message: 'Payment verified successfully'
        });

        console.log(`🎉 Player ${socket.id} joined with verified payment`);

      } catch (error) {
        console.error(`❌ Error processing paid join for ${socket.id}:`, error);
        socket.emit('join_error', {
          message: error instanceof Error ? error.message : 'Failed to process payment. Please try again.',
          code: 'PAYMENT_PROCESSING_ERROR'
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

    // Handle respawn request (both event names for compatibility)
    const handleRespawn = () => {
      try {
        console.log(`🔄 Player ${socket.id} requested respawn`);

        // Force respawn the player
        globalRoomManager.respawnPlayer(socket.id);

        socket.emit('respawn_acknowledged', {
          message: 'Respawning...'
        });
      } catch (error) {
        console.error('Error handling respawn:', error);
        socket.emit('respawn_error', {
          message: 'Failed to respawn. Please try again.'
        });
      }
    };

    socket.on('request_respawn', handleRespawn);
    socket.on('respawn_request', handleRespawn); // Support both event names

    // Handle room status request
    socket.on('get_room_status', () => {
      try {
        const status = globalRoomManager.getRoomStats();
        socket.emit('room_status', status);
      } catch (error) {
        console.error('Error getting room status:', error);
      }
    });

    // Handle contract game ID request
    socket.on('get_contract_game_id', () => {
      try {
        const contractGameId = globalRoomManager.getContractGameId();
        socket.emit('contract_game_id', { contractGameId });
        console.log(`📤 Sent contract game ID ${contractGameId} to ${socket.id}`);
      } catch (error) {
        console.error('Error getting contract game ID:', error);
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

    // Handle explicit leave game (when returning to lobby)
    socket.on('leave_game', (data) => {
      console.log(`👋 [LEAVE_GAME] Player leaving game: ${socket.id}`);

      try {
        // Clean up player from game but keep socket connection
        globalRoomManager.handlePlayerLeave(socket);

        // Notify client that they've successfully left
        socket.emit('left_game', {
          success: true,
          timestamp: Date.now()
        });

        console.log(`✅ [LEAVE_GAME] Player ${socket.id} successfully removed from game`);
      } catch (error) {
        console.error('❌ [LEAVE_GAME] Error handling leave game:', error);
        socket.emit('left_game', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
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

    // Send initial room status including contract game ID
    setTimeout(() => {
      const status = globalRoomManager.getRoomStats();
      const contractGameId = globalRoomManager.getContractGameId();
      socket.emit('initial_room_status', { ...status, contractGameId });
      console.log(`📤 [INIT] Sent initial status with contractGameId: ${contractGameId} to ${socket.id}`);
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