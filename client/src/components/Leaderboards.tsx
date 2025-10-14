import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../contexts/WalletContext';
import {
  Trophy,
  Coins,
  Target,
  Swords,
  Flame,
  Crown,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  Gamepad2,
  X,
  ArrowLeft,
  Wallet,
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { WalletLogo } from './WalletLogo';
import { WalletModal } from './WalletModal';

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
  rankChange?: number; // New: track rank change
}

type LeaderboardType = 'global' | 'earnings' | 'winrate' | 'kills' | 'streaks';
type TimePeriod = 'alltime' | 'week' | 'today';

interface LeaderboardsProps {
  onClose?: () => void;
}

export const Leaderboards: React.FC<LeaderboardsProps> = ({ onClose }) => {
  const {
    publicKey,
    connected,
    connecting,
    wallet,
    balance,
    disconnect: disconnectWallet
  } = useWallet();

  const [activeTab, setActiveTab] = useState<LeaderboardType>('global');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('alltime');
  const [leaderboardData, setLeaderboardData] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerStats | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);

  const playerRowRef = useRef<HTMLDivElement>(null);
  const walletDropdownRef = useRef<HTMLDivElement>(null);

  const fetchLeaderboard = async (type: LeaderboardType, period: TimePeriod = 'alltime') => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3000/api/leaderboards/${type}?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();
      setLeaderboardData(data);
      setTotalPlayers(data.length);

      // Find current player
      if (publicKey) {
        const player = data.find((p: PlayerStats) => p.walletAddress === publicKey);
        setCurrentPlayer(player || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(activeTab, timePeriod);
  }, [activeTab, timePeriod, publicKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(event.target as Node)) {
        setShowWalletDropdown(false);
      }
    };

    if (showWalletDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showWalletDropdown]);

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

  const getTabIcon = (type: LeaderboardType) => {
    switch (type) {
      case 'global': return <Trophy size={18} />;
      case 'earnings': return <Coins size={18} />;
      case 'winrate': return <Target size={18} />;
      case 'kills': return <Swords size={18} />;
      case 'streaks': return <Flame size={18} />;
      default: return <Trophy size={18} />;
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

  const getStatValue = (player: PlayerStats, type: LeaderboardType) => {
    switch (type) {
      case 'global':
        return `${player.eloRating} ELO`;
      case 'earnings':
        return `${player.totalEarnings.toFixed(3)} STX`;
      case 'winrate':
        return `${player.gamesPlayed > 0 ? ((player.gamesWon / player.gamesPlayed) * 100).toFixed(1) : 0}%`;
      case 'kills':
        return `${formatNumber(player.totalKills)} kills`;
      case 'streaks':
        return `${player.longestStreak} streak`;
      default:
        return '';
    }
  };

  const getTrendIndicator = (change: number | undefined) => {
    if (!change || change === 0) return <Minus size={14} className="trend-neutral" />;
    if (change > 0) return <TrendingUp size={14} className="trend-up" />;
    return <TrendingDown size={14} className="trend-down" />;
  };

  const getTrendText = (change: number | undefined) => {
    if (!change || change === 0) return '=';
    return change > 0 ? `▲ ${change}` : `▼ ${Math.abs(change)}`;
  };

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown size={32} className="medal-gold" />;
      case 2: return <Medal size={32} className="medal-silver" />;
      case 3: return <Medal size={32} className="medal-bronze" />;
      default: return null;
    }
  };

  const getRankBadge = (position: number) => {
    if (position <= 3) return getMedalIcon(position);
    return <span className="rank-number">#{position}</span>;
  };

  const calculateProgressToMilestone = () => {
    if (!currentPlayer || !currentPlayer.rank) return null;

    const rank = currentPlayer.rank;
    let milestone = 50;
    if (rank <= 10) milestone = 10;
    else if (rank <= 50) milestone = 50;
    else if (rank <= 100) milestone = 100;

    const progress = Math.max(0, Math.min(100, ((milestone - rank) / milestone) * 100));
    const needed = milestone - rank;

    return { milestone, progress, needed };
  };

  const scrollToPlayer = () => {
    playerRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const isCurrentPlayer = (walletAddress: string) => {
    return publicKey && walletAddress === publicKey;
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setShowWalletDropdown(false);
  };

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
    }
  };

  const handleViewOnExplorer = () => {
    if (publicKey) {
      window.open(`https://explorer.hiro.so/address/${publicKey}?chain=testnet`, '_blank');
    }
  };

  // Render Top 3 Podium
  const renderPodium = () => {
    const top3 = leaderboardData.slice(0, 3);
    if (top3.length === 0) return null;

    return (
      <div className="podium-container">
        {/* Rank 2 - Left */}
        {top3[1] && (
          <div className="podium-card podium-second">
            <div className="podium-medal">{getMedalIcon(2)}</div>
            <div className="podium-rank">#2</div>
            <div className="podium-address">{formatAddress(top3[1].walletAddress)}</div>
            <div className="podium-stat">{getStatValue(top3[1], activeTab)}</div>
            <div className="podium-games">{top3[1].gamesPlayed} games</div>
          </div>
        )}

        {/* Rank 1 - Center */}
        {top3[0] && (
          <div className="podium-card podium-first">
            <div className="podium-medal">{getMedalIcon(1)}</div>
            <div className="podium-rank">#1</div>
            <div className="podium-address">{formatAddress(top3[0].walletAddress)}</div>
            <div className="podium-stat">{getStatValue(top3[0], activeTab)}</div>
            <div className="podium-games">{top3[0].gamesPlayed} games</div>
          </div>
        )}

        {/* Rank 3 - Right */}
        {top3[2] && (
          <div className="podium-card podium-third">
            <div className="podium-medal">{getMedalIcon(3)}</div>
            <div className="podium-rank">#3</div>
            <div className="podium-address">{formatAddress(top3[2].walletAddress)}</div>
            <div className="podium-stat">{getStatValue(top3[2], activeTab)}</div>
            <div className="podium-games">{top3[2].gamesPlayed} games</div>
          </div>
        )}
      </div>
    );
  };

  // Render Your Stats Card
  const renderYourStatsCard = () => {
    if (!currentPlayer) return null;

    const progress = calculateProgressToMilestone();
    const rank = currentPlayer.rank || 0;
    const winRate = currentPlayer.gamesPlayed > 0
      ? ((currentPlayer.gamesWon / currentPlayer.gamesPlayed) * 100).toFixed(1)
      : '0';

    return (
      <div className="your-stats-card">
        <div className="your-stats-header">
          <Gamepad2 size={20} />
          <span>YOUR STATS</span>
        </div>

        <div className="your-stats-grid">
          {/* Rank Card */}
          <div className="stat-card">
            <div className="stat-label">Your Rank</div>
            <div className="stat-value-large">
              #{rank}
              <span className="stat-trend">{getTrendIndicator(currentPlayer.rankChange)}</span>
            </div>
            <div className="stat-subtitle">
              {getTrendText(currentPlayer.rankChange)} {currentPlayer.rankChange !== 0 ? 'today' : ''}
            </div>
          </div>

          {/* Main Stat Card */}
          <div className="stat-card">
            <div className="stat-label">{getTabTitle(activeTab)}</div>
            <div className="stat-value-large">
              {getStatValue(currentPlayer, activeTab)}
            </div>
            <div className="stat-subtitle">
              Current standing
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="stat-card">
            <div className="stat-label">Performance</div>
            <div className="stat-value-large">
              {currentPlayer.gamesPlayed}
              <span className="stat-small">games</span>
            </div>
            <div className="stat-subtitle">
              {winRate}% win rate
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {progress && progress.needed > 0 && (
          <div className="progress-container">
            <div className="progress-label">
              To Top {progress.milestone}: {progress.progress.toFixed(0)}%
              <span className="progress-needed">(Need {progress.needed} more ranks)</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="leaderboards-modern-container">
      {/* Top Bar */}
      <div className="leaderboards-top-bar">
        <div className="top-bar-left">
          <Trophy size={28} className="logo-icon" />
          <h1 className="leaderboards-title">Leaderboards</h1>
        </div>

        {/* Center - Back to Lobby */}
        <div className="top-bar-center">
          {onClose && (
            <button onClick={onClose} className="nav-btn-leaderboard">
              <ArrowLeft size={18} strokeWidth={2} />
              <span>Back to Lobby</span>
            </button>
          )}
        </div>

        {/* Right - Wallet */}
        <div className="top-bar-right">
          {connected ? (
            <div className="wallet-dropdown-wrapper" ref={walletDropdownRef}>
              <button
                className="wallet-badge-leaderboard connected"
                onClick={() => setShowWalletDropdown(!showWalletDropdown)}
              >
                <WalletLogo walletName={wallet?.name || 'Hiro Wallet'} size={20} />
                <div className="wallet-text-group">
                  <span className="wallet-balance-leaderboard">{balance.toFixed(3)} STX</span>
                  <span className="wallet-address-short-leaderboard">
                    {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
                  </span>
                </div>
                <ChevronDown size={16} className={`chevron ${showWalletDropdown ? 'open' : ''}`} />
              </button>

              {showWalletDropdown && (
                <div className="wallet-dropdown-menu-leaderboard">
                  <div className="dropdown-header-leaderboard">
                    <WalletLogo walletName={wallet?.name || 'Hiro Wallet'} size={24} />
                    <div className="dropdown-header-text">
                      <span className="dropdown-wallet-name">{wallet?.name}</span>
                      <span className="dropdown-balance-leaderboard">{balance.toFixed(6)} STX</span>
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-item-leaderboard" onClick={handleCopyAddress}>
                    <Copy size={16} />
                    <span>Copy Address</span>
                  </button>

                  <button className="dropdown-item-leaderboard" onClick={handleViewOnExplorer}>
                    <ExternalLink size={16} />
                    <span>View on Explorer</span>
                  </button>

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-item-leaderboard danger" onClick={handleDisconnect}>
                    <LogOut size={16} />
                    <span>Disconnect</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="connect-wallet-btn-leaderboard"
              onClick={() => setShowWalletModal(true)}
              disabled={connecting}
            >
              <Wallet size={18} strokeWidth={2.5} />
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="leaderboards-content-modern">
        {/* Tabs */}
        <div className="leaderboard-tabs-modern">
          {(['global', 'earnings', 'winrate', 'kills', 'streaks'] as LeaderboardType[]).map(tab => (
            <button
              key={tab}
              className={`tab-btn-modern ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {getTabIcon(tab)}
              <span>{getTabTitle(tab)}</span>
            </button>
          ))}
        </div>

        {/* Time Period Filters */}
        <div className="time-period-filters">
          <button
            className={`time-btn ${timePeriod === 'alltime' ? 'active' : ''}`}
            onClick={() => setTimePeriod('alltime')}
          >
            All Time
          </button>
          <button
            className={`time-btn ${timePeriod === 'week' ? 'active' : ''}`}
            onClick={() => setTimePeriod('week')}
          >
            This Week
          </button>
          <button
            className={`time-btn ${timePeriod === 'today' ? 'active' : ''}`}
            onClick={() => setTimePeriod('today')}
          >
            Today
          </button>
        </div>

        {/* Your Stats Card */}
        {renderYourStatsCard()}

        {/* Loading/Error States */}
        {loading && (
          <div className="loading-state-modern">
            <div className="loading-spinner-modern"></div>
            <p>Loading {getTabTitle(activeTab).toLowerCase()}...</p>
          </div>
        )}

        {error && (
          <div className="error-state-modern">
            <p>❌ {error}</p>
            <button onClick={() => fetchLeaderboard(activeTab, timePeriod)} className="retry-btn">
              Try Again
            </button>
          </div>
        )}

        {/* Podium and List */}
        {!loading && !error && (
          <>
            {/* Top 3 Podium */}
            {renderPodium()}

            {/* Leaderboard List (Rank 4+) */}
            <div className="leaderboard-list-modern">
              <div className="leaderboard-header-modern">
                <span>Rank</span>
                <span>Player</span>
                <span>Games</span>
                <span>{getTabTitle(activeTab)}</span>
                <span>Trend</span>
              </div>

              {leaderboardData.length === 0 ? (
                <div className="empty-state-modern">
                  <p>No players found. Be the first to play and climb the ranks!</p>
                </div>
              ) : (
                leaderboardData.slice(3).map((player, index) => {
                  const rank = index + 4;
                  const isPlayer = isCurrentPlayer(player.walletAddress);

                  return (
                    <div
                      key={player.userId}
                      ref={isPlayer ? playerRowRef : null}
                      className={`leaderboard-row-modern ${isPlayer ? 'current-player' : ''}`}
                    >
                      <div className="rank-cell-modern">
                        {getRankBadge(rank)}
                      </div>

                      <div className="player-cell-modern">
                        <span className="player-address-modern">
                          {formatAddress(player.walletAddress)}
                        </span>
                        {isPlayer && (
                          <span className="you-badge">YOU</span>
                        )}
                      </div>

                      <div className="games-cell-modern">
                        <span className="games-value">{player.gamesPlayed}</span>
                        <span className="win-rate-small">
                          {player.gamesPlayed > 0
                            ? `${((player.gamesWon / player.gamesPlayed) * 100).toFixed(0)}% win`
                            : '0% win'
                          }
                        </span>
                      </div>

                      <div className="stat-cell-modern">
                        <span className="stat-value-modern">
                          {getStatValue(player, activeTab)}
                        </span>
                      </div>

                      <div className="trend-cell-modern">
                        {getTrendIndicator(player.rankChange)}
                        <span className="trend-text">
                          {getTrendText(player.rankChange)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnected={() => {
          setShowWalletModal(false);
          console.log('Wallet connected successfully!');
        }}
      />
    </div>
  );
};
