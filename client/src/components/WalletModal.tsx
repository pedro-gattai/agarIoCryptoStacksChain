import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { WalletLogo } from './WalletLogo';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, onConnected }) => {
  const { wallet, connecting, connected, connect, disconnect } = useWallet();
  const [error, setError] = useState<string | null>(null);

  // Auto-trigger Stacks Connect when modal opens and wallet not connected
  useEffect(() => {
    if (isOpen && !connected && !connecting) {
      handleConnect();
    }
  }, [isOpen]);

  // Auto-close modal when connection succeeds
  useEffect(() => {
    if (connected && isOpen) {
      onConnected?.();
      onClose();
    }
  }, [connected]);

  if (!isOpen) return null;

  const handleConnect = () => {
    try {
      setError(null);
      connect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  const handleDisconnect = async () => {
    try {
      setError(null);
      disconnect();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    }
  };

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>{connected ? 'Wallet Connected' : 'Connect Wallet'}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="wallet-modal-content">
          {connected && wallet ? (
            <div className="connected-wallet">
              <div className="wallet-info">
                <div className="wallet-icon">
                  <WalletLogo walletName={wallet.name} size={48} />
                </div>
                <div className="wallet-details">
                  <h3>{wallet.name}</h3>
                  <p className="wallet-address">
                    {wallet.publicKey?.slice(0, 5)}...{wallet.publicKey?.slice(-4)}
                  </p>
                </div>
              </div>

              <div className="wallet-actions">
                <button
                  className="disconnect-btn"
                  onClick={handleDisconnect}
                  disabled={connecting}
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="wallet-list">
              <p className="wallet-description">
                {connecting ? 'Opening Stacks Connect...' : 'Click below to connect your Stacks wallet'}
              </p>

              {!connecting && (
                <button
                  className="wallet-option primary-connect"
                  onClick={handleConnect}
                >
                  <div className="wallet-icon">
                    <WalletLogo walletName="Hiro Wallet" size={40} />
                  </div>
                  <div className="wallet-info">
                    <span className="wallet-name">Connect with Stacks</span>
                    <span className="wallet-status">Supports Hiro, Xverse, Leather</span>
                  </div>
                </button>
              )}

              {connecting && (
                <div className="connecting-state">
                  <div className="spinner"></div>
                  <p>Opening Stacks Connect...</p>
                  <p className="small-text">Please check your wallet extension</p>
                </div>
              )}

              <div className="wallet-help">
                <p>New to Stacks wallets?</p>
                <a
                  href="https://wallet.hiro.so/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="help-link"
                >
                  Get started with Hiro Wallet →
                </a>
              </div>
            </div>
          )}
        </div>

        {!connected && (
          <div className="wallet-modal-footer">
            <p className="security-note">
              🔒 Your wallet will only be used to sign transactions. We never store your private keys.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};