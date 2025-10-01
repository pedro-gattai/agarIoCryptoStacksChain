import React from 'react';
import type { HUDPlayer } from 'shared';

interface GameHUDProps {
  localPlayer: HUDPlayer | null;
  leaderboard: HUDPlayer[];
  playerCount: number;
  maxPlayers?: number;
  fps: number;
  gameTime: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  localPlayer,
  leaderboard,
  playerCount,
  maxPlayers,
  fps,
  gameTime
}) => {
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="game-hud">
      {/* Top Left - Player Stats */}
      <div className="hud-section top-left">
        {localPlayer && (
          <div className="player-stats">
            <div className="stat-item">
              <span className="label">Score:</span>
              <span className="value">{formatNumber(localPlayer.score)}</span>
            </div>
            <div className="stat-item">
              <span className="label">Size:</span>
              <span className="value">{Math.floor(localPlayer.size || 0)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Top Right - Game Info */}
      <div className="hud-section top-right">
        <div className="game-info">
          <div className="info-item">
            <span className="label">Players:</span>
            <span className="value">{playerCount}/{maxPlayers || 100}</span>
          </div>
          <div className="info-item">
            <span className="label">Time:</span>
            <span className="value">{formatTime(gameTime)}</span>
          </div>
          <div className="info-item fps">
            <span className="label">FPS:</span>
            <span className={`value ${fps < 30 ? 'low' : fps < 50 ? 'medium' : 'high'}`}>
              {fps}
            </span>
          </div>
        </div>
      </div>

      {/* Right Side - Leaderboard */}
      <div className="hud-section leaderboard">
        <h3>Leaderboard</h3>
        <div className="leaderboard-list">
          {leaderboard.map((player, index) => (
            <div 
              key={player.id || player.name || index} 
              className={`leaderboard-item ${
                localPlayer && (player.id === localPlayer.id || player.name === localPlayer.name) ? 'local-player' : ''
              }`}
            >
              <span className="rank">#{index + 1}</span>
              <span className="player-name">
                {localPlayer && (player.id === localPlayer.id || player.name === localPlayer.name)
                  ? 'You' 
                  : player.name || (player.id ? player.id.substring(0, 8) : `Player ${index + 1}`)
                }
              </span>
              <span className="score">{formatNumber(player.score)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Center - Controls */}
      <div className="hud-section controls">
        <div className="control-hints">
          <div className="hint">
            <span className="key">Mouse</span>
            <span className="action">Move</span>
          </div>
          <div className="hint">
            <span className="key">Space</span>
            <span className="action">Split</span>
          </div>
          <div className="hint">
            <span className="key">W</span>
            <span className="action">Eject Mass</span>
          </div>
        </div>
      </div>
    </div>
  );
};