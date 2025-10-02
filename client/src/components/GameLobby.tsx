import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useWallet } from '../contexts/WalletContext';
import { WalletModal } from './WalletModal';
import { DEMO_CONSTANTS } from 'shared';

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

  // Simplified auto-join for demo mode - always join when connected in demo mode
  useEffect(() => {
    console.log('🔍 GameLobby: Checking join conditions:', {
      isConnected,
      connected,
      DEMO_ENABLED: DEMO_CONSTANTS.ENABLED,
      inDemoMode: DEMO_CONSTANTS.ENABLED && !connected
    });
    
    // In demo mode, only require socket connection
    if (DEMO_CONSTANTS.ENABLED && isConnected) {
      console.log('✅ GameLobby: Demo mode - auto-joining with socket connection');
      joinGlobalRoom();
    }
    // In production mode, require both socket and wallet
    else if (!DEMO_CONSTANTS.ENABLED && isConnected && connected) {
      console.log('✅ GameLobby: Production mode - joining with wallet connection');
      joinGlobalRoom();
    } else {
      console.log('❌ GameLobby: Conditions NOT met:', {
        needsDemoMode: !DEMO_CONSTANTS.ENABLED && !connected,
        needsSocket: !isConnected
      });
    }
  }, [isConnected, connected]);

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
          <h1>🎮 Global Arena</h1>
          <p>Join {gameStatus.maxPlayers} players in epic battles!</p>
        </div>
        
        <div className="header-right">
          {DEMO_CONSTANTS.ENABLED ? (
            <div className="wallet-display">
              <div className="wallet-icon">🎮</div>
              <div className="wallet-info">
                <div className="wallet-name">Demo Mode</div>
                <div className="wallet-balance">∞ Demo STX</div>
                <div className="wallet-address">DEMO_MODE</div>
              </div>
            </div>
          ) : connected ? (
            <div className="wallet-display">
              <div className="wallet-icon">{wallet?.icon}</div>
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
              <span className="wallet-icon">👛</span>
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
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{gameStatus.playersOnline}</div>
              <div className="stat-label">Players Online</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-number">{gameStatus.maxPlayers}</div>
              <div className="stat-label">Max Capacity</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-number">0.01</div>
              <div className="stat-label">Entry Fee (STX)</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
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
              <div className="loading-spinner"></div>
              <h3>Connecting to Global Arena...</h3>
              <p>Please wait while we connect you to the game server.</p>
            </div>
          ) : !connected ? (
            <div className="wallet-required">
              <div className="wallet-icon-large">👛</div>
              <h3>Connect Your Wallet</h3>
              <p>Connect your Stacks wallet to join the battle and start earning!</p>
              <button 
                className="connect-wallet-large"
                onClick={() => setShowWalletModal(true)}
                disabled={connecting}
              >
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
              <div className="play-icon">🎮</div>
              <h3>Ready to Battle!</h3>
              <p>Jump into the global arena and compete with {gameStatus.playersOnline} players!</p>
              
              <button 
                className="play-now-btn"
                onClick={handlePlayNow}
                disabled={!isConnected || !connected}
              >
                <span className="btn-icon">🚀</span>
                PLAY NOW
              </button>
              
              <div className="game-info">
                <p>💎 Entry Fee: 0.01 STX</p>
                <p>🏆 Win Rate: Skill-based rewards</p>
                <p>⚡ Instant payouts to your wallet</p>
              </div>
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
              ← Back to Home
            </button>
          )}
          {onShowLeaderboards && (
            <button 
              onClick={onShowLeaderboards}
              className="leaderboards-btn"
            >
              🏆 Leaderboards
            </button>
          )}
          {onShowAchievements && (
            <button 
              onClick={onShowAchievements}
              className="achievements-btn"
            >
              🏅 Achievements
            </button>
          )}
        </div>

        {/* How It Works */}
        <div className="how-it-works">
          <h3>How It Works</h3>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Connect Wallet</h4>
                <p>Link your Stacks wallet</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Join Arena</h4>
                <p>Enter the global battlefield</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Play & Earn</h4>
                <p>Win games, earn STX rewards</p>
              </div>
            </div>
          </div>
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