import React from 'react';
import { useWalletState } from '../../hooks/game/useWalletState';
import { ActionButton } from '../ui/ActionButton';

interface WalletConnectionProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
  showBalance?: boolean;
  showAddress?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const WalletConnection: React.FC<WalletConnectionProps> = ({
  onConnect,
  onDisconnect,
  showBalance = true,
  showAddress = true,
  size = 'medium',
  className = ''
}) => {
  const { walletState, clearError } = useWalletState();

  const handleConnect = () => {
    clearError();
    if (onConnect) {
      onConnect();
    }
  };

  const handleDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    }
  };

  if (walletState.isConnected) {
    return (
      <div className={`wallet-connected ${className}`}>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            border: '1px solid #333'
          }}
        >
          {/* Wallet Status Indicator */}
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#51CF66',
              flexShrink: 0
            }}
          />

          {/* Wallet Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {showAddress && (
              <div 
                style={{ 
                  fontSize: '12px', 
                  color: '#888', 
                  marginBottom: '2px' 
                }}
              >
                {walletState.displayAddress}
              </div>
            )}
            
            {showBalance && (
              <div 
                style={{ 
                  fontSize: '14px', 
                  color: '#fff',
                  fontWeight: '500' 
                }}
              >
                {walletState.balance.toFixed(4)} STX
              </div>
            )}
          </div>

          {/* Disconnect Button */}
          <ActionButton
            onClick={handleDisconnect}
            variant="secondary"
            size="small"
            style={{ minWidth: 'auto', padding: '4px 8px' }}
          >
            Disconnect
          </ActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className={`wallet-disconnected ${className}`}>
      <ActionButton
        onClick={handleConnect}
        variant="primary"
        size={size}
        loading={walletState.isConnecting}
        disabled={walletState.isConnecting}
      >
        {walletState.isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </ActionButton>
      
      {walletState.error && (
        <div 
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#FF6B6B20',
            border: '1px solid #FF6B6B40',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#FF6B6B'
          }}
        >
          {walletState.error}
        </div>
      )}
    </div>
  );
};