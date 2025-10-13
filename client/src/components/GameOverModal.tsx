import React from 'react';

interface GameOverModalProps {
  isVisible: boolean;
  finalScore: number;
  survivalTime: number;
  rank: number;
  killedBy?: string;
  onReturnToLobby: () => void;
  onRespawn: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVisible,
  finalScore,
  survivalTime,
  rank,
  killedBy,
  onReturnToLobby,
  onRespawn
}) => {
  if (!isVisible) return null;

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatScore = (score: number): string => {
    if (score >= 1000000) {
      return (score / 1000000).toFixed(1) + 'M';
    } else if (score >= 1000) {
      return (score / 1000).toFixed(1) + 'K';
    }
    return score.toString();
  };

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <div className="game-over-header">
          <h1 className="game-over-title">Game Over</h1>
          {killedBy && (
            <p className="killed-by">
              Eliminated by <span className="killer-name">{killedBy}</span>
            </p>
          )}
        </div>

        <div className="game-over-stats">
          <div className="stat-row">
            <div className="stat-item large">
              <span className="stat-label">Final Score</span>
              <span className="stat-value">{formatScore(finalScore)}</span>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-item">
              <span className="stat-label">Rank</span>
              <span className="stat-value">#{rank}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Survival Time</span>
              <span className="stat-value">{formatTime(survivalTime)}</span>
            </div>
          </div>
        </div>

        <div className="game-over-actions">
          <button
            className="game-over-btn lobby-btn"
            onClick={onReturnToLobby}
          >
            <span className="btn-icon">🏠</span>
            Return to Lobby
          </button>
        </div>

        <div className="game-over-tips">
          <p>💡 Eat smaller players and pellets to grow bigger!</p>
          <p>⚠️ Avoid larger players - they can eat you!</p>
        </div>
      </div>
    </div>
  );
};