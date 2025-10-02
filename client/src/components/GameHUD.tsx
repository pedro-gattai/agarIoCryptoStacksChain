import React from 'react';
import type { HUDPlayer } from 'shared';

interface GameHUDProps {
  localPlayer: HUDPlayer | null;
  leaderboard: HUDPlayer[];
  playerCount: number;
  maxPlayers?: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  localPlayer,
  leaderboard,
  playerCount,
  maxPlayers
}) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Get top 5 leaderboard for cleaner display
  const topLeaderboard = leaderboard.slice(0, 5);

  return (
    <div className="game-hud">
      {/* Top Left - Player Stats */}
      <div className="hud-section top-left">
        {localPlayer && (
          <div className="player-stats">
            <div className="stat-item">
              <span className="label">Score</span>
              <span className="value">{formatNumber(localPlayer.score)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Top Right - Game Info */}
      <div className="hud-section top-right">
        <div className="game-info">
          <div className="info-item">
            <span className="label">Players</span>
            <span className="value">{playerCount}/{maxPlayers || 100}</span>
          </div>
        </div>
      </div>

      {/* Right Side - Top 5 Leaderboard */}
      <div className="hud-section leaderboard">
        <h3>Top 5</h3>
        <div className="leaderboard-list">
          {topLeaderboard.map((player, index) => (
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
                  : player.name || (player.id ? player.id.substring(0, 6) : `Player ${index + 1}`)
                }
              </span>
              <span className="score">{formatNumber(player.score)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Center - Essential Controls Only */}
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
        </div>
      </div>
    </div>
  );
};