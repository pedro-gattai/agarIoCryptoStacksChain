import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { GameService } from './services/GameService';
import { BlockchainService } from './services/BlockchainService';
import { StatsService } from './services/StatsService';
import { setupGlobalGameSocket } from './sockets/globalGameSocket';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.CLIENT_URL || "http://localhost:5173",
      "http://localhost:5174" // For when port 5173 is in use
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
const blockchainService = new BlockchainService();
const statsService = new StatsService();

// Global cleanup function reference
let globalCleanup: (() => void) | null = null;

// Initialize server asynchronously
(async () => {
  try {
    // Connect services
    gameService.setStatsService(statsService);

    // Socket setup - Global Room System
    console.log('🔄 Initializing Global Room System...');
    const { cleanup } = await setupGlobalGameSocket(io, gameService, blockchainService, statsService);
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
app.get('/api/leaderboards/global', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const leaderboard = statsService.getGlobalLeaderboard(limit);
  res.json(leaderboard);
});

app.get('/api/leaderboards/earnings', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const leaderboard = statsService.getEarningsLeaderboard(limit);
  res.json(leaderboard);
});

app.get('/api/leaderboards/winrate', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const minGames = parseInt(req.query.minGames as string) || 10;
  const leaderboard = statsService.getWinRateLeaderboard(minGames, limit);
  res.json(leaderboard);
});

app.get('/api/leaderboards/kills', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const leaderboard = statsService.getKillLeaderboard(limit);
  res.json(leaderboard);
});

app.get('/api/leaderboards/streaks', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const leaderboard = statsService.getStreakLeaderboard(limit);
  res.json(leaderboard);
});

app.get('/api/stats/:playerId', (req, res) => {
  const { playerId } = req.params;
  const stats = statsService.getPlayerStats(playerId);
  
  if (!stats) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  const rank = statsService.getPlayerRank(playerId);
  const achievements = statsService.checkAchievements(playerId);
  
  res.json({
    ...stats,
    rank,
    achievements
  });
});

// Test endpoint to populate sample data
app.post('/api/test/populate', (req, res) => {
  // Create some sample players
  const samplePlayers = [
    { id: 'player1', wallet: 'DsVmA5...9Qcz', gamesWon: 15, gamesPlayed: 20 },
    { id: 'player2', wallet: '7JkPq3...4Rfh', gamesWon: 8, gamesPlayed: 12 },
    { id: 'player3', wallet: 'BxNm7K...2Lps', gamesWon: 22, gamesPlayed: 25 },
    { id: 'player4', wallet: 'FgHt8R...7Nqw', gamesWon: 5, gamesPlayed: 30 },
    { id: 'player5', wallet: 'PkLm9Z...3Yvx', gamesWon: 18, gamesPlayed: 22 }
  ];

  samplePlayers.forEach(player => {
    statsService.initializePlayer(player.id, player.wallet);
    
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
      
      statsService.updatePlayerStats([gameResult]);
    }
  });
  
  res.json({ message: 'Sample data populated successfully!' });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🎮 Game server ready for connections`);
});