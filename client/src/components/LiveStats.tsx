import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

interface LiveStatsData {
  playersOnline: number;
  todayRewards: number;
  gamesPlayed: number;
  topPlayer: string;
  currentJackpot: number;
  averageGameTime: number;
}

export const LiveStats: React.FC = () => {
  // Static "coming soon" data
  const stats: LiveStatsData = {
    playersOnline: 0,
    todayRewards: 0,
    gamesPlayed: 0,
    topPlayer: 'Soon...',
    currentJackpot: 0,
    averageGameTime: 0
  };

  const recentWins = [
    { player: 'Pre-Launch', amount: 0, time: 'Soon...' },
    { player: 'Beta Testing', amount: 0, time: 'Soon...' },
    { player: 'Alpha Winners', amount: 0, time: 'Soon...' },
    { player: 'Early Birds', amount: 0, time: 'Soon...' },
    { player: 'Coming Soon', amount: 0, time: 'Soon...' }
  ];

  const { isConnected } = useSocket();

  const formatCurrency = (amount: number): string => {
    return amount === 0 ? 'Soon...' : amount.toFixed(2);
  };

  const formatTime = (seconds: number): string => {
    return seconds === 0 ? 'TBA' : `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <section className="live-stats-section">
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">
            <span className="live-indicator">🟡</span>
            Pre-Launch Statistics
          </h2>
          <p className="section-subtitle">
            Getting ready for the ultimate crypto gaming experience
          </p>
        </div>

        <div className="stats-grid">
          {/* Main Stats */}
          <div className="stats-main">
            <div className="stat-card primary">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number animate-counter">
                  {stats.playersOnline}
                </div>
                <div className="stat-label">Players Online</div>
                <div className="stat-status">
                  <span className={`status-dot ${isConnected ? 'online' : 'offline'}`}></span>
                  {isConnected ? 'Connected' : 'Connecting...'}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-number">
                  ${formatCurrency(stats.todayRewards)}
                </div>
                <div className="stat-label">Today's Rewards</div>
                <div className="stat-trend positive">↗ +15.2%</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🎮</div>
              <div className="stat-content">
                <div className="stat-number animate-counter">
                  {stats.gamesPlayed}
                </div>
                <div className="stat-label">Games Played</div>
                <div className="stat-trend positive">↗ +8.7%</div>
              </div>
            </div>

            <div className="stat-card jackpot">
              <div className="stat-icon">🏆</div>
              <div className="stat-content">
                <div className="stat-number jackpot-amount">
                  ${formatCurrency(stats.currentJackpot)}
                </div>
                <div className="stat-label">Current Jackpot</div>
                <div className="jackpot-pulse"></div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-content">
                <div className="stat-number">
                  {formatTime(stats.averageGameTime)}
                </div>
                <div className="stat-label">Avg Game Time</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👑</div>
              <div className="stat-content">
                <div className="stat-number text-stat">
                  {stats.topPlayer}
                </div>
                <div className="stat-label">Top Player</div>
                <div className="stat-badge">Champion</div>
              </div>
            </div>
          </div>

          {/* Recent Wins Feed */}
          <div className="recent-wins">
            <div className="wins-header">
              <h3>🏆 Recent Wins</h3>
              <span className="live-badge">LIVE</span>
            </div>
            
            <div className="wins-list">
              {recentWins.map((win, index) => (
                <div key={index} className="win-item">
                  <div className="win-player">
                    <div className="player-avatar">
                      {win.player.charAt(0)}
                    </div>
                    <span className="player-name">{win.player}</span>
                  </div>
                  <div className="win-details">
                    <div className="win-amount">+{formatCurrency(win.amount)} STX</div>
                    <div className="win-time">{win.time}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="wins-footer">
              <button className="view-all-wins">View All Winners</button>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="global-progress">
          <div className="progress-header">
            <span>Daily Volume Progress</span>
            <span>$12,847 / $50,000</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: '25.7%' }}
            ></div>
          </div>
          <div className="progress-rewards">
            <span>🎁 Bonus rewards unlock at $50K volume</span>
          </div>
        </div>

        {/* Game Modes Status */}
        <div className="game-modes">
          <h3>🎯 Game Modes Status</h3>
          <div className="modes-grid">
            <div className="mode-card active">
              <div className="mode-status">🟢</div>
              <div className="mode-info">
                <div className="mode-name">Global Arena</div>
                <div className="mode-players">{stats.playersOnline}/100 players</div>
              </div>
            </div>
            
            <div className="mode-card coming-soon">
              <div className="mode-status">⚪</div>
              <div className="mode-info">
                <div className="mode-name">Tournament Mode</div>
                <div className="mode-players">Coming Soon</div>
              </div>
            </div>
            
            <div className="mode-card coming-soon">
              <div className="mode-status">⚪</div>
              <div className="mode-info">
                <div className="mode-name">Private Rooms</div>
                <div className="mode-players">Coming Soon</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};