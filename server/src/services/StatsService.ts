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
  
  // ELO rating system constants
  private readonly K_FACTOR = 32; // How much rating can change per game
  private readonly BASE_RATING = 1000;

  initializePlayer(userId: string, walletAddress: string): PlayerStats {
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

  updatePlayerStats(gameResults: GameResult[]): void {
    // Calculate ELO changes
    const eloChanges = this.calculateELOChanges(gameResults);

    gameResults.forEach((result, index) => {
      const stats = this.playerStats.get(result.playerId);
      if (!stats) return;

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
      stats.eloRating += eloChanges[index];
      
      // Ensure ELO doesn't go below minimum
      stats.eloRating = Math.max(100, stats.eloRating);
    });
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

  getGlobalLeaderboard(limit: number = 100): PlayerStats[] {
    return Array.from(this.playerStats.values())
      .sort((a, b) => b.eloRating - a.eloRating)
      .slice(0, limit);
  }

  getEarningsLeaderboard(limit: number = 100): PlayerStats[] {
    return Array.from(this.playerStats.values())
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);
  }

  getWinRateLeaderboard(minGames: number = 10, limit: number = 100): PlayerStats[] {
    return Array.from(this.playerStats.values())
      .filter(stats => stats.gamesPlayed >= minGames)
      .sort((a, b) => (b.gamesWon / b.gamesPlayed) - (a.gamesWon / a.gamesPlayed))
      .slice(0, limit);
  }

  getKillLeaderboard(limit: number = 100): PlayerStats[] {
    return Array.from(this.playerStats.values())
      .sort((a, b) => b.totalKills - a.totalKills)
      .slice(0, limit);
  }

  getStreakLeaderboard(limit: number = 100): PlayerStats[] {
    return Array.from(this.playerStats.values())
      .sort((a, b) => b.longestStreak - a.longestStreak)
      .slice(0, limit);
  }

  getPlayerStats(userId: string): PlayerStats | null {
    return this.playerStats.get(userId) || null;
  }

  getPlayerRank(userId: string, leaderboardType: 'elo' | 'earnings' | 'kills' = 'elo'): number {
    const stats = this.playerStats.get(userId);
    if (!stats) return -1;

    let sortedPlayers: PlayerStats[];
    
    switch (leaderboardType) {
      case 'earnings':
        sortedPlayers = this.getEarningsLeaderboard(1000);
        break;
      case 'kills':
        sortedPlayers = this.getKillLeaderboard(1000);
        break;
      default:
        sortedPlayers = this.getGlobalLeaderboard(1000);
    }

    return sortedPlayers.findIndex(p => p.userId === userId) + 1;
  }

  // Achievement checking methods
  checkAchievements(userId: string): string[] {
    const stats = this.playerStats.get(userId);
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
  resetSeasonalStats(): void {
    this.playerStats.forEach(stats => {
      stats.currentStreak = 0;
      // Keep historical stats but could add seasonal tracking
    });
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