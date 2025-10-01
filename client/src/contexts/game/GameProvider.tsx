import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameUpdate } from 'shared';
import { useSocket } from '../SocketContext';
import { getSocketService } from '../../services/socketService';
import { gameEngineManager } from '../../services/GameEngineManager';

interface GameContextType {
  gameUpdate: GameUpdate | null;
  
  // Player actions
  sendInput: (mousePosition: { x: number; y: number }, actions?: string[]) => void;
  split: () => void;
  ejectMass: () => void;
  playerReady: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const { 
    isConnected, 
    sendInput: socketSendInput,
    split: socketSplit,
    ejectMass: socketEjectMass,
    playerReady: socketPlayerReady
  } = useSocket();
  
  const socketService = getSocketService();
  const [gameUpdate, setGameUpdate] = useState<GameUpdate | null>(null);

  useEffect(() => {
    console.log('🎮 GameProvider: Setting up game management');

    // Ensure GameEngineManager is initialized early
    gameEngineManager; // Trigger singleton creation

    // Setup game event listeners
    const setupGameListeners = () => {
      // Player events
      socketService.on('player_joined', (data: { playerId: string; playerCount: number }) => {
        console.log('👤 GameProvider: Player joined:', data.playerId);
      });

      socketService.on('player_left', (data: { playerId: string; playerCount: number }) => {
        console.log('👋 GameProvider: Player left:', data.playerId);
      });

      // Game state events
      socketService.on('game_starting', (data: { countdown: number }) => {
        console.log(`🚀 GameProvider: Game starting in ${data.countdown} seconds`);
      });

      socketService.on('game_started', (data: { gameId: string }) => {
        console.log('🎮 GameProvider: Game started:', data.gameId);
      });

      socketService.on('game_update', (update: GameUpdate) => {
        setGameUpdate(update);
      });

      socketService.on('game_ended', (data: any) => {
        console.log('🏁 GameProvider: Game ended:', data);
        setGameUpdate(null);
      });

      // Global room game events
      socketService.on('global_room_joined', (data: { roomId: string; position: any; playersOnline: number; maxPlayers: number }) => {
        console.log('🎯 GameProvider: Global room joined event received:', data);
      });

      socketService.on('global_room_stats', (stats: { playersOnline: number; maxPlayers: number; queueLength: number; uptime: number }) => {
        console.log('📊 GameProvider: Global room stats update:', stats);
      });

      socketService.on('initial_room_status', (status: any) => {
        console.log('🏠 GameProvider: Initial room status:', status);
      });
    };

    setupGameListeners();

    return () => {
      console.log('🧹 GameProvider: Cleanup completed');
    };
  }, [socketService]);

  // Clear game state when disconnected
  useEffect(() => {
    if (!isConnected) {
      setGameUpdate(null);
    }
  }, [isConnected]);

  const sendInput = (mousePosition: { x: number; y: number }, actions: string[] = []) => {
    if (!isConnected) return;
    socketSendInput(mousePosition, actions);
  };

  const split = () => {
    if (!isConnected) return;
    socketSplit();
  };

  const ejectMass = () => {
    if (!isConnected) return;
    socketEjectMass();
  };

  const playerReady = () => {
    if (!isConnected) return;
    socketPlayerReady();
  };

  const value: GameContextType = {
    gameUpdate,
    sendInput,
    split,
    ejectMass,
    playerReady
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};