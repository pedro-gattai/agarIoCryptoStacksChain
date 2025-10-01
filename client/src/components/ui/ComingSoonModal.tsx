import React from 'react';
import { Modal } from './Modal';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  feature?: string;
  icon?: string;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({
  isOpen,
  onClose,
  title = "Coming Soon!",
  message,
  feature = "this feature",
  icon = "🚀"
}) => {
  const defaultMessage = `${feature.charAt(0).toUpperCase() + feature.slice(1)} will be available soon. Stay tuned for updates!`;

  const handleSocialClick = (platform: string, url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleModalClick = (e: React.MouseEvent) => {
    // Prevent backdrop close when clicking inside modal
    e.stopPropagation();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} unstyled={true}>
      <div className="coming-soon-modal" onClick={handleModalClick}>
        <button className="modal-close-x" onClick={onClose} aria-label="Close modal">
          ×
        </button>
        
        <div className="modal-header">
          <div className="modal-icon">
            {icon}
          </div>
          <h2 className="modal-title">{title}</h2>
        </div>
        
        <div className="modal-content">
          <p className="modal-message">
            {message || defaultMessage}
          </p>

          <div className="modal-highlights">
            <div className="highlight-item">
              <span className="highlight-icon">⚡</span>
              <span>Built on Stacks</span>
            </div>
            <div className="highlight-item">
              <span className="highlight-icon">🎮</span>
              <span>Play-to-Earn</span>
            </div>
            <div className="highlight-item">
              <span className="highlight-icon">💰</span>
              <span>Real STX Rewards</span>
            </div>
          </div>

          <div className="social-section">
            <p className="social-title">Stay updated on our progress</p>
            <div className="social-buttons">
              <button 
                className="social-btn twitter" 
                onClick={() => handleSocialClick('Twitter', 'https://x.com/Agarcryptofun')}
                aria-label="Follow us on Twitter/X"
              >
                <span className="social-icon">𝕏</span>
                <span className="social-label">Twitter</span>
              </button>
              <button 
                className="social-btn telegram" 
                onClick={() => handleSocialClick('Telegram', 'https://t.me/+wYTqPTvz7XY0MGVh')}
                aria-label="Join our Telegram"
              >
                <span className="social-icon">📱</span>
                <span className="social-label">Telegram</span>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary-btn" onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </Modal>
  );
};