import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { getSocketService } from '../../services/socketService';
import type { SocketService } from '../../services/socketService';

interface ConnectionContextType {
  isConnected: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
  socketService: SocketService;
}

const ConnectionContext = createContext<ConnectionContextType | null>(null);

interface ConnectionProviderProps {
  children: ReactNode;
  serverUrl?: string;
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({
  children,
  serverUrl = 'http://localhost:3000'
}) => {
  const socketService = getSocketService();
  const clientIdRef = useRef<string | null>(null);
  
  const [isConnected, setIsConnected] = useState(socketService.getConnectionStatus());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔌 ConnectionProvider: Setting up connection management');
    
    // Register client
    clientIdRef.current = socketService.registerClient();

    // Setup connection event listeners
    const setupConnectionListeners = () => {
      socketService.on('connect', () => {
        console.log('🔌 ConnectionProvider: Connected to server');
        setIsConnected(true);
        setError(null);
      });

      socketService.on('disconnect', () => {
        console.log('🔌 ConnectionProvider: Disconnected from server');
        setIsConnected(false);
      });

      socketService.on('error', (errorData: { message: string }) => {
        setError(errorData.message);
        console.error('🔌 ConnectionProvider: Socket error:', errorData.message);
      });
    };

    setupConnectionListeners();

    // Auto-connect on mount
    const autoConnect = async () => {
      try {
        await socketService.connect(serverUrl);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error('🔌 ConnectionProvider: Auto-connect failed:', err);
        setError('Failed to connect to game server');
        setIsConnected(false);
      }
    };

    autoConnect();

    // Cleanup
    return () => {
      console.log('🧹 ConnectionProvider: Cleanup starting');
      socketService.unregisterClient();
      console.log('🧹 ConnectionProvider: Cleanup completed');
    };
  }, [serverUrl, socketService]);

  const connect = async () => {
    try {
      console.log('🔌 ConnectionProvider: Manual connect attempt');
      
      if (socketService.getConnectionStatus()) {
        setIsConnected(true);
        setError(null);
        return;
      }
      
      await socketService.connect(serverUrl);
      setIsConnected(true);
      setError(null);
    } catch (error) {
      console.error('🔌 ConnectionProvider: Connect failed:', error);
      setError('Failed to connect to game server');
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    console.log('🔌 ConnectionProvider: Manual disconnect');
    socketService.disconnect();
    setIsConnected(false);
  };

  const clearError = () => {
    setError(null);
  };

  const value: ConnectionContextType = {
    isConnected,
    error,
    connect,
    disconnect,
    clearError,
    socketService
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = (): ConnectionContextType => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};