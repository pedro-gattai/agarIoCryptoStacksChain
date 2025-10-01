import React, { useState, useEffect } from 'react';

export interface PlayerStats {
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
  rank?: number;
  achievements?: string[];
}

type LeaderboardType = 'global' | 'earnings' | 'winrate' | 'kills' | 'streaks';

interface LeaderboardsProps {
  onClose?: () => void;
}

export const Leaderboards: React.FC<LeaderboardsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('global');
  const [leaderboardData, setLeaderboardData] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async (type: LeaderboardType) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3000/api/leaderboards/${type}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();
      setLeaderboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(activeTab);
  }, [activeTab]);

  const formatAddress = (address: string) => {
    if (!address) return 'Anonymous';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${position}`;
    }
  };

  const getStatValue = (player: PlayerStats, type: LeaderboardType) => {
    switch (type) {
      case 'global':
        return `${player.eloRating} ELO`;
      case 'earnings':
        return `${player.totalEarnings.toFixed(3)} STX`;
      case 'winrate':
        return `${((player.gamesWon / player.gamesPlayed) * 100).toFixed(1)}%`;
      case 'kills':
        return `${formatNumber(player.totalKills)} kills`;
      case 'streaks':
        return `${player.longestStreak} streak`;
      default:
        return '';
    }
  };

  const getTabTitle = (type: LeaderboardType) => {
    switch (type) {
      case 'global': return 'Global Ranking';
      case 'earnings': return 'Top Earners';
      case 'winrate': return 'Win Rate';
      case 'kills': return 'Most Kills';
      case 'streaks': return 'Best Streaks';
      default: return 'Leaderboard';
    }
  };

  return (
    <div className="leaderboards-container">
      <div className="leaderboards-header">
        <h2>🏆 Leaderboards</h2>
        {onClose && (
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        )}
      </div>

      <div className="leaderboards-tabs">
        {(['global', 'earnings', 'winrate', 'kills', 'streaks'] as LeaderboardType[]).map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {getTabTitle(tab)}
          </button>
        ))}
      </div>

      <div className="leaderboards-content">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading {getTabTitle(activeTab).toLowerCase()}...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>❌ {error}</p>
            <button onClick={() => fetchLeaderboard(activeTab)}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="leaderboard-list">
            <div className="leaderboard-header">
              <span>Rank</span>
              <span>Player</span>
              <span>Games</span>
              <span>{getTabTitle(activeTab)}</span>
            </div>

            {leaderboardData.length === 0 ? (
              <div className="empty-state">
                <p>No players found. Be the first to play and climb the ranks! 🚀</p>
              </div>
            ) : (
              leaderboardData.map((player, index) => (
                <div key={player.userId} className="leaderboard-row">
                  <div className="rank-cell">
                    <span className="rank-icon">{getRankIcon(index + 1)}</span>
                  </div>
                  
                  <div className="player-cell">
                    <div className="player-info">
                      <span className="player-address">
                        {formatAddress(player.walletAddress)}
                      </span>
                      {player.achievements && player.achievements.length > 0 && (
                        <div className="player-badges">
                          {player.achievements.slice(0, 3).map((_, i) => (
                            <span key={i} className="achievement-badge">
                              🏅
                            </span>
                          ))}
                          {player.achievements.length > 3 && (
                            <span className="more-badges">+{player.achievements.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="games-cell">
                    <span className="games-played">{player.gamesPlayed}</span>
                    <span className="win-rate">
                      {player.gamesPlayed > 0 
                        ? `(${((player.gamesWon / player.gamesPlayed) * 100).toFixed(0)}% win)`
                        : '(0% win)'
                      }
                    </span>
                  </div>

                  <div className="stat-cell">
                    <span className="primary-stat">
                      {getStatValue(player, activeTab)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};