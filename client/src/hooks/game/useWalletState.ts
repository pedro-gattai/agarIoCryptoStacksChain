import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../../contexts/WalletContext';

export interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  balance: number;
  displayAddress: string;
  error: string | null;
}

export const useWalletState = () => {
  const { wallet, connected, connecting, publicKey, balance } = useWallet();
  const [error, setError] = useState<string | null>(null);

  const walletState: WalletState = {
    isConnected: connected,
    isConnecting: connecting,
    address: publicKey?.toString() || null,
    balance: balance || 0,
    displayAddress: publicKey?.toString().slice(0, 8) + '...' + publicKey?.toString().slice(-4) || '',
    error
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleWalletError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    console.error('Wallet error:', errorMessage);
  }, []);

  // Clear errors when wallet connects successfully
  useEffect(() => {
    if (connected) {
      setError(null);
    }
  }, [connected]);

  return {
    walletState,
    clearError,
    handleWalletError
  };
};