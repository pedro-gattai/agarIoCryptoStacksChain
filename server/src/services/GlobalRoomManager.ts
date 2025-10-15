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
import { GameContractService } from './GameContractService';
import { RoomService } from './room/RoomService';
import { BotService } from './bot/BotService';
import { QueueService } from './queue/QueueService';
import { GameLoopService } from './game/GameLoopService';
import { gameSessionRecorder } from './GameSessionRecorder';
import { Logger } from 'shared';

export class GlobalRoomManager {
  private io: Server;
  private gameService: GameService;
  private blockchainService: BlockchainService;
  private statsService: StatsService;
  private gameContractService: GameContractService | null;

  // Refactored services
  private roomService: RoomService;
  private botService: BotService;
  private queueService: QueueService;
  private gameLoopService: GameLoopService;

  // Management intervals
  private botManagementInterval: NodeJS.Timeout | null = null;
  private queueProcessorInterval: NodeJS.Timeout | null = null;
  private broadcastInterval: NodeJS.Timeout | null = null;
  private gameRoundTimer: NodeJS.Timeout | null = null;

  // Game round management
  private readonly ROUND_DURATION = 2 * 60 * 1000; // 2 minutes - faster for testing prize distribution
  private currentRoundStartTime: number = 0;
  private currentGameId: string | null = null;
  private contractGameId: number | null = null;

  // ADDED: start-game delay management
  private startGameTimer: NodeJS.Timeout | null = null;
  private startGameScheduled: boolean = false;
  private readonly START_GAME_DELAY = 30000; // 30 seconds - faster for testing

  constructor(
    io: Server,
    gameService: GameService,
    blockchainService: BlockchainService,
    statsService: StatsService,
    gameContractService: GameContractService | null = null
  ) {
    this.io = io;
    this.gameService = gameService;
    this.blockchainService = blockchainService;
    this.statsService = statsService;
    this.gameContractService = gameContractService;

    // Initialize services
    this.roomService = new RoomService(gameService);
    this.botService = new BotService();
    this.queueService = new QueueService();
    this.gameLoopService = new GameLoopService(this.roomService, this.botService);
  }

  public async initialize(): Promise<void> {
    console.log('🌍 [GLOBAL_ROOM_MANAGER] Initializing...');

    try {
      // FIXED: Set Socket.IO reference in RoomService for broadcasting
      this.roomService.setSocketIO(this.io);

      // Initialize room
      await this.roomService.initializeGlobalRoom();

      // Get the current game ID from room service
      const globalRoom = this.roomService.getGlobalRoom();
      this.currentGameId = globalRoom.gameId;

      // Set gameId in GameLoopService for session recording
      this.gameLoopService.setGameId(this.currentGameId);

      // Initialize contract game pool if blockchain service is available
      // CRITICAL: This is NON-BLOCKING - game works even if blockchain fails
      if (this.gameContractService && this.currentGameId) {
        const authorityKey = process.env.STACKS_PRIVATE_KEY;
        if (authorityKey) {
          const gameContractService = this.gameContractService; // Capture for closure
          const currentGameId = this.currentGameId; // Capture for closure

          // Run blockchain initialization in background - don't block game startup
          (async () => {
            try {
              Logger.info('[GLOBAL_ROOM_MANAGER] 🔗 Creating contract game pool (non-blocking)...');
              const entryFee = parseFloat(process.env.DEFAULT_ENTRY_FEE || '1.0');
              const maxPlayers = 100;

              const gameIntegration = await gameContractService.createGame(
                currentGameId,
                entryFee,
                maxPlayers,
                authorityKey
              );

              this.contractGameId = gameIntegration.contractGameId;
              Logger.info(`[GLOBAL_ROOM_MANAGER] ✅ Contract game pool created with ID: ${this.contractGameId}`);
              Logger.info(`[GLOBAL_ROOM_MANAGER] ⏳ Game status: WAITING - players can join now`);
              Logger.info(`[GLOBAL_ROOM_MANAGER] 🎮 start-game will be called ${this.START_GAME_DELAY / 1000} seconds after first player joins`);

              // REMOVED: Don't call start-game here!
              // We need to allow players to join while status = WAITING
              // start-game will be called after the delay when first player joins
            } catch (error) {
              Logger.error('[GLOBAL_ROOM_MANAGER] ❌ Failed to create contract game pool (continuing anyway):', error);
              // Game works without blockchain - players can still play
            }
          })();
        } else {
          Logger.warn('[GLOBAL_ROOM_MANAGER] No STACKS_PRIVATE_KEY in env, skipping contract initialization');
        }
      }

      // Start game session recording
      if (this.currentGameId) {
        gameSessionRecorder.startSession(this.currentGameId);
        Logger.info(`[GLOBAL_ROOM_MANAGER] Started session recording for game ${this.currentGameId}`);
      }

      // Start services
      this.startGameLoop();
      this.startBotManagement();
      this.startQueueProcessor();
      this.startBroadcastStats();

      // Start game round timer
      this.startGameRound();

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
      
      // IMPROVED: Generate consistent color and name for the player
      const playerColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52D726',
        '#FF4757', '#5F27CD', '#00D2D3', '#FFC312', '#C4E538',
        '#12CBC4', '#FDA7DF', '#ED4C67', '#F79F1F', '#A3CB38'
      ];
      const playerColor = playerColors[Math.floor(Math.random() * playerColors.length)];
      const playerNumber = Math.floor(Math.random() * 9999) + 1;
      const playerName = data.walletAddress ?
        `Player${data.walletAddress.slice(-4)}` :
        `Player${playerNumber}`;

      // Create player connection with color and name
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
        isBot: false,
        // ADDED: Store color and name on the server
        color: playerColor,
        name: playerName
      } as any;

      // Try to add player directly or queue them
      if (!this.roomService.isRoomFull()) {
        this.addPlayerToRoom(playerConnection, socket);

        // Record player join in session
        if (this.currentGameId) {
          gameSessionRecorder.recordPlayerJoin(
            this.currentGameId,
            playerId,
            data.walletAddress
          );
        }

        // IMPROVED: Schedule start-game when we have enough players
        const roomStats = this.roomService.getRoomStats();
        if (!this.startGameScheduled && roomStats.realPlayers >= 1 && this.gameContractService && this.currentGameId) {
          // Schedule on first player, but will wait for 2+ players before actually starting
          this.scheduleStartGame();
        }

        // Emit success events
        
        socket.emit('join_success', {
          message: 'Successfully joined global room',
          contractGameId: this.contractGameId,
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

        // Record player leave in session
        if (this.currentGameId && !removedPlayer.isBot) {
          const game = this.gameService.getGame(this.currentGameId);
          if (game) {
            const gamePlayer = game.players.find(p => p.id === playerId);
            const finalScore = gamePlayer?.score || 0;
            gameSessionRecorder.recordPlayerLeave(this.currentGameId, playerId, finalScore);
          }
        }

        // FIXED: Broadcast to ALL clients that a player left
        // This ensures other clients remove the player from their game
        this.io.emit('player_left', {
          playerId: playerId,
          playersOnline: roomStats.realPlayers,
          isBot: removedPlayer.isBot || false
        });

        console.log(`📡 Broadcasted player_left event for ${playerId} to all clients`);

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
    // FIXED: RoomService now handles broadcasting internally
    // This ensures broadcast happens for ALL players (humans and bots)
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
            contractGameId: this.contractGameId,
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

  /**
   * Start a new game round
   */
  private startGameRound(): void {
    this.currentRoundStartTime = Date.now();

    Logger.info(`[GAME_ROUND] Starting new ${this.ROUND_DURATION / 1000 / 60} minute round`);

    // Notify all players that new round is starting
    this.io.emit('round_started', {
      roundStartTime: this.currentRoundStartTime,
      roundDuration: this.ROUND_DURATION,
      roundEndsAt: this.currentRoundStartTime + this.ROUND_DURATION
    });

    // Set timer to end round
    this.gameRoundTimer = setTimeout(() => {
      this.endGameRound();
    }, this.ROUND_DURATION);
  }

  /**
   * End the current game round and distribute prizes
   */
  private async endGameRound(): Promise<void> {
    try {
      Logger.info('[GAME_ROUND] Round ending...');

      const globalRoom = this.roomService.getGlobalRoom();
      const gameId = this.currentGameId;

      if (!gameId) {
        Logger.warn('[GAME_ROUND] No active game ID, skipping round end');
        this.startNewRound();
        return;
      }

      // Get all players and sort by score
      const { asGamePlayer } = require('shared');
      const allPlayers = Array.from(globalRoom.players.values());
      const realPlayers = allPlayers.filter(p => !p.isBot);

      // Get real players with their scores from the connection state
      const playersWithScores = realPlayers.map(p => {
        const gamePlayer = asGamePlayer(p);
        return {
          id: p.playerId,
          walletAddress: (p as any).walletAddress || null,
          score: gamePlayer.score,
          size: gamePlayer.size,
          isAlive: gamePlayer.isAlive
        };
      }).filter(p => p.score > 0); // Only players who actually played

      // Debug logging
      Logger.info(`[GAME_ROUND] 🎯 Round Summary:`);
      Logger.info(`  - Total players in room: ${globalRoom.players.size}`);
      Logger.info(`  - Real players: ${realPlayers.length}`);
      Logger.info(`  - Players with scores: ${playersWithScores.length}`);

      if (playersWithScores.length === 0) {
        Logger.info('[GAME_ROUND] No real players with scores, skipping prize distribution');
        this.startNewRound();
        return;
      }

      // Sort players by score
      const sortedPlayers = playersWithScores.sort((a, b) => b.score - a.score);

      // Get top 3 winners
      const winners = sortedPlayers.slice(0, 3);

      Logger.info(`[GAME_ROUND] 🏆 Winners: ${winners.map((w, i) =>
        `${i+1}º ${w.id.substring(0, 8)} (${w.score} pts)`).join(', ')}`);

      // End session recording
      const session = gameSessionRecorder.endSession(gameId, winners[0]?.id);

      // Calculate prize distribution (entry fee is 1 STX)
      const entryFee = 1.0; // STX per player
      const totalPrizePool = realPlayers.length * entryFee;
      const houseFee = totalPrizePool * 0.20; // 20% house fee
      const netPrizePool = totalPrizePool - houseFee;

      // IMPROVED: Handle cases with 1, 2, or 3 players
      // Always calculate 3 prizes, but only distribute to winners that exist
      const prizes = [
        netPrizePool * 0.50, // 50% for 1st place
        netPrizePool * 0.30, // 30% for 2nd place
        netPrizePool * 0.20  // 20% for 3rd place
      ];

      Logger.info(`[GAME_ROUND] Prize pool: ${totalPrizePool} STX (${realPlayers.length} players), net: ${netPrizePool} STX after ${houseFee} STX house fee`);

      // Broadcast round end to all players WITH prize information
      this.io.emit('round_ended', {
        winners: winners.map((w, i) => ({
          position: i + 1,
          playerId: w.id,
          walletAddress: w.walletAddress,
          score: w.score,
          prize: prizes[i] || 0
        })),
        totalPlayers: sortedPlayers.length,
        totalPrizePool,
        houseFee,
        netPrizePool,
        sessionHash: session ? gameSessionRecorder.generateSessionHash(gameId) : null
      });

      // Distribute prizes via blockchain (if enabled)
      if (this.gameContractService && winners.length > 0) {
        try {
          Logger.info(`[GAME_ROUND] 💰 Distributing prizes to ${winners.length} winners via blockchain...`);

          // Get winner wallet addresses
          const winnerAddresses = winners
            .filter(w => w.walletAddress)
            .map(w => w.walletAddress!);

          if (winnerAddresses.length > 0) {
            Logger.info(`[GAME_ROUND] Winners with wallets: ${winnerAddresses.join(', ')}`);

            // Use server authority key from env
            const authorityKey = process.env.STACKS_PRIVATE_KEY;

            if (authorityKey && this.contractGameId !== null) {
              const success = await this.gameContractService.endGame(
                gameId,
                winnerAddresses,
                authorityKey
              );

              if (success) {
                Logger.info('[GAME_ROUND] ✅ Prizes distributed successfully on-chain!');
              } else {
                Logger.error('[GAME_ROUND] ❌ Failed to distribute prizes on-chain');
              }
            } else {
              Logger.warn('[GAME_ROUND] Missing authority key or contract game ID');
            }
          } else {
            Logger.warn('[GAME_ROUND] No winners have wallet addresses');
          }
        } catch (error) {
          Logger.error('[GAME_ROUND] ❌ Error distributing prizes:', error);
          // Continue anyway - don't block new round
        }
      }

      // IMPROVED: Kick all players to lobby after showing results
      Logger.info('[GAME_ROUND] Kicking all players to lobby...');

      // Send individual messages to each player with their placement
      for (const [playerId, player] of globalRoom.players) {
        if (!player.isBot) {
          const socket = this.roomService.getPlayerSocket(playerId);
          if (socket) {
            const playerRank = sortedPlayers.findIndex(p => p.id === playerId) + 1;
            const playerScore = sortedPlayers.find(p => p.id === playerId)?.score || 0;
            const playerPrize = playerRank <= 3 ? prizes[playerRank - 1] : 0;

            socket.emit('force_disconnect', {
              reason: 'Round ended - returning to lobby',
              playerRank,
              playerScore,
              playerPrize,
              winners: winners.map((w, i) => ({
                position: i + 1,
                playerId: w.id,
                score: w.score,
                prize: prizes[i] || 0
              }))
            });
          }
        }
      }

      // Remove all real players from the room
      const playerIds = Array.from(globalRoom.players.keys()).filter(pid => {
        const p = globalRoom.players.get(pid);
        return p && !p.isBot;
      });

      for (const playerId of playerIds) {
        this.roomService.removePlayerFromRoom(playerId);
      }

      Logger.info(`[GAME_ROUND] Kicked ${playerIds.length} players to lobby`);

      // Wait a bit before starting new round
      setTimeout(() => {
        this.startNewRound();
      }, 5000); // 5 second pause between rounds

    } catch (error) {
      Logger.error('[GAME_ROUND] Error ending round:', error);
      // Start new round anyway to keep game going
      this.startNewRound();
    }
  }

  /**
   * Start a new round after previous one ended
   * IMPROVED: Reset game state WITHOUT destroying room or disconnecting players
   */
  private async startNewRound(): Promise<void> {
    try {
      Logger.info('[GAME_ROUND] Starting new round...');
      Logger.info('[GAME_ROUND] ⚠️ KEEPING existing room and players connected');

      // Clear old game session
      if (this.currentGameId) {
        gameSessionRecorder.clearSession(this.currentGameId);
      }

      // FIXED: Don't destroy room! Just reset game state
      // Keep: currentGameId, contractGameId, and player connections
      // Reset: player positions, scores (via game loop), pellets

      const globalRoom = this.roomService.getGlobalRoom();
      const game = this.gameService.getGame(this.currentGameId!);

      if (game) {
        const { GAMEPLAY_CONSTANTS, asGamePlayer } = require('shared');

        Logger.info(`[GAME_ROUND] Resetting game for new round (${globalRoom.players.size} players connected)...`);

        // Remove all split cells from the room
        const splitCellsToRemove: string[] = [];
        for (const [playerId, player] of globalRoom.players) {
          if ((player as any).isSplitCell) {
            splitCellsToRemove.push(playerId);
          }
        }

        for (const splitId of splitCellsToRemove) {
          globalRoom.players.delete(splitId);
        }

        Logger.info(`[GAME_ROUND] Removed ${splitCellsToRemove.length} split cells`);

        // Reset all players in the room connections
        for (const [playerId, player] of globalRoom.players) {
          const gamePlayer = asGamePlayer(player);

          // Reset game stats
          gamePlayer.isAlive = true;
          gamePlayer.score = 0;
          gamePlayer.size = GAMEPLAY_CONSTANTS.PLAYER.INITIAL_SIZE;
          gamePlayer.mass = (gamePlayer.size * gamePlayer.size) / 100;

          // Generate new random position
          const newPosition = this.roomService.generateRandomPosition();
          player.position = newPosition;

          Logger.debug(`[GAME_ROUND] Reset player ${playerId}: pos=(${Math.floor(newPosition.x)}, ${Math.floor(newPosition.y)}), size=${gamePlayer.size}`);
        }

        // Pellets will be automatically regenerated by the game loop's PelletService
        // No manual action needed - the regeneratePellets() method runs every tick

        Logger.info(`[GAME_ROUND] ✅ Round reset complete - players reset, pellets will regenerate automatically`);
      }

      // Start new session recording (reuse same gameId)
      if (this.currentGameId) {
        gameSessionRecorder.startSession(this.currentGameId);
        Logger.info(`[GAME_ROUND] Started session recording for continuing game ${this.currentGameId}`);
      }

      // ADDED: Reset start-game scheduling flag for new round
      this.startGameScheduled = false;
      if (this.startGameTimer) {
        clearTimeout(this.startGameTimer);
        this.startGameTimer = null;
      }
      Logger.info('[GAME_ROUND] Reset start-game scheduling for new round');

      // Notify all players that new round started
      this.io.emit('round_reset', {
        message: 'New round starting! All players reset.',
        gameId: this.currentGameId,
        contractGameId: this.contractGameId
      });

      // Start new round timer
      this.startGameRound();

    } catch (error) {
      Logger.error('[GAME_ROUND] Error starting new round:', error);
    }
  }

  /**
   * Helper: Get random pellet color
   */
  private getRandomPelletColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52D726'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Schedule start-game call after a delay when the first player joins
   * This allows multiple players to join while status = WAITING
   * Current delay: 2 minutes to maximize player participation
   */
  private scheduleStartGame(): void {
    if (this.startGameScheduled) {
      Logger.warn('[GLOBAL_ROOM_MANAGER] start-game already scheduled, skipping');
      return;
    }

    this.startGameScheduled = true;

    Logger.info(`[GLOBAL_ROOM_MANAGER] ⏰ First player joined! start-game will be called in ${this.START_GAME_DELAY / 1000} seconds...`);
    Logger.info('[GLOBAL_ROOM_MANAGER] 🎮 Players can join now while status = WAITING');

    // Broadcast to all clients that game will start soon
    this.io.emit('game_starting_soon', {
      message: `Game starts in ${Math.round(this.START_GAME_DELAY / 1000)} seconds! Join now to participate!`,
      startsIn: this.START_GAME_DELAY,
      startsAt: Date.now() + this.START_GAME_DELAY
    });

    this.startGameTimer = setTimeout(async () => {
      try {
        if (!this.gameContractService || !this.currentGameId) {
          Logger.warn('[GLOBAL_ROOM_MANAGER] Cannot start game - missing contract service or game ID');
          return;
        }

        const authorityKey = process.env.STACKS_PRIVATE_KEY;
        if (!authorityKey) {
          Logger.warn('[GLOBAL_ROOM_MANAGER] Cannot start game - missing authority key');
          return;
        }

        Logger.info(`[GLOBAL_ROOM_MANAGER] ⏰ ${this.START_GAME_DELAY / 1000} seconds elapsed, calling start-game on blockchain...`);

        const roomStats = this.roomService.getRoomStats();
        Logger.info(`[GLOBAL_ROOM_MANAGER] Current players: ${roomStats.realPlayers} humans + ${roomStats.bots} bots`);

        // TESTING: Allow single player games for testing prize distribution
        // In production, you might want to require minimum 2 players
        if (roomStats.realPlayers < 1) {
          Logger.warn(`[GLOBAL_ROOM_MANAGER] No real players - cannot start game`);
          this.startGameScheduled = false;
          return;
        }

        Logger.info(`[GLOBAL_ROOM_MANAGER] Starting game with ${roomStats.realPlayers} real player(s)`);

        // Notify players game is starting
        this.io.emit('game_starting_blockchain', {
          message: 'Activating game on blockchain...',
          currentPlayers: roomStats.realPlayers
        });

        // Call start-game to change status from WAITING → ACTIVE
        const success = await this.gameContractService.startGame(this.currentGameId, authorityKey);

        if (success) {
          Logger.info('[GLOBAL_ROOM_MANAGER] ✅ Game started on blockchain! Status: WAITING → ACTIVE');

          // Notify all players
          this.io.emit('blockchain_game_started', {
            message: 'Game is now active on blockchain!',
            contractGameId: this.contractGameId
          });
        } else {
          Logger.error('[GLOBAL_ROOM_MANAGER] ❌ Failed to start game on blockchain');
        }

      } catch (error) {
        Logger.error('[GLOBAL_ROOM_MANAGER] ❌ Error starting game on blockchain:', error);
        // Continue anyway - game can work without blockchain
      }
    }, this.START_GAME_DELAY);
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

    if (this.gameRoundTimer) {
      clearTimeout(this.gameRoundTimer);
      this.gameRoundTimer = null;
      console.log('🔄 Game round timer cleared');
    }

    if (this.startGameTimer) {
      clearTimeout(this.startGameTimer);
      this.startGameTimer = null;
      console.log('🔄 Start game timer cleared');
    }

    console.log('✅ [GLOBAL_ROOM_MANAGER] Cleanup completed');
  }

  public getRoomStats() {
    return this.roomService.getRoomStats();
  }

  public getGlobalRoom(): GlobalGameRoom {
    return this.roomService.getGlobalRoom();
  }

  public respawnPlayer(playerId: string): void {
    try {
      const globalRoom = this.roomService.getGlobalRoom();
      const player = globalRoom.players.get(playerId);

      if (!player) {
        console.log(`⚠️ Player ${playerId} not found for respawn`);
        return;
      }

      // Use asGamePlayer to properly type the player
      const { asGamePlayer, GAMEPLAY_CONSTANTS } = require('shared');
      const gamePlayer = asGamePlayer(player);

      // Reset player stats
      gamePlayer.size = GAMEPLAY_CONSTANTS.PLAYER.INITIAL_SIZE;
      gamePlayer.mass = (gamePlayer.size * gamePlayer.size) / 100;
      gamePlayer.score = Math.max(0, Math.floor(gamePlayer.score * 0.9)); // Keep 90% of score
      gamePlayer.isAlive = true;
      gamePlayer.deathTime = undefined;
      gamePlayer.killedBy = undefined;

      // Generate safe spawn position
      player.position = this.roomService.generateRandomPosition();

      console.log(`🔄 [RESPAWN] Player ${playerId} respawned at (${Math.floor(player.position.x)}, ${Math.floor(player.position.y)})`);
      console.log(`🔄 [RESPAWN] Stats: size=${gamePlayer.size}, score=${gamePlayer.score}, isAlive=${gamePlayer.isAlive}`);

      // Notify the player that respawn is complete
      const socket = this.roomService.getPlayerSocket(playerId);
      if (socket) {
        socket.emit('respawn_complete', {
          position: player.position,
          size: gamePlayer.size,
          score: gamePlayer.score
        });
      }
    } catch (error) {
      console.error(`❌ Error respawning player ${playerId}:`, error);
    }
  }

  public getContractGameId(): number | null {
    return this.contractGameId;
  }

  /**
   * Get the current blockchain game status
   * Returns 'waiting', 'active', or 'finished'
   */
  public getBlockchainGameStatus(): 'waiting' | 'active' | 'finished' {
    // If no contract integration, default to waiting
    if (!this.gameContractService || this.contractGameId === null) {
      return 'waiting';
    }

    // Get game integration from contract service
    const gameIntegration = this.gameContractService.getGameIntegration(this.currentGameId || '');

    if (!gameIntegration) {
      return 'waiting';
    }

    return gameIntegration.status;
  }
}