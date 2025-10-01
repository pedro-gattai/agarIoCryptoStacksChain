import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { getSocketService } from '../services/socketService';
// import type { SocketService } from '../services/socketService';
import type { GameRoom, GameUpdate } from 'shared';
import { gameEngineManager } from '../services/GameEngineManager';

interface SocketContextType {
  isConnected: boolean;
  currentRoom: GameRoom | null;
  availableRooms: GameRoom[];
  gameUpdate: GameUpdate | null;
  error: string | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  createRoom: (entryFee: number, maxPlayers?: number) => void;
  joinRoom: (roomId: string, walletAddress?: string) => void;
  joinGlobalRoom: (walletAddress?: string) => void;
  getRooms: () => void;
  sendInput: (mousePosition: { x: number; y: number }, actions?: string[]) => void;
  split: () => void;
  ejectMass: () => void;
  playerReady: () => void;
  clearError: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: ReactNode;
  serverUrl?: string;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ 
  children, 
  serverUrl = 'http://localhost:3000' 
}) => {
  // Use singleton socket service for multi-tab support
  const socketService = getSocketService();
  const clientIdRef = useRef<string | null>(null);
  
  const [isConnected, setIsConnected] = useState(socketService.getConnectionStatus());
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([]);
  const [gameUpdate, setGameUpdate] = useState<GameUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure GameEngineManager singleton is initialized early
    gameEngineManager; // This will trigger singleton creation if not already done
    
    // Register this client instance
    clientIdRef.current = socketService.registerClient();
    
    // Setup event listeners only once per client
    const setupListeners = () => {

      // Connection events
      socketService.on('connect', () => {
        setIsConnected(true);
        setError(null);
      });

      socketService.on('disconnect', () => {
        setIsConnected(false);
        setCurrentRoom(null);
      });

      // Room events
      socketService.on('rooms_list', (rooms: GameRoom[]) => {
        setAvailableRooms(rooms);
      });

      socketService.on('room_created', (room: GameRoom) => {
        setCurrentRoom(room);
        // Add to available rooms if not full
        if (room.playerCount < room.maxPlayers) {
          setAvailableRooms(prev => [...prev, room]);
        }
      });

      socketService.on('room_joined', (data: { roomId: string; room: GameRoom; playerId: string }) => {
        setCurrentRoom(data.room);
        setError(null);
      });

      socketService.on('new_room_available', (room: GameRoom) => {
        setAvailableRooms(prev => [...prev, room]);
      });

      // Player events
      socketService.on('player_joined', (data: { playerId: string; playerCount: number }) => {
        if (currentRoom) {
          setCurrentRoom((prev: GameRoom | null) => prev ? { ...prev, playerCount: data.playerCount } : null);
        }
      });

      socketService.on('player_left', (data: { playerId: string; playerCount: number }) => {
        if (currentRoom) {
          setCurrentRoom((prev: GameRoom | null) => prev ? { ...prev, playerCount: data.playerCount } : null);
        }
      });

      // Game events
      socketService.on('game_starting', (data: { countdown: number }) => {
        console.log(`Game starting in ${data.countdown} seconds`);
      });

      socketService.on('game_started', (_data: { gameId: string }) => {
        if (currentRoom) {
          setCurrentRoom((prev: GameRoom | null) => prev ? { ...prev, status: 'active' } : null);
        }
      });

      socketService.on('game_update', (update: GameUpdate) => {
        setGameUpdate(update);
      });

      socketService.on('game_ended', (_data: any) => {
        if (currentRoom) {
          setCurrentRoom((prev: GameRoom | null) => prev ? { ...prev, status: 'finished' } : null);
        }
      });

      // Global Room events - simplified without manual triggering
      socketService.on('join_success', (data: { message: string; roomStatus: any }) => {
        setError(null);
        
        // Set current room state based on join success
        const roomData = {
          id: 'global_room',
          gameId: 'global_game',
          maxPlayers: data.roomStatus?.maxPlayers || 100,
          entryFee: 0.01,
          status: 'active' as const,
          playerCount: data.roomStatus?.playersOnline || 1,
          createdAt: new Date().toISOString()
        };
        
        setCurrentRoom(roomData);
      });

      socketService.on('join_queued', (data: { message: string; queueStatus: any; roomStatus: any }) => {
        setError(data.message);
      });

      socketService.on('join_error', (data: { message: string }) => {
        setError(data.message);
      });

      socketService.on('global_room_stats', (stats: { playersOnline: number; maxPlayers: number; queueLength: number; uptime: number }) => {
        // Stats received
      });

      socketService.on('initial_room_status', (status: any) => {
        // Initial status received
      });

      // Global Room Game Events
      socketService.on('global_room_joined', (data: { roomId: string; position: any; playersOnline: number; maxPlayers: number }) => {
        // This will be used by GameCanvas to create local player
      });

      socketService.on('player_joined', (data: { playerId: string; playersOnline: number; playerPosition: any }) => {
        // This will be used by GameCanvas to add other players
      });

      socketService.on('player_left', (data: { playerId: string; playersOnline: number }) => {
        // This will be used by GameCanvas to remove players
      });

      // Error handling
      socketService.on('error', (errorData: { message: string }) => {
        setError(errorData.message);
      });
    };

    setupListeners();

    // Auto-connect on mount
    const connectOnMount = async () => {
      try {
        await socketService.connect(serverUrl);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error('SocketContext: Auto-connect failed:', err);
        setError('Failed to connect to game server');
        setIsConnected(false);
      }
    };
    
    connectOnMount();

    // Cleanup on unmount - unregister client
    return () => {
      socketService.unregisterClient();
    };
  }, [serverUrl]);

  const connect = async () => {
    try {
      // Don't connect if already connected
      if (socketService.getConnectionStatus()) {
        setIsConnected(true);
        setError(null);
        socketService.getRooms();
        return;
      }
      
      await socketService.connect(serverUrl);
      setIsConnected(true);
      setError(null);
      socketService.getRooms(); // Get available rooms after connecting
    } catch (error) {
      console.error('Failed to connect:', error);
      setError('Failed to connect to game server');
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    socketService.disconnect();
    setIsConnected(false);
    setCurrentRoom(null);
    setAvailableRooms([]);
    setGameUpdate(null);
  };

  const createRoom = (entryFee: number, maxPlayers: number = 10) => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }
    socketService.createRoom(entryFee, maxPlayers);
  };

  const joinRoom = (roomId: string, walletAddress?: string) => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }
    socketService.joinRoom(roomId, walletAddress);
  };

  const joinGlobalRoom = (walletAddress?: string) => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }
    socketService.joinGlobalRoom(walletAddress);
  };

  const getRooms = () => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }
    socketService.getRooms();
  };

  const sendInput = (mousePosition: { x: number; y: number }, actions: string[] = []) => {
    socketService.sendInput(mousePosition, actions);
  };

  const split = () => {
    socketService.split();
  };

  const ejectMass = () => {
    socketService.ejectMass();
  };

  const playerReady = () => {
    socketService.playerReady();
  };

  const clearError = () => {
    setError(null);
  };

  const value: SocketContextType = {
    isConnected,
    currentRoom,
    availableRooms,
    gameUpdate,
    error,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    joinGlobalRoom,
    getRooms,
    sendInput,
    split,
    ejectMass,
    playerReady,
    clearError
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Fix HMR issue by making the hook compatible
export default useSocket;