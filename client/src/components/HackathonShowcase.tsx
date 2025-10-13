import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useSocket } from '../contexts/SocketContext';

interface ShowcaseStats {
  totalGames: number;
  totalPrizePool: number;
  activePlayers: number;
  totalTransactions: number;
  avgGameDuration: number;
  topWinner: {
    address: string;
    earnings: number;
  };
}

interface LiveTransaction {
  id: string;
  type: 'join' | 'win' | 'create';
  player: string;
  amount: number;
  timestamp: number;
}

export const HackathonShowcase: React.FC = () => {
  const [stats, setStats] = useState<ShowcaseStats>({
    totalGames: 147,
    totalPrizePool: 23.45,
    activePlayers: 89,
    totalTransactions: 1203,
    avgGameDuration: 4.2,
    topWinner: {
      address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      earnings: 12.7
    }
  });

  const [liveTransactions, setLiveTransactions] = useState<LiveTransaction[]>([
    {
      id: '1',
      type: 'win',
      player: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      amount: 0.15,
      timestamp: Date.now() - 1000
    },
    {
      id: '2', 
      type: 'join',
      player: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
      amount: 0.01,
      timestamp: Date.now() - 3000
    },
    {
      id: '3',
      type: 'create', 
      player: 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
      amount: 0.01,
      timestamp: Date.now() - 5000
    }
  ]);

  const { isSignedIn, balance } = useWallet();
  const { isConnected } = useSocket();

  // Simulate live updates for demo
  useEffect(() => {
    const interval = setInterval(() => {
      // Update stats randomly
      setStats(prev => ({
        ...prev,
        totalGames: prev.totalGames + Math.floor(Math.random() * 3),
        totalPrizePool: prev.totalPrizePool + (Math.random() * 0.1),
        activePlayers: Math.max(50, prev.activePlayers + Math.floor(Math.random() * 10 - 5)),
        totalTransactions: prev.totalTransactions + Math.floor(Math.random() * 5),
      }));

      // Add new live transaction occasionally
      if (Math.random() < 0.3) {
        const types: Array<'join' | 'win' | 'create'> = ['join', 'win', 'create'];
        const addresses = [
          'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
          'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG', 
          'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
          'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND'
        ];
        
        const newTx: LiveTransaction = {
          id: Date.now().toString(),
          type: types[Math.floor(Math.random() * types.length)],
          player: addresses[Math.floor(Math.random() * addresses.length)],
          amount: Math.random() * 0.5 + 0.01,
          timestamp: Date.now()
        };

        setLiveTransactions(prev => [newTx, ...prev.slice(0, 9)]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'join': return '🎮';
      case 'win': return '🏆';
      case 'create': return '✨';
      default: return '💰';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'join': return '#4ECDC4';
      case 'win': return '#45B7D1'; 
      case 'create': return '#96CEB4';
      default: return '#FFEAA7';
    }
  };

  return (
    <div className="hackathon-showcase">
      <div className="showcase-header">
        <div className="title-section">
          <h1>🎮 AgarCoin - Live Demo</h1>
          <p>Real-time blockchain gaming on Stacks</p>
        </div>
        
        <div className="status-indicators">
          <div className={`status-pill ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {isConnected ? 'Server Connected' : 'Server Disconnected'}
          </div>
          
          <div className={`status-pill ${isSignedIn ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {isSignedIn ? 'Wallet Connected' : 'Wallet Disconnected'}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card highlight">
          <div className="stat-icon">🎮</div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalGames.toLocaleString()}</div>
            <div className="stat-label">Total Games Played</div>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalPrizePool.toFixed(2)} STX</div>
            <div className="stat-label">Total Prize Pool</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{stats.activePlayers}</div>
            <div className="stat-label">Active Players</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">{stats.totalTransactions.toLocaleString()}</div>
            <div className="stat-label">Blockchain TXs</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-number">{stats.avgGameDuration.toFixed(1)}m</div>
            <div className="stat-label">Avg Game Duration</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-number">{stats.topWinner.earnings.toFixed(2)} STX</div>
            <div className="stat-label">Top Winner</div>
            <div className="stat-subtitle">{formatAddress(stats.topWinner.address)}</div>
          </div>
        </div>
      </div>

      <div className="live-section">
        <div className="live-header">
          <h2>🔴 Live Transaction Feed</h2>
          <div className="live-indicator">
            <span className="pulse-dot"></span>
            Live Updates
          </div>
        </div>

        <div className="transactions-feed">
          {liveTransactions.map((tx) => (
            <div 
              key={tx.id} 
              className="transaction-item"
              style={{ borderLeftColor: getTransactionColor(tx.type) }}
            >
              <div className="tx-icon">{getTransactionIcon(tx.type)}</div>
              <div className="tx-content">
                <div className="tx-main">
                  <span className="tx-type">{tx.type.toUpperCase()}</span>
                  <span className="tx-amount">{tx.amount.toFixed(3)} STX</span>
                </div>
                <div className="tx-details">
                  <span className="tx-player">{formatAddress(tx.player)}</span>
                  <span className="tx-time">{formatTime(tx.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="demo-actions">
        <div className="action-group">
          <h3>🎯 Try the Demo</h3>
          <div className="action-buttons">
            <button className="demo-btn primary">
              🎮 Join Live Game
            </button>
            <button className="demo-btn secondary">
              👛 Connect Wallet
            </button>
            <button className="demo-btn secondary">
              📊 View Leaderboard
            </button>
          </div>
        </div>

        <div className="tech-stack">
          <h3>🛠️ Built With</h3>
          <div className="tech-badges">
            <span className="tech-badge">Stacks</span>
            <span className="tech-badge">Clarity</span>
            <span className="tech-badge">React</span>
            <span className="tech-badge">TypeScript</span>
            <span className="tech-badge">Socket.io</span>
            <span className="tech-badge">PostgreSQL</span>
          </div>
        </div>
      </div>

    </div>
  );
};