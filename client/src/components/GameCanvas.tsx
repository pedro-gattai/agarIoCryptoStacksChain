import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GameEngine } from '../game/GameEngine';
import type { GameConfig } from '../game/GameEngine';
import { GameHUD } from './GameHUD';
import { useSocket } from '../contexts/SocketContext';
import { getSocketService } from '../services/socketService';
import { gameEngineManager } from '../services/GameEngineManager';
import type { HUDPlayer } from 'shared';

interface GameCanvasProps {
  className?: string;
  isMultiplayer?: boolean;
}

const DEFAULT_CONFIG: GameConfig = {
  worldWidth: 3000,
  worldHeight: 3000,
  pelletsCount: 1000,
  maxPlayers: 20
};

// Simple canvas ID generator for debugging purposes only
let canvasIdCounter = 0;

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  className = '',
  isMultiplayer = false 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const socketService = getSocketService();
  
  // Simple instance ID for debugging
  const instanceId = useMemo(() => {
    canvasIdCounter++;
    const id = `canvas_${canvasIdCounter}_${Date.now()}`;
    console.log(`🎮 [CANVAS_${id}] Creating GameCanvas instance (using GameEngineManager)`);
    return id;
  }, []);
  
  const isInitializedRef = useRef(false);
  
  // Socket context for multiplayer
  const { gameUpdate, sendInput, isConnected } = useSocket();
  
  // Game state for HUD
  const [localPlayer, setLocalPlayer] = useState<HUDPlayer | null>(null);
  const [leaderboard, setLeaderboard] = useState<HUDPlayer[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [fps, setFPS] = useState(0);
  const [gameTime, setGameTime] = useState(0);

  // Initialize game using GameEngineManager singleton
  useEffect(() => {
    // Check if already initialized
    if (isInitializedRef.current) {
      console.log(`🎮 [CANVAS_${instanceId}] Already initialized, skipping`);
      return;
    }
    
    if (!canvasRef.current || !containerRef.current) {
      console.log(`🎮 [CANVAS_${instanceId}] Canvas refs not ready, skipping`);
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    console.log(`🎮 [CANVAS_${instanceId}] Initializing with GameEngineManager...`);

    // Set canvas size
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();

    // Initialize using GameEngineManager singleton
    const onInputCallback = isMultiplayer ? sendInput : undefined;
    const success = gameEngineManager.initialize(canvas, DEFAULT_CONFIG, isMultiplayer, onInputCallback);
    
    if (!success) {
      console.error(`🎮 [CANVAS_${instanceId}] GameEngineManager initialization failed`);
      return;
    }

    // Get reference to the GameEngine from manager
    gameEngineRef.current = gameEngineManager.getGameEngine();
    isInitializedRef.current = true;

    console.log(`✅ [CANVAS_${instanceId}] Successfully initialized with GameEngineManager`);

    // Setup for single player mode (if needed)
    if (!isMultiplayer) {
      console.log(`🎮 [CANVAS_${instanceId}] Setting up single player mode`);
      // Single player setup can be done here if needed
      // For now, we rely on the multiplayer system with bots
    }

    // Handle resize
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    // Setup HUD update interval and fallback player creation check
    const hudUpdateInterval = setInterval(() => {
      const gameEngine = gameEngineManager.getGameEngine();
      if (!gameEngine) return;
      
      // Update HUD data from game engine
      const gameState = gameEngine.getGameState();
      if (!gameState) return;
      
      // Find local player
      const socketId = socketService.getSocket()?.id;
      const localPlayerData = gameState.players.find(p => p.id === socketId || p.id.includes('local_player'));
      
      // Convert to HUDPlayer format
      if (localPlayerData) {
        setLocalPlayer({
          id: localPlayerData.id,
          name: localPlayerData.id.includes('bot_') ? 'Bot' : 'You',
          score: localPlayerData.score || 0,
          size: localPlayerData.size || 0
        });
      } else {
        setLocalPlayer(null);
      }
      
      // Update leaderboard (top 10 players by size) - Convert to HUDPlayer format
      const leaderboardData: HUDPlayer[] = gameState.players
        .filter(p => p.isAlive)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 10)
        .map((player) => ({
          id: player.id,
          name: player.id.includes('bot_') ? 'Bot' : (player.id === socketId ? 'You' : 'Player'),
          score: player.score || 0,
          size: player.size || 0
        }));
      
      setLeaderboard(leaderboardData);
      setPlayerCount(gameState.players.filter(p => p.isAlive).length);
      setGameTime(gameState.gameTime);
      setFPS(60); // Placeholder
    }, 100);

    // Fallback player creation timer (after 3 seconds if no local player)
    const fallbackTimer = setTimeout(() => {
      if (isMultiplayer && isConnected) {
        const gameEngine = gameEngineManager.getGameEngine();
        if (gameEngine) {
          const gameState = gameEngine.getGameState();
          const hasLocalPlayer = gameState.players.some(p => p.isLocalPlayer);
          
          if (!hasLocalPlayer) {
            console.log(`⚠️ [CANVAS_${instanceId}] No local player found after 3s, creating fallback`);
            gameEngineManager.createFallbackLocalPlayer();
          } else {
            console.log(`✅ [CANVAS_${instanceId}] Local player exists, no fallback needed`);
          }
        }
      }
    }, 3000);

    console.log(`🎮 [CANVAS_${instanceId}] Setup completed successfully`);

    // Cleanup function
    return () => {
      clearTimeout(fallbackTimer);
      console.log(`🎮 [CANVAS_${instanceId}] Cleaning up...`);
      
      clearInterval(hudUpdateInterval);
      window.removeEventListener('resize', handleResize);
      
      // Reset local state
      isInitializedRef.current = false;
      gameEngineRef.current = null;
      
      // Note: We don't destroy the GameEngineManager here because it's a singleton
      // that should persist across React re-mounts. Only reset if really needed.
      
      console.log(`🎮 [CANVAS_${instanceId}] Cleanup completed`);
    };
  }, []); // Empty dependencies - only run once

  // Handle server game updates with memoization
  useEffect(() => {
    if (!isMultiplayer || !gameUpdate) return;

    try {
      const gameEngine = gameEngineManager.getGameEngine();
      if (gameEngine) {
        gameEngine.updateFromServer(gameUpdate);
      }
    } catch (error) {
      console.error('GameCanvas: Error updating from server:', error);
    }
  }, [gameUpdate, isMultiplayer]);

  return (
    <div 
      ref={containerRef}
      className={`game-canvas-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '400px',
        overflow: 'hidden',
        backgroundColor: '#000'
      }}
    >
      <canvas
        ref={canvasRef}
        className="game-canvas"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      
      {/* Game HUD */}
      <GameHUD 
        localPlayer={localPlayer}
        leaderboard={leaderboard}
        playerCount={playerCount}
        fps={fps}
        gameTime={gameTime}
      />
    </div>
  );
};