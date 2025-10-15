import React from 'react';
import '../styles/roundEndModal.css';

interface Winner {
  position: number;
  playerId: string;
  score: number;
  prize: number;
}

interface RoundEndModalProps {
  isOpen: boolean;
  playerRank: number;
  playerScore: number;
  playerPrize: number;
  winners: Winner[];
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

const RoundEndModal: React.FC<RoundEndModalProps> = ({
  isOpen,
  playerRank,
  playerScore,
  playerPrize,
  winners,
  onPlayAgain,
  onReturnToLobby
}) => {
  if (!isOpen) return null;

  const getMedalEmoji = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏆';
    }
  };

  const isWinner = playerRank <= 3;

  return (
    <div className="round-end-overlay">
      <div className="round-end-modal">
        <div className="round-end-header">
          <h1>Round Finished!</h1>
          {isWinner ? (
            <div className="player-result winner">
              <span className="medal">{getMedalEmoji(playerRank)}</span>
              <h2>Congratulations! You placed #{playerRank}</h2>
              <p className="prize-amount">You won {playerPrize.toFixed(4)} STX!</p>
            </div>
          ) : (
            <div className="player-result">
              <h2>You placed #{playerRank}</h2>
              <p className="score">Final Score: {playerScore.toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="winners-section">
          <h3>Top 3 Winners</h3>
          <div className="winners-list">
            {winners.map((winner) => (
              <div key={winner.playerId} className={`winner-item position-${winner.position}`}>
                <span className="medal">{getMedalEmoji(winner.position)}</span>
                <div className="winner-info">
                  <span className="position">#{winner.position}</span>
                  <span className="player-id">{winner.playerId.substring(0, 8)}</span>
                  <span className="score">{winner.score.toLocaleString()} pts</span>
                </div>
                <div className="winner-prize">
                  {winner.prize.toFixed(4)} STX
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-play-again" onClick={onPlayAgain}>
            Play Again (1 STX)
          </button>
          <button className="btn-lobby" onClick={onReturnToLobby}>
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoundEndModal;
