import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useWallet } from '../contexts/WalletContext';
import { WalletModal } from './WalletModal';
import { WalletLogo } from './WalletLogo';
import { Gamepad2, Users, Play, Wallet, Loader2, ArrowLeft, BarChart3, LogOut, ExternalLink, Copy, ChevronDown } from 'lucide-react';

interface GameLobbyProps {
  onGameStart: () => void;
  onShowLeaderboards?: () => void;
  onBackToMenu?: () => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({ onGameStart, onShowLeaderboards, onBackToMenu }) => {
  const {
    isConnected,
    error,
    clearError,
    currentRoom,
    joinGlobalRoom: socketJoinGlobalRoom
  } = useSocket();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
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
    balance,
    disconnect: disconnectWallet
  } = useWallet();

  const walletDropdownRef = useRef<HTMLDivElement>(null);

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

  // Auto-navigate to game when successfully joined a room
  useEffect(() => {
    if (currentRoom && currentRoom.id) {
      console.log('🎮 GameLobby: Room joined successfully, navigating to game', currentRoom);
      setGameStatus(prev => ({
        ...prev,
        inGame: true,
        playersOnline: currentRoom.playerCount || prev.playersOnline
      }));

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

    if (!publicKey) {
      console.error('❌ GameLobby: Cannot join global room - wallet not connected');
      return;
    }

    console.log('🚀 GameLobby: About to call socketJoinGlobalRoom()');
    socketJoinGlobalRoom(publicKey);
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

    // Check wallet connection - ALWAYS required
    if (!connected) {
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
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setShowWalletDropdown(false);
  };

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      // Could add a toast notification here
    }
  };

  const handleViewOnExplorer = () => {
    if (publicKey) {
      window.open(`https://explorer.hiro.so/address/${publicKey}?chain=testnet`, '_blank');
    }
  };

  return (
    <div className="minimal-lobby-container">
      {/* Top Navigation Bar */}
      <div className="lobby-top-bar">
        <div className="top-bar-left">
          <Gamepad2 size={28} strokeWidth={2.5} className="logo-icon" />
          <h1 className="game-title">AgarCrypto</h1>
        </div>

        <div className="top-bar-center">
          {onBackToMenu && (
            <button onClick={onBackToMenu} className="nav-btn">
              <ArrowLeft size={18} strokeWidth={2} />
              <span>Home</span>
            </button>
          )}
          {onShowLeaderboards && (
            <button onClick={onShowLeaderboards} className="nav-btn">
              <BarChart3 size={18} strokeWidth={2} />
              <span>Leaderboards</span>
            </button>
          )}
        </div>

        <div className="top-bar-right">
          {connected ? (
            <div className="wallet-dropdown-wrapper" ref={walletDropdownRef}>
              <button
                className="wallet-badge connected"
                onClick={() => setShowWalletDropdown(!showWalletDropdown)}
              >
                <WalletLogo walletName={wallet?.name || 'Hiro Wallet'} size={20} />
                <div className="wallet-text-group">
                  <span className="wallet-balance">{balance.toFixed(3)} STX</span>
                  <span className="wallet-address-short">
                    {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
                  </span>
                </div>
                <ChevronDown size={16} className={`chevron ${showWalletDropdown ? 'open' : ''}`} />
              </button>

              {showWalletDropdown && (
                <div className="wallet-dropdown-menu">
                  <div className="dropdown-header">
                    <WalletLogo walletName={wallet?.name || 'Hiro Wallet'} size={24} />
                    <div className="dropdown-header-text">
                      <span className="dropdown-wallet-name">{wallet?.name}</span>
                      <span className="dropdown-balance">{balance.toFixed(6)} STX</span>
                    </div>
                  </div>

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-item" onClick={handleCopyAddress}>
                    <Copy size={16} />
                    <span>Copy Address</span>
                  </button>

                  <button className="dropdown-item" onClick={handleViewOnExplorer}>
                    <ExternalLink size={16} />
                    <span>View on Explorer</span>
                  </button>

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-item danger" onClick={handleDisconnect}>
                    <LogOut size={16} />
                    <span>Disconnect</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="connect-wallet-btn"
              onClick={() => setShowWalletModal(true)}
              disabled={connecting}
            >
              <Wallet size={18} strokeWidth={2.5} />
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={clearError}>×</button>
        </div>
      )}

      {/* Main Play Area */}
      <div className="play-area">
        {!isConnected ? (
          <div className="play-state">
            <Loader2 size={72} className="loading-icon" />
            <h2 className="play-title">Connecting...</h2>
            <p className="play-subtitle">Establishing connection to game server</p>
          </div>
        ) : !connected ? (
          <div className="play-state">
            <Wallet size={72} strokeWidth={1.5} className="state-icon" />
            <h2 className="play-title">Connect Your Wallet</h2>
            <p className="play-subtitle">Link your Stacks wallet to join the battle and start earning rewards</p>
            <button
              className="wallet-connect-large"
              onClick={() => setShowWalletModal(true)}
              disabled={connecting}
            >
              <Wallet size={24} strokeWidth={2.5} />
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        ) : gameStatus.inQueue ? (
          <div className="play-state">
            <div className="queue-position-badge">#{gameStatus.queuePosition}</div>
            <h2 className="play-title">In Queue</h2>
            <p className="play-subtitle">Waiting for an available spot...</p>
            <div className="queue-bar">
              <div className="queue-bar-fill" style={{ width: '65%' }}></div>
            </div>
          </div>
        ) : (
          <div className="play-state">
            <h1 className="arena-title">Global Arena</h1>
            <p className="arena-subtitle">Battle. Dominate. Earn.</p>

            <button
              className="play-button-massive"
              onClick={handlePlayNow}
              disabled={!isConnected || !connected}
            >
              <Play size={48} strokeWidth={3} fill="currentColor" />
              <span>PLAY NOW</span>
            </button>

            <div className="game-stats-inline">
              <div className="stat-inline">
                <Users size={18} strokeWidth={2} />
                <span>{gameStatus.playersOnline}/{gameStatus.maxPlayers} Players</span>
              </div>
              <div className="stat-divider">•</div>
              <div className="stat-inline">
                <span>Entry: 0.01 STX</span>
              </div>
              <div className="stat-divider">•</div>
              <div className={`stat-inline status ${isConnected ? 'connected' : 'connecting'}`}>
                <div className="status-indicator"></div>
                <span>{isConnected ? 'Connected' : 'Connecting'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* How to Play - Minimal */}
      {isConnected && connected && !gameStatus.inQueue && (
        <div className="how-to-play-minimal">
          <div className="how-step">
            <span className="step-num">1</span>
            <span>Move with mouse</span>
          </div>
          <div className="how-step">
            <span className="step-num">2</span>
            <span>Eat pellets to grow</span>
          </div>
          <div className="how-step">
            <span className="step-num">3</span>
            <span>Space to split</span>
          </div>
          <div className="how-step">
            <span className="step-num">4</span>
            <span>Avoid bigger players</span>
          </div>
        </div>
      )}

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
