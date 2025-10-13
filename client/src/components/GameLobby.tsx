import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useWallet } from '../contexts/WalletContext';
import { WalletModal } from './WalletModal';
import { WalletLogo } from './WalletLogo';
import { DEMO_CONSTANTS } from 'shared';
import { Gamepad2, Users, Target, Coins, Trophy, Play, Wallet, Loader2, ArrowLeft, Award, BarChart3 } from 'lucide-react';

interface GameLobbyProps {
  onGameStart: () => void;
  onShowLeaderboards?: () => void;
  onShowAchievements?: () => void;
  onBackToMenu?: () => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({ onGameStart, onShowLeaderboards, onShowAchievements, onBackToMenu }) => {
  const { 
    isConnected, 
    error, 
    clearError,
    currentRoom,
    joinGlobalRoom: socketJoinGlobalRoom
  } = useSocket();
  
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [gameStatus, setGameStatus] = useState({
    playersOnline: 0,
    maxPlayers: 100,
    queuePosition: 0,
    inQueue: false,
    inGame: false
  });
  
  const { 
    wallet, 
    connected, 
    connecting, 
    publicKey, 
    balance 
  } = useWallet();

  // REMOVED: Auto-join on mount
  // Players must now manually click "PLAY NOW" to join the game

  // Auto-navigate to game when successfully joined a room
  useEffect(() => {
    if (currentRoom && currentRoom.id) {
      console.log('🎮 GameLobby: Room joined successfully, navigating to game', currentRoom);
      setGameStatus(prev => ({
        ...prev,
        inGame: true,
        playersOnline: currentRoom.playerCount || prev.playersOnline
      }));
      
      // Small delay to ensure GameEngine is ready
      setTimeout(() => {
        console.log('🚀 GameLobby: Auto-starting game after successful room join...');
        onGameStart();
      }, 500);
    }
  }, [currentRoom, onGameStart]);

  const joinGlobalRoom = () => {
    console.log('🎯 GameLobby: joinGlobalRoom() called');
    
    if (!isConnected) {
      console.error('❌ GameLobby: Cannot join global room - not connected to server');
      return;
    }
    
    console.log('🚀 GameLobby: About to call socketJoinGlobalRoom()');
    
    
    console.log('🌐 GameLobby: Attempting to join global room', {
      wallet: publicKey,
      connected,
      isConnected,
      timestamp: new Date().toISOString()
    });
    
    // Use demo wallet in demo mode, otherwise use real wallet
    const walletToUse = DEMO_CONSTANTS.ENABLED ? DEMO_CONSTANTS.DEMO_WALLET_ADDRESS : (publicKey || undefined);
    socketJoinGlobalRoom(walletToUse);
  };

  const handlePlayNow = () => {
    console.log('🎮 GameLobby: HandlePlayNow called', {
      connected,
      isConnected,
      inGame: gameStatus.inGame,
      hasCurrentRoom: !!currentRoom,
      publicKey,
      timestamp: new Date().toISOString()
    });

    // Check wallet connection (skip in demo mode)
    if (!connected && !DEMO_CONSTANTS.ENABLED) {
      console.log('💳 GameLobby: Wallet not connected, showing modal');
      setShowWalletModal(true);
      return;
    }
    
    if (!isConnected) {
      console.log('❌ GameLobby: Not connected to server');
      return;
    }
    
    if (currentRoom && currentRoom.id) {
      console.log('🎮 GameLobby: Already in room, starting game immediately...');
      onGameStart();
    } else {
      console.log('🌐 GameLobby: Attempting to join global room...');
      joinGlobalRoom();
      // The useEffect will handle navigation once currentRoom is set
    }
  };

  return (
    <div className="global-lobby-container">
      <div className="lobby-header">
        <div className="header-left">
          <div className="lobby-title">
            <Gamepad2 size={40} strokeWidth={2.5} className="lobby-icon" />
            <div>
              <h1>Global Arena</h1>
              <p>Join {gameStatus.maxPlayers} players in epic battles!</p>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          {DEMO_CONSTANTS.ENABLED ? (
            <div className="wallet-display demo-mode">
              <Gamepad2 size={32} strokeWidth={2} className="wallet-icon-svg" />
              <div className="wallet-info">
                <div className="wallet-name">Demo Mode</div>
                <div className="wallet-balance">∞ Demo STX</div>
                <div className="wallet-address">DEMO_MODE</div>
              </div>
            </div>
          ) : connected ? (
            <div className="wallet-display connected">
              <WalletLogo walletName={wallet?.name || 'Hiro Wallet'} size={32} />
              <div className="wallet-info">
                <div className="wallet-name">{wallet?.name}</div>
                <div className="wallet-balance">{balance.toFixed(3)} STX</div>
                <div className="wallet-address">
                  {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
                </div>
              </div>
            </div>
          ) : (
            <button
              className="wallet-connect-btn"
              onClick={() => setShowWalletModal(true)}
              disabled={connecting}
            >
              <Wallet size={20} strokeWidth={2.5} />
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={clearError}>×</button>
        </div>
      )}

      <div className="global-lobby-content">
        {/* Connection Status */}
        <div className="connection-status">
          <div className={`status-indicator ${isConnected ? 'connected' : 'connecting'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {isConnected ? 'Connected to Global Arena' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Global Game Stats */}
        <div className="global-game-stats">
          <div className="stat-card">
            <Users size={40} strokeWidth={2} className="stat-icon-svg" />
            <div className="stat-content">
              <div className="stat-number">{gameStatus.playersOnline}</div>
              <div className="stat-label">Players Online</div>
            </div>
          </div>

          <div className="stat-card">
            <Target size={40} strokeWidth={2} className="stat-icon-svg" />
            <div className="stat-content">
              <div className="stat-number">{gameStatus.maxPlayers}</div>
              <div className="stat-label">Max Capacity</div>
            </div>
          </div>

          <div className="stat-card">
            <Coins size={40} strokeWidth={2} className="stat-icon-svg" />
            <div className="stat-content">
              <div className="stat-number">0.01</div>
              <div className="stat-label">Entry Fee (STX)</div>
            </div>
          </div>

          <div className="stat-card">
            <Trophy size={40} strokeWidth={2} className="stat-icon-svg" />
            <div className="stat-content">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Always Active</div>
            </div>
          </div>
        </div>

        {/* Main Action Area */}
        <div className="main-action-area">
          {!isConnected ? (
            <div className="connecting-state">
              <Loader2 size={48} className="loading-spinner-icon" />
              <h3>Connecting to Global Arena...</h3>
              <p>Please wait while we connect you to the game server.</p>
            </div>
          ) : !connected && !DEMO_CONSTANTS.ENABLED ? (
            <div className="wallet-required">
              <Wallet size={64} strokeWidth={2} className="wallet-icon-large-svg" />
              <h3>Connect Your Wallet</h3>
              <p>Connect your Stacks wallet to join the battle and start earning!</p>
              <button
                className="connect-wallet-large"
                onClick={() => setShowWalletModal(true)}
                disabled={connecting}
              >
                <Wallet size={20} strokeWidth={2.5} />
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          ) : gameStatus.inQueue ? (
            <div className="queue-state">
              <div className="queue-icon">⏰</div>
              <h3>In Queue</h3>
              <div className="queue-info">
                <p>Position: <span className="queue-position">#{gameStatus.queuePosition}</span></p>
                <p>You'll be automatically added when a spot opens up!</p>
              </div>
              <div className="queue-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '65%' }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="ready-to-play">
              <Gamepad2 size={64} strokeWidth={2} className="play-icon-svg" />
              <h3>Ready to Battle!</h3>
              <p>Jump into the global arena and compete with {gameStatus.playersOnline} players!</p>

              <button
                className="play-now-btn"
                onClick={handlePlayNow}
                disabled={!isConnected || (!connected && !DEMO_CONSTANTS.ENABLED)}
              >
                <Play size={24} strokeWidth={2.5} fill="currentColor" />
                <span>PLAY NOW</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="lobby-actions">
          {onBackToMenu && (
            <button
              onClick={onBackToMenu}
              className="back-to-menu-btn"
            >
              <ArrowLeft size={20} strokeWidth={2} />
              <span>Back to Home</span>
            </button>
          )}
          {onShowLeaderboards && (
            <button
              onClick={onShowLeaderboards}
              className="leaderboards-btn"
            >
              <BarChart3 size={20} strokeWidth={2} />
              <span>Leaderboards</span>
            </button>
          )}
          {onShowAchievements && (
            <button
              onClick={onShowAchievements}
              className="achievements-btn"
            >
              <Award size={20} strokeWidth={2} />
              <span>Achievements</span>
            </button>
          )}
        </div>
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