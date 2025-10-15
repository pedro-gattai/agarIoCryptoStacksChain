import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { GameService } from './services/GameService';
import { StatsService } from './services/StatsService';
import { GameContractService } from './services/GameContractService';
import { setupGlobalGameSocket } from './sockets/globalGameSocket';
import { Logger, LogLevel } from 'shared';
import { gameSessionRecorder } from './services/GameSessionRecorder';
import { gameValidationService } from './services/GameValidationService';

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configure Logger based on environment
const isDevelopment = process.env.NODE_ENV !== 'production';
Logger.setLevel(isDevelopment ? LogLevel.INFO : LogLevel.WARN);
Logger.setPrefix('[SERVER] ');

// Import BlockchainService conditionally for demo mode
const DEMO_MODE = process.env.DEMO_MODE === 'true';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.CLIENT_URL || "http://localhost:5173",
      "http://localhost:5174", // For when port 5173 is in use
      "http://localhost:5175", // For when port 5174 is in use
      "http://localhost:5176", // For when port 5175 is in use
      "http://localhost:5177"  // For when port 5176 is in use
    ],
    methods: ["GET", "POST"]
  }
});

// Add debugging for Socket.IO server
io.engine.on("connection_error", (err) => {
  console.log('❌ [SOCKET.IO] Connection error:', err.req);
  console.log('❌ [SOCKET.IO] Error code:', err.code);
  console.log('❌ [SOCKET.IO] Error message:', err.message);
});

console.log('🔧 [SOCKET.IO] Server configured with CORS origin:', process.env.CLIENT_URL || "http://localhost:5173");

app.use(cors());
app.use(express.json());

// Services
const gameService = new GameService();
const statsService = new StatsService();

// Initialize blockchain service only if not in demo mode
let blockchainService: any = null;
let gameContractService: GameContractService | null = null;

if (!DEMO_MODE) {
  console.log('🔗 Initializing blockchain services...');
  try {
    const { BlockchainService } = require('./services/BlockchainService');
    blockchainService = new BlockchainService();

    // Create GameContractService
    gameContractService = new GameContractService(gameService);
    gameService.setContractService(gameContractService);

    console.log('✅ Blockchain services initialized');
  } catch (error: any) {
    console.warn('⚠️  Blockchain service failed to load, continuing in demo mode:', error?.message || error);
  }
} else {
  console.log('🎮 Running in DEMO MODE - blockchain disabled');
}

// Global cleanup function reference
let globalCleanup: (() => void) | null = null;

// Initialize server asynchronously
(async () => {
  try {
    // Connect services
    gameService.setStatsService(statsService);

    // Socket setup - Global Room System
    console.log('🔄 Initializing Global Room System...');
    const { cleanup } = await setupGlobalGameSocket(
      io,
      gameService,
      blockchainService,
      statsService,
      gameContractService
    );
    globalCleanup = cleanup;
    console.log('✅ Global Room System initialized');

  } catch (error) {
    console.error('❌ Failed to initialize Global Room System:', error);
    process.exit(1);
  }
})();

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  console.log(`\n🛑 [${signal}] Received shutdown signal. Starting graceful shutdown...`);
  
  // Set a timeout to force exit if graceful shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    console.log('⏰ [FORCE_EXIT] Graceful shutdown timeout. Forcing exit...');
    process.exit(1);
  }, 10000); // 10 second timeout

  Promise.resolve()
    .then(() => {
      // Cleanup Socket.IO and game services
      if (globalCleanup) {
        console.log('🧹 [SHUTDOWN] Cleaning up game services...');
        globalCleanup();
      }
    })
    .then(() => {
      // Close HTTP server
      console.log('🧹 [SHUTDOWN] Closing HTTP server...');
      return new Promise<void>((resolve) => {
        httpServer.close((err) => {
          if (err) {
            console.error('❌ [SHUTDOWN] Error closing HTTP server:', err);
          } else {
            console.log('✅ [SHUTDOWN] HTTP server closed');
          }
          resolve();
        });
      });
    })
    .then(() => {
      clearTimeout(forceExitTimeout);
      console.log('✅ [SHUTDOWN] Graceful shutdown completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ [SHUTDOWN] Error during graceful shutdown:', error);
      clearTimeout(forceExitTimeout);
      process.exit(1);
    });
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('❌ [UNCAUGHT_EXCEPTION]', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [UNHANDLED_REJECTION]', reason, 'at', promise);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes - Global Room Stats
app.get('/api/global-room/status', (_, res) => {
  // This will be populated by the GlobalRoomManager
  res.json({
    playersOnline: 0, // Will be updated by socket handler
    maxPlayers: 100,
    queueLength: 0,
    status: 'active',
    uptime: 0
  });
});

app.get('/api/games', (_, res) => {
  const games = gameService.getActiveGames();
  res.json(games);
});

app.post('/api/games', async (req, res) => {
  try {
    const { entryFee, maxPlayers } = req.body;
    const game = await gameService.createGame(entryFee, maxPlayers);
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Stats endpoints
app.get('/api/leaderboards/global', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const leaderboard = await statsService.getGlobalLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
});

app.get('/api/leaderboards/earnings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const leaderboard = await statsService.getEarningsLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch earnings leaderboard' });
  }
});

app.get('/api/leaderboards/winrate', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const minGames = parseInt(req.query.minGames as string) || 10;
    const leaderboard = await statsService.getWinRateLeaderboard(minGames, limit);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch win rate leaderboard' });
  }
});

app.get('/api/leaderboards/kills', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const leaderboard = await statsService.getKillLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch kills leaderboard' });
  }
});

app.get('/api/leaderboards/streaks', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const leaderboard = await statsService.getStreakLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch streaks leaderboard' });
  }
});

app.get('/api/stats/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const stats = await statsService.getPlayerStats(playerId);

    if (!stats) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const rank = await statsService.getPlayerRank(playerId);
    const achievements = await statsService.checkAchievements(playerId);

    res.json({
      ...stats,
      rank,
      achievements
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

// Replay & Session Verification API endpoints
// Critical for betting/wagering scenarios - provides proof of fair play

/**
 * Get full replay data for a game session
 * Returns complete event log, player actions, and final stats
 * Use case: Allow players to review game for disputes in betting scenarios
 */
app.get('/api/game/:gameId/replay', (req, res) => {
  try {
    const { gameId } = req.params;
    const sessionJSON = gameSessionRecorder.getSessionJSON(gameId);

    if (!sessionJSON) {
      return res.status(404).json({
        error: 'Replay not found',
        message: `No replay data available for game ${gameId}. Session may have expired or never existed.`
      });
    }

    // Return raw JSON that can be used to replay the game
    res.setHeader('Content-Type', 'application/json');
    res.send(sessionJSON);
  } catch (error) {
    Logger.error('[API] Error fetching replay:', error);
    res.status(500).json({ error: 'Failed to fetch replay data' });
  }
});

/**
 * Get session hash for verification
 * Returns cryptographic hash of session data that's stored on blockchain
 * Use case: Verify game integrity - compare local hash with on-chain hash
 */
app.get('/api/game/:gameId/hash', (req, res) => {
  try {
    const { gameId } = req.params;
    const sessionHash = gameSessionRecorder.generateSessionHash(gameId);

    if (!sessionHash) {
      return res.status(404).json({
        error: 'Session not found',
        message: `No session data available for game ${gameId}`
      });
    }

    const session = gameSessionRecorder.getSession(gameId);

    res.json({
      gameId,
      sessionHash,
      hashAlgorithm: 'SHA-256',
      sessionMetadata: {
        startTime: session?.startTime,
        endTime: session?.endTime,
        totalEvents: session?.events.length,
        totalPlayers: session?.players.size,
        finalStats: session?.finalStats
      },
      verificationInstructions: {
        blockchain: 'Stacks Testnet',
        contract: `${process.env.STACKS_CONTRACT_ADDRESS}.${process.env.STACKS_CONTRACT_NAME}`,
        function: 'verify-session-hash',
        explorer: `https://explorer.hiro.so/?chain=testnet`
      }
    });
  } catch (error) {
    Logger.error('[API] Error generating session hash:', error);
    res.status(500).json({ error: 'Failed to generate session hash' });
  }
});

/**
 * Get session summary (lightweight version)
 * Returns basic stats without full event log
 * Use case: Quick overview for UI display
 */
app.get('/api/game/:gameId/summary', (req, res) => {
  try {
    const { gameId } = req.params;
    const session = gameSessionRecorder.getSession(gameId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: `No session data available for game ${gameId}`
      });
    }

    // Convert players Map to array for JSON serialization
    const playersArray = Array.from(session.players.values());

    res.json({
      gameId: session.gameId,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.endTime ? session.endTime - session.startTime : null,
      totalPlayers: session.players.size,
      totalEvents: session.events.length,
      players: playersArray.map(player => ({
        playerId: player.playerId,
        walletAddress: player.walletAddress,
        kills: player.kills,
        deaths: player.deaths,
        finalScore: player.finalScore,
        maxMass: player.maxMass
      })),
      finalStats: session.finalStats
    });
  } catch (error) {
    Logger.error('[API] Error fetching session summary:', error);
    res.status(500).json({ error: 'Failed to fetch session summary' });
  }
});

/**
 * Validate a game session for fairness
 * Returns validation result with risk assessment
 * Use case: Verify game wasn't cheated before accepting bet results
 */
app.get('/api/game/:gameId/validate', (req, res) => {
  try {
    const { gameId } = req.params;
    const session = gameSessionRecorder.getSession(gameId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: `No session data available for game ${gameId}`
      });
    }

    // Validate session
    const validation = gameValidationService.validateSession(session);

    // Generate audit log if requested
    const includeAuditLog = req.query.audit === 'true';
    const auditLog = includeAuditLog
      ? gameValidationService.generateAuditLog(session, validation)
      : undefined;

    res.json({
      gameId,
      validation,
      auditLog,
      timestamp: new Date().toISOString(),
      message: validation.isValid
        ? 'Session passed validation checks'
        : 'Session failed validation - suspicious activity detected'
    });
  } catch (error) {
    Logger.error('[API] Error validating session:', error);
    res.status(500).json({ error: 'Failed to validate session' });
  }
});

// Test endpoint to populate sample data
app.post('/api/test/populate', async (req, res) => {
  try {
    // Create some sample players
    const samplePlayers = [
      { id: 'player1', wallet: 'DsVmA5...9Qcz', gamesWon: 15, gamesPlayed: 20 },
      { id: 'player2', wallet: '7JkPq3...4Rfh', gamesWon: 8, gamesPlayed: 12 },
      { id: 'player3', wallet: 'BxNm7K...2Lps', gamesWon: 22, gamesPlayed: 25 },
      { id: 'player4', wallet: 'FgHt8R...7Nqw', gamesWon: 5, gamesPlayed: 30 },
      { id: 'player5', wallet: 'PkLm9Z...3Yvx', gamesWon: 18, gamesPlayed: 22 }
    ];

    for (const player of samplePlayers) {
      await statsService.initializePlayer(player.id, player.wallet);

      // Create sample game results
      for (let i = 0; i < player.gamesPlayed; i++) {
        const won = i < player.gamesWon;
        const gameResult = {
          playerId: player.id,
          won,
          score: won ? Math.random() * 5000 + 2000 : Math.random() * 2000,
          kills: Math.floor(Math.random() * 10),
          deaths: won ? 0 : 1,
          survivalTime: Math.random() * 300000 + 60000,
          maxCellSize: Math.random() * 100 + 50,
          earnings: won ? Math.random() * 2 + 0.5 : -0.1
        };

        await statsService.updatePlayerStats([gameResult]);
      }
    }

    res.json({ message: 'Sample data populated successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to populate sample data' });
  }
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎮 Game server ready for connections`);
});