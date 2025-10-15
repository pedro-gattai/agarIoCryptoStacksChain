import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useWallet } from '../contexts/WalletContext';
import { WalletLogo } from './WalletLogo';
import { Gamepad2, Users, Play, Wallet, Loader2, ArrowLeft, BarChart3, LogOut, ExternalLink, Copy, ChevronDown, AlertCircle } from 'lucide-react';
import { getSocketService } from '../services/socketService';
import { uintCV, makeStandardSTXPostCondition, FungibleConditionCode } from '@stacks/transactions';

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
    joinGlobalRoom: socketJoinGlobalRoom,
    joinGlobalRoomWithPayment
  } = useSocket();

  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'signing' | 'processing' | 'verifying' | 'error'>('idle');
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [contractGameId, setContractGameId] = useState<number | null>(null);
  const [blockchainGameStatus, setBlockchainGameStatus] = useState<'waiting' | 'active' | 'finished'>('waiting');
  const [gameStartsAt, setGameStartsAt] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
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
    connect,
    disconnect: disconnectWallet,
    sendSTX,
    callContractFunction
  } = useWallet();

  const walletDropdownRef = useRef<HTMLDivElement>(null);

  // Request and listen for contract game ID from multiple sources
  useEffect(() => {
    const socketService = getSocketService();

    // Listen for contract game ID from dedicated event
    const handleContractGameId = (data: { contractGameId: number | null }) => {
      console.log('📥 [CONTRACT_ID] Received from contract_game_id event:', data.contractGameId);
      setContractGameId(data.contractGameId);
    };

    // Listen for contract game ID from initial_room_status
    const handleInitialStatus = (data: any) => {
      if (data.contractGameId !== undefined) {
        console.log('📥 [CONTRACT_ID] Received from initial_room_status:', data.contractGameId);
        setContractGameId(data.contractGameId);
      }
    };

    // Listen for contract game ID from join_success
    const handleJoinSuccess = (data: any) => {
      if (data.contractGameId !== undefined) {
        console.log('📥 [CONTRACT_ID] Received from join_success:', data.contractGameId);
        setContractGameId(data.contractGameId);
      }
    };

    // Listen for game starting soon event (when first player joins)
    const handleGameStartingSoon = (data: any) => {
      console.log('⏰ [GAME_STATUS] Game starting soon!', data);
      setGameStartsAt(data.startsAt);
      setBlockchainGameStatus('waiting');
    };

    // Listen for blockchain game started event
    const handleBlockchainGameStarted = (data: any) => {
      console.log('🚀 [GAME_STATUS] Blockchain game started!', data);
      setBlockchainGameStatus('active');
      setGameStartsAt(null);
      setCountdownSeconds(0);
    };

    // Listen for round ended event
    const handleRoundEnded = (data: any) => {
      console.log('🏁 [GAME_STATUS] Round ended!', data);
      setBlockchainGameStatus('finished');
    };

    // Listen for round reset event
    const handleRoundReset = (data: any) => {
      console.log('🔄 [GAME_STATUS] Round reset!', data);
      setBlockchainGameStatus('waiting');
      setGameStartsAt(null);
      setCountdownSeconds(0);
    };

    socketService.on('contract_game_id', handleContractGameId);
    socketService.on('initial_room_status', handleInitialStatus);
    socketService.on('join_success', handleJoinSuccess);
    socketService.on('game_starting_soon', handleGameStartingSoon);
    socketService.on('blockchain_game_started', handleBlockchainGameStarted);
    socketService.on('round_ended', handleRoundEnded);
    socketService.on('round_reset', handleRoundReset);

    // Request the contract game ID explicitly
    if (isConnected) {
      console.log('📤 [CONTRACT_ID] Requesting contract game ID...');
      socketService.sendToServer('get_contract_game_id', {});
    }

    return () => {
      socketService.off('contract_game_id', handleContractGameId);
      socketService.off('initial_room_status', handleInitialStatus);
      socketService.off('join_success', handleJoinSuccess);
      socketService.off('game_starting_soon', handleGameStartingSoon);
      socketService.off('blockchain_game_started', handleBlockchainGameStarted);
      socketService.off('round_ended', handleRoundEnded);
      socketService.off('round_reset', handleRoundReset);
    };
  }, [isConnected]);

  // Countdown timer effect
  useEffect(() => {
    if (gameStartsAt && blockchainGameStatus === 'waiting') {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((gameStartsAt - now) / 1000));
        setCountdownSeconds(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameStartsAt, blockchainGameStatus]);

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

      // Reset transaction status when entering game
      setProcessingPayment(false);
      setTransactionStatus('idle');
      setTransactionError(null);

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

  const handlePlayNow = async () => {
    console.log('🎮 [PLAY_NOW] HandlePlayNow called', {
      connected,
      isConnected,
      inGame: gameStatus.inGame,
      hasCurrentRoom: !!currentRoom,
      publicKey,
      contractGameId,
      blockchainGameStatus,
      countdownSeconds,
      timestamp: new Date().toISOString()
    });

    // Check wallet connection - ALWAYS required
    if (!connected) {
      console.log('💳 GameLobby: Wallet not connected, calling connect()');
      connect(); // v7 uses callbacks, no await needed
      return;
    }

    if (!isConnected) {
      console.log('❌ GameLobby: Not connected to server');
      return;
    }

    // Check blockchain game status
    if (blockchainGameStatus === 'active') {
      console.log('⏰ GameLobby: Game is ACTIVE, cannot join');
      setTransactionError('Game in progress. Please wait for the next round.');
      setTimeout(() => setTransactionError(null), 5000);
      return;
    }

    if (blockchainGameStatus === 'finished') {
      console.log('🏁 GameLobby: Game is FINISHED, waiting for new round');
      setTransactionError('Game has ended. New round starting soon...');
      setTimeout(() => setTransactionError(null), 5000);
      return;
    }

    if (currentRoom && currentRoom.id) {
      console.log('🎮 GameLobby: Already in room, starting game immediately...');
      onGameStart();
      return;
    }

    // Start payment process via smart contract
    try {
      setProcessingPayment(true);
      setTransactionStatus('signing');
      setTransactionError(null);

      // Check if we have contract game ID
      if (contractGameId === null) {
        throw new Error('Contract game not initialized. Please wait and try again.');
      }

      // Get the contract address and name from env
      const contractAddress = process.env.REACT_APP_STACKS_CONTRACT_ADDRESS || 'ST1ZFTT97Z1BBTD5Y2JK7N1Y3MJ9SYCDN1F4803GZ';
      const contractName = process.env.REACT_APP_STACKS_CONTRACT_NAME || 'game-pool';
      const entryFee = 1; // Entry fee in STX

      console.log('💰 GameLobby: Calling join-game contract function', {
        contractAddress,
        contractName,
        contractGameId,
        entryFee,
        publicKey
      });

      // Create post condition to allow up to entryFee STX (includes gas fees)
      // Using LessEqual instead of Equal to prevent post-condition failures
      const postCondition = makeStandardSTXPostCondition(
        publicKey!,
        FungibleConditionCode.LessEqual,  // Allow gas fees
        BigInt(entryFee * 1000000) // Maximum 1 STX (convert to microSTX)
      );

      console.log('💰 GameLobby: Post-condition set to LessEqual', entryFee, 'STX');

      // Call the join-game contract function
      const txId = await callContractFunction(
        contractAddress,
        contractName,
        'join-game',
        [uintCV(contractGameId)],
        [postCondition]
      );

      console.log('✅ GameLobby: Contract call submitted:', txId);
      setTransactionStatus('verifying');

      // Join the game with payment proof
      if (publicKey && txId) {
        joinGlobalRoomWithPayment(publicKey, txId, entryFee);
      } else {
        throw new Error('Missing wallet address or transaction ID');
      }

    } catch (error) {
      console.error('❌ GameLobby: Contract call failed:', error);
      setTransactionStatus('error');
      setTransactionError(error instanceof Error ? error.message : 'Contract call failed. Please try again.');

      // Reset after 5 seconds
      setTimeout(() => {
        setTransactionStatus('idle');
        setTransactionError(null);
      }, 5000);
    } finally {
      setProcessingPayment(false);
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
              onClick={connect} // v7 uses callbacks, not async
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
              onClick={connect} // v7 uses callbacks, not async
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

            {/* Countdown display when game is starting soon */}
            {countdownSeconds > 0 && blockchainGameStatus === 'waiting' && (
              <div className="countdown-banner">
                <div className="countdown-timer">
                  <span className="countdown-label">⏱️ Join Window Open</span>
                  <span className="countdown-value">Game starts in {countdownSeconds}s</span>
                </div>
                <div className="countdown-bar">
                  <div
                    className="countdown-bar-fill"
                    style={{ width: `${(countdownSeconds / 30) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Game status messages */}
            {blockchainGameStatus === 'active' && (
              <div className="game-status-message active">
                <AlertCircle size={20} />
                <div className="game-status-text">
                  <strong>Game in Progress</strong>
                  <span>Next round starts after current game ends (5 min rounds)</span>
                </div>
              </div>
            )}

            {blockchainGameStatus === 'finished' && (
              <div className="game-status-message waiting">
                <Loader2 size={20} className="loading-icon" />
                <div className="game-status-text">
                  <strong>Round Ended</strong>
                  <span>New round starting soon...</span>
                </div>
              </div>
            )}

            {processingPayment ? (
              <div className="transaction-status">
                <Loader2 size={48} className="loading-icon" />
                <div className="transaction-message">
                  {transactionStatus === 'signing' && 'Waiting for wallet signature...'}
                  {transactionStatus === 'processing' && 'Processing transaction...'}
                  {transactionStatus === 'verifying' && 'Verifying payment...'}
                </div>
              </div>
            ) : transactionError ? (
              <div className="transaction-error">
                <AlertCircle size={48} />
                <p>{transactionError}</p>
                <button
                  className="play-button-massive"
                  onClick={handlePlayNow}
                  disabled={!isConnected || !connected}
                >
                  <Play size={48} strokeWidth={3} fill="currentColor" />
                  <span>TRY AGAIN</span>
                </button>
              </div>
            ) : (
              <button
                className={`play-button-massive ${
                  blockchainGameStatus === 'active' ? 'disabled' :
                  blockchainGameStatus === 'finished' ? 'disabled' :
                  countdownSeconds > 0 ? 'waiting' : ''
                }`}
                onClick={handlePlayNow}
                disabled={!isConnected || !connected || processingPayment || blockchainGameStatus !== 'waiting'}
              >
                <Play size={48} strokeWidth={3} fill="currentColor" />
                <span>
                  {blockchainGameStatus === 'active' ? 'GAME IN PROGRESS' :
                   blockchainGameStatus === 'finished' ? 'ROUND ENDED' :
                   countdownSeconds > 0 ? `JOIN NOW (${countdownSeconds}s)` :
                   'PLAY NOW'}
                </span>
                {blockchainGameStatus === 'active' && (
                  <span className="button-status-text">Wait for next round</span>
                )}
                {blockchainGameStatus === 'finished' && (
                  <span className="button-status-text">New round starting...</span>
                )}
              </button>
            )}

            <div className="game-stats-inline">
              <div className="stat-inline">
                <Users size={18} strokeWidth={2} />
                <span>{gameStatus.playersOnline}/{gameStatus.maxPlayers} Players</span>
              </div>
              <div className="stat-divider">•</div>
              <div className="stat-inline">
                <span>Entry: 1 STX</span>
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
    </div>
  );
};
