import prisma, { isDatabaseConnected } from '../lib/prisma';

interface PlayerStats {
  userId: string;
  walletAddress: string;
  gamesPlayed: number;
  gamesWon: number;
  totalKills: number;
  totalDeaths: number;
  totalEarnings: number;
  totalLosses: number;
  highestScore: number;
  eloRating: number;
  avgSurvivalTime: number;
  longestSurvival: number;
  biggestCellSize: number;
  currentStreak: number;
  longestStreak: number;
}

export interface GameResult {
  playerId: string;
  won: boolean;
  score: number;
  kills: number;
  deaths: number;
  survivalTime: number;
  maxCellSize: number;
  earnings: number;
}

export class StatsService {
  private playerStats: Map<string, PlayerStats> = new Map();
  private usePrisma: boolean | null = null; // null = not checked yet

  // ELO rating system constants
  private readonly K_FACTOR = 32; // How much rating can change per game
  private readonly BASE_RATING = 1000;

  /**
   * Check if database is available (cached after first check)
   */
  private async checkDatabaseAvailability(): Promise<boolean> {
    if (this.usePrisma !== null) {
      return this.usePrisma;
    }

    this.usePrisma = await isDatabaseConnected();

    if (this.usePrisma) {
      console.log('✅ StatsService: Using database persistence');
    } else {
      console.log('⚠️  StatsService: Database not available, using in-memory storage');
    }

    return this.usePrisma;
  }

  async initializePlayer(userId: string, walletAddress: string): Promise<PlayerStats> {
    const useDb = await this.checkDatabaseAvailability();

    if (useDb) {
      // Database mode: Check if user exists, create if not
      let user = await prisma.user.findUnique({
        where: { walletAddress },
        include: { stats: true }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            walletAddress,
            stats: {
              create: {
                eloRating: this.BASE_RATING
              }
            }
          },
          include: { stats: true }
        });
      } else if (!user.stats) {
        // User exists but no stats
        await prisma.playerStats.create({
          data: {
            userId: user.id,
            eloRating: this.BASE_RATING
          }
        });
      }

      // Reload to get complete stats
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: { stats: true }
      });

      const dbStats = user!.stats!;
      const stats: PlayerStats = {
        userId: user!.id,
        walletAddress: user!.walletAddress,
        gamesPlayed: dbStats.gamesPlayed,
        gamesWon: dbStats.gamesWon,
        totalKills: dbStats.totalKills,
        totalDeaths: dbStats.totalDeaths,
        totalEarnings: Number(dbStats.totalEarnings),
        totalLosses: Number(dbStats.totalLosses),
        highestScore: dbStats.highestScore,
        eloRating: dbStats.eloRating,
        avgSurvivalTime: dbStats.avgSurvivalTime,
        longestSurvival: dbStats.longestSurvival,
        biggestCellSize: dbStats.biggestCellSize,
        currentStreak: dbStats.currentStreak,
        longestStreak: dbStats.longestStreak
      };

      // Cache in memory for quick access
      this.playerStats.set(userId, stats);
      return stats;
    } else {
      // In-memory mode
      if (this.playerStats.has(userId)) {
        return this.playerStats.get(userId)!;
      }

      const stats: PlayerStats = {
        userId,
        walletAddress,
        gamesPlayed: 0,
        gamesWon: 0,
        totalKills: 0,
        totalDeaths: 0,
        totalEarnings: 0,
        totalLosses: 0,
        highestScore: 0,
        eloRating: this.BASE_RATING,
        avgSurvivalTime: 0,
        longestSurvival: 0,
        biggestCellSize: 0,
        currentStreak: 0,
        longestStreak: 0
      };

      this.playerStats.set(userId, stats);
      return stats;
    }
  }

  async updatePlayerStats(gameResults: GameResult[]): Promise<void> {
    const useDb = await this.checkDatabaseAvailability();

    // Calculate ELO changes
    const eloChanges = this.calculateELOChanges(gameResults);

    if (useDb) {
      // Database mode: Update all players in database
      for (let i = 0; i < gameResults.length; i++) {
        const result = gameResults[i];
        const stats = this.playerStats.get(result.playerId);
        if (!stats) continue;

        // Update stats object
        this.updateStatsObject(stats, result, eloChanges[i]);

        // Persist to database
        try {
          await prisma.playerStats.update({
            where: { userId: result.playerId },
            data: {
              gamesPlayed: stats.gamesPlayed,
              gamesWon: stats.gamesWon,
              totalKills: stats.totalKills,
              totalDeaths: stats.totalDeaths,
              totalEarnings: BigInt(stats.totalEarnings),
              totalLosses: BigInt(stats.totalLosses),
              highestScore: stats.highestScore,
              eloRating: stats.eloRating,
              peakEloRating: {
                set: Math.max(stats.eloRating, stats.eloRating)
              },
              avgSurvivalTime: stats.avgSurvivalTime,
              longestSurvival: stats.longestSurvival,
              biggestCellSize: stats.biggestCellSize,
              currentStreak: stats.currentStreak,
              longestStreak: stats.longestStreak,
              lastGameAt: new Date()
            }
          });
        } catch (error) {
          console.error(`Failed to update stats for ${result.playerId}:`, error);
        }
      }
    } else {
      // In-memory mode
      gameResults.forEach((result, index) => {
        const stats = this.playerStats.get(result.playerId);
        if (!stats) return;
        this.updateStatsObject(stats, result, eloChanges[index]);
      });
    }
  }

  /**
   * Helper method to update stats object (used by both database and in-memory modes)
   */
  private updateStatsObject(stats: PlayerStats, result: GameResult, eloChange: number): void {
    // Update basic stats
    stats.gamesPlayed++;
    stats.totalKills += result.kills;
    stats.totalDeaths += result.deaths;
    stats.totalEarnings += result.earnings;

    if (result.score > stats.highestScore) {
      stats.highestScore = result.score;
    }

    if (result.maxCellSize > stats.biggestCellSize) {
      stats.biggestCellSize = result.maxCellSize;
    }

    if (result.survivalTime > stats.longestSurvival) {
      stats.longestSurvival = result.survivalTime;
    }

    // Update average survival time
    const totalSurvivalTime = stats.avgSurvivalTime * (stats.gamesPlayed - 1) + result.survivalTime;
    stats.avgSurvivalTime = totalSurvivalTime / stats.gamesPlayed;

    // Update win/loss records
    if (result.won) {
      stats.gamesWon++;
      stats.currentStreak++;

      if (stats.currentStreak > stats.longestStreak) {
        stats.longestStreak = stats.currentStreak;
      }
    } else {
      stats.totalLosses += Math.abs(result.earnings); // Negative earnings = losses
      stats.currentStreak = 0;
    }

    // Update ELO rating
    stats.eloRating += eloChange;

    // Ensure ELO doesn't go below minimum
    stats.eloRating = Math.max(100, stats.eloRating);
  }

  private calculateELOChanges(gameResults: GameResult[]): number[] {
    const n = gameResults.length;
    const eloChanges: number[] = new Array(n).fill(0);

    // Get current ratings
    const ratings = gameResults.map(result => {
      const stats = this.playerStats.get(result.playerId);
      return stats ? stats.eloRating : this.BASE_RATING;
    });

    // Calculate expected scores for each player against all others
    for (let i = 0; i < n; i++) {
      let expectedScore = 0;
      let actualScore = 0;

      for (let j = 0; j < n; j++) {
        if (i === j) continue;

        // Expected score against player j
        const expected = 1 / (1 + Math.pow(10, (ratings[j] - ratings[i]) / 400));
        expectedScore += expected;

        // Actual score (1 for win, 0 for loss, 0.5 for similar performance)
        if (gameResults[i].score > gameResults[j].score) {
          actualScore += 1;
        } else if (gameResults[i].score === gameResults[j].score) {
          actualScore += 0.5;
        }
      }

      // Calculate rating change
      if (n > 1) {
        expectedScore /= (n - 1);
        actualScore /= (n - 1);
        eloChanges[i] = Math.round(this.K_FACTOR * (actualScore - expectedScore));
      }
    }

    return eloChanges;
  }

  async getGlobalLeaderboard(limit: number = 100): Promise<PlayerStats[]> {
    const useDb = await this.checkDatabaseAvailability();

    if (useDb) {
      const dbStats = await prisma.playerStats.findMany({
        take: limit,
        orderBy: { eloRating: 'desc' },
        include: { user: true }
      });

      return dbStats.map(s => ({
        userId: s.userId,
        walletAddress: s.user.walletAddress,
        gamesPlayed: s.gamesPlayed,
        gamesWon: s.gamesWon,
        totalKills: s.totalKills,
        totalDeaths: s.totalDeaths,
        totalEarnings: Number(s.totalEarnings),
        totalLosses: Number(s.totalLosses),
        highestScore: s.highestScore,
        eloRating: s.eloRating,
        avgSurvivalTime: s.avgSurvivalTime,
        longestSurvival: s.longestSurvival,
        biggestCellSize: s.biggestCellSize,
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak
      }));
    } else {
      return Array.from(this.playerStats.values())
        .sort((a, b) => b.eloRating - a.eloRating)
        .slice(0, limit);
    }
  }

  async getEarningsLeaderboard(limit: number = 100): Promise<PlayerStats[]> {
    const useDb = await this.checkDatabaseAvailability();

    if (useDb) {
      const dbStats = await prisma.playerStats.findMany({
        take: limit,
        orderBy: { totalEarnings: 'desc' },
        include: { user: true }
      });

      return dbStats.map(s => ({
        userId: s.userId,
        walletAddress: s.user.walletAddress,
        gamesPlayed: s.gamesPlayed,
        gamesWon: s.gamesWon,
        totalKills: s.totalKills,
        totalDeaths: s.totalDeaths,
        totalEarnings: Number(s.totalEarnings),
        totalLosses: Number(s.totalLosses),
        highestScore: s.highestScore,
        eloRating: s.eloRating,
        avgSurvivalTime: s.avgSurvivalTime,
        longestSurvival: s.longestSurvival,
        biggestCellSize: s.biggestCellSize,
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak
      }));
    } else {
      return Array.from(this.playerStats.values())
        .sort((a, b) => b.totalEarnings - a.totalEarnings)
        .slice(0, limit);
    }
  }

  async getWinRateLeaderboard(minGames: number = 10, limit: number = 100): Promise<PlayerStats[]> {
    const useDb = await this.checkDatabaseAvailability();

    if (useDb) {
      // Note: Prisma doesn't support calculated fields in orderBy directly
      // We fetch more than needed and sort in memory
      const dbStats = await prisma.playerStats.findMany({
        where: { gamesPlayed: { gte: minGames } },
        take: limit * 2, // Fetch extra to account for filtering
        include: { user: true }
      });

      return dbStats
        .map(s => ({
          userId: s.userId,
          walletAddress: s.user.walletAddress,
          gamesPlayed: s.gamesPlayed,
          gamesWon: s.gamesWon,
          totalKills: s.totalKills,
          totalDeaths: s.totalDeaths,
          totalEarnings: Number(s.totalEarnings),
          totalLosses: Number(s.totalLosses),
          highestScore: s.highestScore,
          eloRating: s.eloRating,
          avgSurvivalTime: s.avgSurvivalTime,
          longestSurvival: s.longestSurvival,
          biggestCellSize: s.biggestCellSize,
          currentStreak: s.currentStreak,
          longestStreak: s.longestStreak
        }))
        .sort((a, b) => (b.gamesWon / b.gamesPlayed) - (a.gamesWon / a.gamesPlayed))
        .slice(0, limit);
    } else {
      return Array.from(this.playerStats.values())
        .filter(stats => stats.gamesPlayed >= minGames)
        .sort((a, b) => (b.gamesWon / b.gamesPlayed) - (a.gamesWon / a.gamesPlayed))
        .slice(0, limit);
    }
  }

  async getKillLeaderboard(limit: number = 100): Promise<PlayerStats[]> {
    const useDb = await this.checkDatabaseAvailability();

    if (useDb) {
      const dbStats = await prisma.playerStats.findMany({
        take: limit,
        orderBy: { totalKills: 'desc' },
        include: { user: true }
      });

      return dbStats.map(s => ({
        userId: s.userId,
        walletAddress: s.user.walletAddress,
        gamesPlayed: s.gamesPlayed,
        gamesWon: s.gamesWon,
        totalKills: s.totalKills,
        totalDeaths: s.totalDeaths,
        totalEarnings: Number(s.totalEarnings),
        totalLosses: Number(s.totalLosses),
        highestScore: s.highestScore,
        eloRating: s.eloRating,
        avgSurvivalTime: s.avgSurvivalTime,
        longestSurvival: s.longestSurvival,
        biggestCellSize: s.biggestCellSize,
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak
      }));
    } else {
      return Array.from(this.playerStats.values())
        .sort((a, b) => b.totalKills - a.totalKills)
        .slice(0, limit);
    }
  }

  async getStreakLeaderboard(limit: number = 100): Promise<PlayerStats[]> {
    const useDb = await this.checkDatabaseAvailability();

    if (useDb) {
      const dbStats = await prisma.playerStats.findMany({
        take: limit,
        orderBy: { longestStreak: 'desc' },
        include: { user: true }
      });

      return dbStats.map(s => ({
        userId: s.userId,
        walletAddress: s.user.walletAddress,
        gamesPlayed: s.gamesPlayed,
        gamesWon: s.gamesWon,
        totalKills: s.totalKills,
        totalDeaths: s.totalDeaths,
        totalEarnings: Number(s.totalEarnings),
        totalLosses: Number(s.totalLosses),
        highestScore: s.highestScore,
        eloRating: s.eloRating,
        avgSurvivalTime: s.avgSurvivalTime,
        longestSurvival: s.longestSurvival,
        biggestCellSize: s.biggestCellSize,
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak
      }));
    } else {
      return Array.from(this.playerStats.values())
        .sort((a, b) => b.longestStreak - a.longestStreak)
        .slice(0, limit);
    }
  }

  async getPlayerStats(userId: string): Promise<PlayerStats | null> {
    const useDb = await this.checkDatabaseAvailability();

    if (useDb) {
      const dbStats = await prisma.playerStats.findUnique({
        where: { userId },
        include: { user: true }
      });

      if (!dbStats) return null;

      return {
        userId: dbStats.userId,
        walletAddress: dbStats.user.walletAddress,
        gamesPlayed: dbStats.gamesPlayed,
        gamesWon: dbStats.gamesWon,
        totalKills: dbStats.totalKills,
        totalDeaths: dbStats.totalDeaths,
        totalEarnings: Number(dbStats.totalEarnings),
        totalLosses: Number(dbStats.totalLosses),
        highestScore: dbStats.highestScore,
        eloRating: dbStats.eloRating,
        avgSurvivalTime: dbStats.avgSurvivalTime,
        longestSurvival: dbStats.longestSurvival,
        biggestCellSize: dbStats.biggestCellSize,
        currentStreak: dbStats.currentStreak,
        longestStreak: dbStats.longestStreak
      };
    } else {
      return this.playerStats.get(userId) || null;
    }
  }

  async getPlayerRank(userId: string, leaderboardType: 'elo' | 'earnings' | 'kills' = 'elo'): Promise<number> {
    const stats = await this.getPlayerStats(userId);
    if (!stats) return -1;

    let sortedPlayers: PlayerStats[];

    switch (leaderboardType) {
      case 'earnings':
        sortedPlayers = await this.getEarningsLeaderboard(1000);
        break;
      case 'kills':
        sortedPlayers = await this.getKillLeaderboard(1000);
        break;
      default:
        sortedPlayers = await this.getGlobalLeaderboard(1000);
    }

    return sortedPlayers.findIndex(p => p.userId === userId) + 1;
  }

  // Achievement checking methods
  async checkAchievements(userId: string): Promise<string[]> {
    const stats = await this.getPlayerStats(userId);
    if (!stats) return [];

    const unlockedAchievements: string[] = [];

    // First Win
    if (stats.gamesWon >= 1) {
      unlockedAchievements.push('FIRST_WIN');
    }

    // Win Streak achievements
    if (stats.longestStreak >= 5) {
      unlockedAchievements.push('WIN_STREAK_5');
    }
    if (stats.longestStreak >= 10) {
      unlockedAchievements.push('WIN_STREAK_10');
    }

    // Kill achievements
    if (stats.totalKills >= 100) {
      unlockedAchievements.push('KILLER_100');
    }
    if (stats.totalKills >= 1000) {
      unlockedAchievements.push('KILLER_1000');
    }

    // Earnings achievements
    if (stats.totalEarnings >= 1) {
      unlockedAchievements.push('EARNER_1_SOL');
    }
    if (stats.totalEarnings >= 10) {
      unlockedAchievements.push('EARNER_10_SOL');
    }

    // High score achievements
    if (stats.highestScore >= 10000) {
      unlockedAchievements.push('HIGH_SCORE_10K');
    }
    if (stats.highestScore >= 50000) {
      unlockedAchievements.push('HIGH_SCORE_50K');
    }

    // Survival time achievements
    if (stats.longestSurvival >= 300000) { // 5 minutes
      unlockedAchievements.push('SURVIVOR_5MIN');
    }
    if (stats.longestSurvival >= 600000) { // 10 minutes
      unlockedAchievements.push('SURVIVOR_10MIN');
    }

    // Games played achievements
    if (stats.gamesPlayed >= 100) {
      unlockedAchievements.push('VETERAN_100');
    }
    if (stats.gamesPlayed >= 500) {
      unlockedAchievements.push('VETERAN_500');
    }

    // ELO achievements
    if (stats.eloRating >= 1500) {
      unlockedAchievements.push('SKILLED_PLAYER');
    }
    if (stats.eloRating >= 2000) {
      unlockedAchievements.push('EXPERT_PLAYER');
    }

    return unlockedAchievements;
  }

  // Season management
  async resetSeasonalStats(): Promise<void> {
    const useDb = await this.checkDatabaseAvailability();

    if (useDb) {
      await prisma.playerStats.updateMany({
        data: { currentStreak: 0 }
      });
    } else {
      this.playerStats.forEach(stats => {
        stats.currentStreak = 0;
      });
    }
  }

  exportStats(): Record<string, PlayerStats> {
    const result: Record<string, PlayerStats> = {};
    this.playerStats.forEach((stats, userId) => {
      result[userId] = { ...stats };
    });
    return result;
  }

  importStats(statsData: Record<string, PlayerStats>): void {
    Object.entries(statsData).forEach(([userId, stats]) => {
      this.playerStats.set(userId, stats);
    });
  }
}
