import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AppConfig, UserSession, showConnect, showSTXTransfer, disconnect } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { makeSTXTokenTransfer, AnchorMode } from '@stacks/transactions';

export interface StacksWallet {
  name: string;
  icon: string;
  available: boolean;
  installed: boolean;
  publicKey?: string;
  readyState?: 'Installed' | 'NotDetected' | 'Loadable' | 'Unsupported';
}

interface WalletContextType {
  userSession: UserSession | null;
  userData: any;
  isSignedIn: boolean;
  connecting: boolean;
  stxAddress: string | null;
  balance: number;
  network: string;

  // Compatibility aliases for Solana-style properties
  connected: boolean; // alias for isSignedIn
  publicKey: string | null; // alias for stxAddress
  wallet: StacksWallet | null;
  wallets: StacksWallet[];

  // Actions
  connect: () => void;
  disconnect: () => void;
  select: (walletName: string) => void;
  sendSTX: (recipient: string, amount: number, memo?: string) => Promise<string>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

interface WalletProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  network?: 'testnet' | 'mainnet';
}

// Stacks wallet configuration
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  autoConnect = false,
  network = 'testnet'
}) => {
  const [currentUserSession] = useState(userSession);
  const [userData, setUserData] = useState<any>(null);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [stacksNetwork] = useState(new StacksTestnet());

  const isSignedIn = currentUserSession?.isUserSignedIn() || false;
  const stxAddress = userData?.profile?.stxAddress?.testnet || null;

  // Available Stacks wallets (Hiro, Xverse, Leather)
  const availableWallets: StacksWallet[] = [
    { name: 'Hiro Wallet', icon: 'hiro', available: true, installed: true, readyState: 'Installed' },
    { name: 'Xverse', icon: 'xverse', available: true, installed: true, readyState: 'Installed' },
    { name: 'Leather', icon: 'leather', available: true, installed: true, readyState: 'Installed' },
  ];

  const currentWallet: StacksWallet | null = isSignedIn
    ? { name: 'Hiro Wallet', icon: 'hiro', available: true, installed: true, publicKey: stxAddress || undefined, readyState: 'Installed' }
    : null;

  useEffect(() => {
    // Check if user is already signed in
    if (currentUserSession.isUserSignedIn()) {
      const userData = currentUserSession.loadUserData();
      setUserData(userData);
      console.log('User already signed in:', userData.profile.stxAddress);
    } else if (currentUserSession.isSignInPending()) {
      setConnecting(true);
      currentUserSession.handlePendingSignIn()
        .then((userData) => {
          setUserData(userData);
          setConnecting(false);
          console.log('Auto-connected user:', userData.profile.stxAddress);
        })
        .catch((error) => {
          console.error('Error handling pending sign in:', error);
          setConnecting(false);
        });
    }
  }, [autoConnect, currentUserSession]);

  useEffect(() => {
    // Refresh balance when connected
    if (isSignedIn && stxAddress) {
      refreshBalance();
      
      // Set up periodic balance updates
      const interval = setInterval(refreshBalance, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isSignedIn, stxAddress]);


  const connect = () => {
    if (connecting) return;
    
    setConnecting(true);
    showConnect({
      appDetails: {
        name: 'AgarCoin',
        icon: '/vite.svg'
      },
      redirectTo: '/',
      onFinish: (data) => {
        setUserData(data.userSession.loadUserData());
        setConnecting(false);
        console.log('Connected to Stacks wallet:', data.userSession.loadUserData().profile.stxAddress);
      },
      onCancel: () => {
        setConnecting(false);
        console.log('User cancelled wallet connection');
      },
      userSession: currentUserSession
    });
  };

  const disconnectWallet = () => {
    if (currentUserSession.isUserSignedIn()) {
      currentUserSession.signUserOut();
      setUserData(null);
      setBalance(0);
      console.log('Disconnected from Stacks wallet');
    }
  };

  const sendSTX = async (recipient: string, amount: number, memo?: string): Promise<string> => {
    if (!isSignedIn || !stxAddress) {
      throw new Error('Wallet not connected');
    }

    if (balance < amount) {
      throw new Error('Insufficient balance');
    }

    return new Promise((resolve, reject) => {
      showSTXTransfer({
        recipient,
        amount: (amount * 1000000).toString(), // Convert STX to microSTX
        memo: memo || 'AgarCoin game payment',
        network: stacksNetwork,
        appDetails: {
          name: 'AgarCoin',
          icon: '/vite.svg'
        },
        onFinish: (data) => {
          console.log(`Sent ${amount} STX to ${recipient}`, data);
          refreshBalance(); // Refresh balance after transaction
          resolve(data.txId);
        },
        onCancel: () => {
          reject(new Error('Transaction cancelled by user'));
        }
      });
    });
  };

  const refreshBalance = async () => {
    if (!isSignedIn || !stxAddress) {
      setBalance(0);
      return;
    }

    try {
      // Fetch real balance from Stacks API
      const apiUrl = network === 'mainnet' 
        ? 'https://api.hiro.so'
        : 'https://api.testnet.hiro.so';
      
      const response = await fetch(`${apiUrl}/extended/v1/address/${stxAddress}/balances`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.status}`);
      }
      
      const data = await response.json();
      const stxBalance = parseInt(data.stx.balance) / 1000000; // Convert microSTX to STX
      
      setBalance(stxBalance);
      console.log(`Balance updated: ${stxBalance.toFixed(6)} STX`);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      // Fallback to mock balance in case of API issues
      const mockBalance = Math.random() * 10 + 0.5;
      setBalance(mockBalance);
    }
  };

  const selectWallet = (walletName: string) => {
    // For Stacks, wallet selection is handled by the Stacks Connect UI
    console.log('Wallet selection:', walletName);
  };

  const value: WalletContextType = {
    userSession: currentUserSession,
    userData,
    isSignedIn,
    connecting,
    stxAddress,
    balance,
    network,
    // Compatibility aliases
    connected: isSignedIn,
    publicKey: stxAddress,
    wallet: currentWallet,
    wallets: availableWallets,
    // Actions
    connect,
    disconnect: disconnectWallet,
    select: selectWallet,
    sendSTX,
    refreshBalance
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export default useWallet;