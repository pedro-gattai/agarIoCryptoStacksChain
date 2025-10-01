import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameRoom } from 'shared';
import { useSocket } from '../SocketContext';
import { getSocketService } from '../../services/socketService';

interface RoomContextType {
  currentRoom: GameRoom | null;
  availableRooms: GameRoom[];
  
  // Room actions
  createRoom: (entryFee: number, maxPlayers?: number) => void;
  joinRoom: (roomId: string, walletAddress?: string) => void;
  joinGlobalRoom: (walletAddress?: string) => void;
  getRooms: () => void;
}

const RoomContext = createContext<RoomContextType | null>(null);

interface RoomProviderProps {
  children: ReactNode;
}

export const RoomProvider: React.FC<RoomProviderProps> = ({ children }) => {
  const { 
    isConnected, 
    error: connectionError,
    createRoom: socketCreateRoom,
    joinRoom: socketJoinRoom,
    joinGlobalRoom: socketJoinGlobalRoom,
    getRooms: socketGetRooms
  } = useSocket();
  
  const socketService = getSocketService();
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([]);

  useEffect(() => {
    console.log('🏠 RoomProvider: Setting up room management');

    // Setup room event listeners
    const setupRoomListeners = () => {
      // Basic room events
      socketService.on('rooms_list', (rooms: GameRoom[]) => {
        setAvailableRooms(rooms);
      });

      socketService.on('room_created', (room: GameRoom) => {
        setCurrentRoom(room);
        if (room.playerCount < room.maxPlayers) {
          setAvailableRooms(prev => [...prev, room]);
        }
      });

      socketService.on('room_joined', (data: { roomId: string; room: GameRoom; playerId: string }) => {
        setCurrentRoom(data.room);
      });

      socketService.on('new_room_available', (room: GameRoom) => {
        setAvailableRooms(prev => [...prev, room]);
      });

      // Global room events
      socketService.on('join_success', (data: { message: string; roomStatus: any }) => {
        console.log('🎉 RoomProvider: Successfully joined global room:', data.message);
        
        const roomData: GameRoom = {
          id: 'global_room',
          gameId: 'global_game',
          maxPlayers: data.roomStatus?.maxPlayers || 100,
          entryFee: 0.01,
          status: 'active',
          playerCount: data.roomStatus?.playersOnline || 1,
          createdAt: new Date().toISOString()
        };
        
        setCurrentRoom(roomData);
      });

      socketService.on('join_queued', (data: { message: string; queueStatus: any; roomStatus: any }) => {
        console.log('📥 RoomProvider: Added to queue:', data.message);
      });

      socketService.on('join_error', (data: { message: string }) => {
        console.error('❌ RoomProvider: Failed to join room:', data.message);
      });
    };

    setupRoomListeners();

    return () => {
      console.log('🧹 RoomProvider: Cleanup completed');
    };
  }, [socketService]);

  // Handle connection changes
  useEffect(() => {
    if (!isConnected) {
      setCurrentRoom(null);
      setAvailableRooms([]);
    }
  }, [isConnected]);

  const createRoom = (entryFee: number, maxPlayers: number = 10) => {
    if (!isConnected) {
      console.error('❌ RoomProvider: Cannot create room - not connected');
      return;
    }
    console.log('🏠 RoomProvider: Creating room with fee:', entryFee);
    socketCreateRoom(entryFee, maxPlayers);
  };

  const joinRoom = (roomId: string, walletAddress?: string) => {
    if (!isConnected) {
      console.error('❌ RoomProvider: Cannot join room - not connected');
      return;
    }
    console.log('🏠 RoomProvider: Joining room:', roomId);
    socketJoinRoom(roomId, walletAddress);
  };

  const joinGlobalRoom = (walletAddress?: string) => {
    if (!isConnected) {
      console.error('❌ RoomProvider: Cannot join global room - not connected');
      return;
    }
    console.log('🌐 RoomProvider: Joining global room with wallet:', walletAddress);
    socketJoinGlobalRoom(walletAddress);
  };

  const getRooms = () => {
    if (!isConnected) {
      console.error('❌ RoomProvider: Cannot get rooms - not connected');
      return;
    }
    console.log('🏠 RoomProvider: Getting available rooms');
    socketGetRooms();
  };

  const value: RoomContextType = {
    currentRoom,
    availableRooms,
    createRoom,
    joinRoom,
    joinGlobalRoom,
    getRooms
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = (): RoomContextType => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};