import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useSocket } from '../contexts/SocketContext';
import { WalletModal } from './WalletModal';
import { TokenTicker } from './TokenTicker';
import { InteractiveRoadmap } from './InteractiveRoadmap';
import { ComingSoonModal } from './ui/ComingSoonModal';

interface LandingPageProps {
  onPlayNow: () => void;
  onShowLeaderboards: () => void;
  onShowAchievements: () => void;
  onShowTournaments: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onPlayNow,
  onShowLeaderboards,
  onShowAchievements,
  onShowTournaments
}) => {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonConfig, setComingSoonConfig] = useState({
    title: "Coming Soon!",
    feature: "this feature",
    icon: "🚀"
  });
  const [activeSection, setActiveSection] = useState('hero');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { connected, wallet, balance, connecting } = useWallet();
  const { isConnected: socketConnected } = useSocket();

  // Scroll handling for navbar
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'features', 'community'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false); // Close mobile menu when navigating
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleBuyToken = () => {
    setComingSoonConfig({
      title: "Token Presale Coming Soon!",
      feature: "$AGAR token presale",
      icon: "💎"
    });
    setShowComingSoon(true);
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">💚</span>
            <span className="logo-text">AgarCoin</span>
          </div>
          
          <div className="nav-links">
            {['hero', 'features', 'community'].map((section) => (
              <button
                key={section}
                className={`nav-link ${activeSection === section ? 'active' : ''}`}
                onClick={() => scrollToSection(section)}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-button"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <div className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>

          <div className="nav-actions">
            {connected ? (
              <div className="wallet-info-mini">
                <span className="wallet-icon">{wallet?.icon}</span>
                <span className="wallet-balance">{balance.toFixed(2)} STX</span>
              </div>
            ) : (
              <button 
                className="connect-wallet-nav"
                onClick={() => setShowWalletModal(true)}
                disabled={connecting}
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu">
          <div className="mobile-menu-header">
            <div className="mobile-logo">
              <span className="logo-icon">💚</span>
              <span className="logo-text">AgarCoin</span>
            </div>
            <button 
              className="mobile-menu-close"
              onClick={toggleMobileMenu}
              aria-label="Close mobile menu"
            >
              ×
            </button>
          </div>
          
          <div className="mobile-menu-links">
            {['hero', 'features', 'community'].map((section) => (
              <button
                key={section}
                className={`mobile-nav-link ${activeSection === section ? 'active' : ''}`}
                onClick={() => scrollToSection(section)}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="mobile-menu-actions">
            {connected ? (
              <div className="mobile-wallet-info">
                <span className="wallet-icon">{wallet?.icon}</span>
                <span className="wallet-balance">{balance.toFixed(2)} STX</span>
              </div>
            ) : (
              <button 
                className="mobile-connect-wallet"
                onClick={() => setShowWalletModal(true)}
                disabled={connecting}
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section id="hero" className="hero-section">
        <div className="hero-background">
          <div className="hero-particles">
            {Array.from({ length: 50 }).map((_, i) => (
              <div 
                key={i}
                className={`hero-particle particle-${(i % 5) + 1}`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 10}s`,
                  animationDuration: `${8 + Math.random() * 4}s`
                }}
              />
            ))}
          </div>
        </div>

        <div className="hero-content">
          <div className="hero-main">
            <h1 className="hero-title">
              <span className="title-primary">Play.</span>
              <span className="title-secondary">Earn.</span>
              <span className="title-accent">HODL.</span>
            </h1>
            
            <p className="hero-subtitle">
              The first crypto-powered Agar.io where your skills directly convert to 
              <span className="highlight"> real Stacks rewards</span>. 
              Join 100 players in epic battles!
            </p>

            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">100</span>
                <span className="stat-label">Max Players</span>
              </div>
              <div className="stat">
                <span className="stat-number">24/7</span>
                <span className="stat-label">Always Active</span>
              </div>
              <div className="stat">
                <span className="stat-number">$0</span>
                <span className="stat-label">Gas Fees</span>
              </div>
            </div>

            <div className="hero-actions">
              <button 
                className="cta-play"
                onClick={() => {
                  console.log('🎮 LandingPage: Play Now button clicked!');
                  onPlayNow();
                }}
              >
                <span className="cta-icon">🎮</span>
                PLAY NOW
              </button>
              
              <button className="cta-token" onClick={handleBuyToken}>
                <span className="cta-icon">💎</span>
                BUY $AGAR
              </button>
            </div>

            <div className="connection-indicator">
              <div className="indicator live">
                <span className="indicator-dot"></span>
                <span className="indicator-text">
                  Live Demo Mode - Ready to Play!
                </span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="game-preview">
              <div className="preview-screen">
                <div className="preview-cells">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div 
                      key={i}
                      className={`preview-cell cell-${i}`}
                      style={{
                        animationDelay: `${i * 0.5}s`
                      }}
                    />
                  ))}
                </div>
                <div className="preview-overlay">
                  <span className="preview-text">Live Game Arena</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Token Ticker */}
      <TokenTicker />

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Why AgarCoin?</h2>
            <p className="section-subtitle">
              The perfect blend of classic gameplay and modern DeFi rewards
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Rewards</h3>
              <p>Earn STX directly to your wallet. No waiting, no complex claiming processes.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔥</div>
              <h3>100 Player Battles</h3>
              <p>Epic multiplayer battles with up to 100 players in real-time action.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Progressive Jackpots</h3>
              <p>Prize pools that grow with each game. The more players, the bigger the rewards.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3>Skill-Based</h3>
              <p>Your gaming skills determine your earnings. The better you play, the more you earn.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3>Provably Fair</h3>
              <p>All games are recorded on-chain for complete transparency and fairness.</p>
            </div>
          </div>
        </div>
      </section>


      {/* Interactive Roadmap - Temporarily disabled for launch */}
      {/* <InteractiveRoadmap /> */}

      {/* Community Section */}
      <section id="community" className="community-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Join the Revolution</h2>
            <p className="section-subtitle">
              Be part of the fastest growing crypto gaming community
            </p>
          </div>

          <div className="community-grid">
            <div className="community-card">
              <div className="community-icon">𝕏</div>
              <h3>Twitter</h3>
              <p>Get the latest updates and alpha calls from our team</p>
              <a href="https://x.com/Agarcryptofun" target="_blank" rel="noopener noreferrer" className="community-link">Follow @AgarCryptofun</a>
            </div>
            
            <div className="community-card">
              <div className="community-icon">📱</div>
              <h3>Telegram</h3>
              <p>Real-time game notifications and community announcements</p>
              <a href="https://t.me/+wYTqPTvz7XY0MGVh" target="_blank" rel="noopener noreferrer" className="community-link">Join Telegram</a>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-main">
            <div className="footer-brand">
              <span className="footer-logo">💚 AgarCoin</span>
              <p>The future of crypto gaming is here</p>
            </div>
            
            <div className="footer-links">
              <div className="footer-column">
                <h4>Game</h4>
                <a href="#" onClick={onPlayNow}>Play Now</a>
                <a href="#" onClick={onShowLeaderboards}>Leaderboards</a>
                <a href="#" onClick={onShowTournaments}>Tournaments</a>
                <a href="#" onClick={onShowAchievements}>Achievements</a>
              </div>
              
              <div className="footer-column">
                <h4>Resources</h4>
                <a href="#">Whitepaper</a>
                <a href="#">Documentation</a>
                <a href="#">API</a>
                <a href="#">Bug Bounty</a>
              </div>
              
              <div className="footer-column">
                <h4>Legal</h4>
                <a href="#">Terms of Service</a>
                <a href="#">Privacy Policy</a>
                <a href="#">Cookie Policy</a>
                <a href="#">Disclaimer</a>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2024 AgarCoin. All rights reserved.</p>
            <p>Built on Stacks. Powered by community.</p>
          </div>
        </div>
      </footer>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnected={() => {
          setShowWalletModal(false);
          // Auto-redirect to game after connecting
          setTimeout(() => onPlayNow(), 1000);
        }}
      />

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={showComingSoon}
        onClose={() => setShowComingSoon(false)}
        title={comingSoonConfig.title}
        feature={comingSoonConfig.feature}
        icon={comingSoonConfig.icon}
      />
    </div>
  );
};