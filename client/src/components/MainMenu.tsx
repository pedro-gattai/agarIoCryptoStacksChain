import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useSocket } from '../contexts/SocketContext';
import { WalletModal } from './WalletModal';

interface MainMenuProps {
  onEnterLobby: () => void;
  onShowLeaderboards: () => void;
  onShowAchievements: () => void;
  onShowTournaments: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onEnterLobby,
  onShowLeaderboards,
  onShowAchievements,
  onShowTournaments
}) => {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { connected, wallet, publicKey, balance, connecting } = useWallet();
  const { isConnected: socketConnected, error: socketError } = useSocket();

  const menuItems = [
    {
      id: 'play',
      title: '🎮 Play Now',
      description: 'Join the crypto battle arena',
      action: onEnterLobby,
      primary: true,
      requiresWallet: true,
      requiresSocket: true
    },
    {
      id: 'tournaments',
      title: '🏆 Tournaments',
      description: 'Compete in organized competitions',
      action: onShowTournaments,
      requiresWallet: false,
      requiresSocket: false
    },
    {
      id: 'leaderboards',
      title: '📊 Leaderboards',
      description: 'See top players and rankings',
      action: onShowLeaderboards,
      requiresWallet: false,
      requiresSocket: false
    },
    {
      id: 'achievements',
      title: '🏅 Achievements',
      description: 'Track your progress and badges',
      action: onShowAchievements,
      requiresWallet: false,
      requiresSocket: false
    }
  ];

  const handleMenuClick = (item: typeof menuItems[0]) => {
    if (item.requiresWallet && !connected) {
      setShowWalletModal(true);
      return;
    }
    
    if (item.requiresSocket && !socketConnected) {
      // Socket connection issue - show error or try to reconnect
      console.warn('Socket not connected. Please check connection.');
      return;
    }
    
    item.action();
  };

  const canUseMenuItem = (item: typeof menuItems[0]) => {
    if (item.requiresWallet && !connected) return false;
    if (item.requiresSocket && !socketConnected) return false;
    return true;
  };

  const getMenuItemStatus = (item: typeof menuItems[0]) => {
    if (item.requiresWallet && !connected) return 'Connect wallet to play';
    if (item.requiresSocket && !socketConnected) return 'Connecting to server...';
    return null;
  };

  return (
    <div className="main-menu-container">
      <div className="main-menu-background">
        <div className="animated-cells">
          {/* Animated background cells */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div 
              key={i} 
              className={`floating-cell cell-${i + 1}`}
              style={{
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + (i % 3)}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="main-menu-content">
        <div className="menu-header">
          <h1 className="game-title">
            <span className="title-icon">🔮</span>
            Agar.io Crypto
          </h1>
          <p className="game-subtitle">
            Eat, Grow, Earn • The Ultimate Crypto Battle Arena
          </p>
        </div>

        <div className="connection-status">
          <div className="status-indicators">
            <div className={`status-indicator ${socketConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-icon">{socketConnected ? '🟢' : '🔴'}</span>
              <span className="status-text">
                Server: {socketConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
            
            <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
              <span className="status-icon">{connected ? '🟢' : '⚪'}</span>
              <span className="status-text">
                Wallet: {connected ? 'Connected' : 'Not connected'}
              </span>
            </div>
          </div>

          {socketError && (
            <div className="error-alert">
              <span>⚠️ {socketError}</span>
            </div>
          )}
        </div>

        {connected && wallet && (
          <div className="player-info">
            <div className="wallet-info">
              <div className="wallet-display-mini">
                <span className="wallet-icon">{wallet.icon}</span>
                <div className="wallet-details">
                  <div className="wallet-name">{wallet.name}</div>
                  <div className="wallet-address">
                    {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
                  </div>
                  <div className="wallet-balance">
                    💰 {balance.toFixed(3)} STX
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="menu-items">
          {menuItems.map((item) => {
            const canUse = canUseMenuItem(item);
            const status = getMenuItemStatus(item);
            
            return (
              <button
                key={item.id}
                className={`menu-item ${item.primary ? 'primary' : ''} ${!canUse ? 'disabled' : ''}`}
                onClick={() => handleMenuClick(item)}
                disabled={!canUse || connecting}
              >
                <div className="menu-item-content">
                  <h3 className="menu-item-title">{item.title}</h3>
                  <p className="menu-item-description">
                    {status || item.description}
                  </p>
                </div>
                <div className="menu-item-arrow">→</div>
              </button>
            );
          })}
        </div>

        {!connected && (
          <div className="wallet-prompt">
            <h3>Ready to Play?</h3>
            <p>Connect your Stacks wallet to start earning crypto while playing!</p>
            <button 
              className="wallet-connect-main-btn"
              onClick={() => setShowWalletModal(true)}
              disabled={connecting}
            >
              <span className="wallet-icon">👛</span>
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        )}

        <div className="menu-footer">
          <div className="game-stats">
            <div className="stat">
              <span className="stat-value">1.2K+</span>
              <span className="stat-label">Active Players</span>
            </div>
            <div className="stat">
              <span className="stat-value">$45K+</span>
              <span className="stat-label">Total Rewards</span>
            </div>
            <div className="stat">
              <span className="stat-value">24/7</span>
              <span className="stat-label">Live Games</span>
            </div>
          </div>
          
          <div className="social-links">
            <a href="#" className="social-link">Discord</a>
            <a href="#" className="social-link">Twitter</a>
            <a href="#" className="social-link">Docs</a>
          </div>
        </div>
      </div>

      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnected={() => {
          setShowWalletModal(false);
          console.log('Wallet connected from main menu!');
        }}
      />
    </div>
  );
};