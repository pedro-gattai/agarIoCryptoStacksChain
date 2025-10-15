import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useSocket } from '../contexts/SocketContext';
import { WalletLogo } from './WalletLogo';
import { TokenTicker } from './TokenTicker';
import { InteractiveRoadmap } from './InteractiveRoadmap';
import { ComingSoonModal } from './ui/ComingSoonModal';
import { formatAddress, copyToClipboard, getExplorerUrl } from '../utils/formatAddress';
import { Wallet, Rocket, ArrowRight } from 'lucide-react';

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
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonConfig, setComingSoonConfig] = useState({
    title: "Coming Soon!",
    feature: "this feature",
    icon: "🚀"
  });
  const [activeSection, setActiveSection] = useState('hero');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const { connected, wallet, balance, connecting, stxAddress, disconnect, connect } = useWallet();
  const { isConnected: socketConnected } = useSocket();
  const walletDropdownRef = useRef<HTMLDivElement>(null);

  // Scroll handling for navbar
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'features', 'roadmap'];
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

  const handleCopyAddress = async () => {
    if (stxAddress) {
      await copyToClipboard(stxAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleViewExplorer = () => {
    if (stxAddress) {
      window.open(getExplorerUrl(stxAddress, 'testnet'), '_blank');
      setShowWalletDropdown(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowWalletDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(event.target as Node)) {
        setShowWalletDropdown(false);
      }
    };

    if (showWalletDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWalletDropdown]);

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">🧡</span>
            <span className="logo-text">AgarCrypto</span>
          </div>
          
          <div className="nav-links">
            {['hero', 'features', 'roadmap'].map((section) => (
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
              <div className="wallet-connected-container" ref={walletDropdownRef}>
                <button
                  className="wallet-info-display"
                  onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                >
                  <WalletLogo walletName={wallet?.name || 'Hiro Wallet'} size={28} />
                  <div className="wallet-details">
                    <span className="wallet-address-short">{formatAddress(stxAddress)}</span>
                    <span className="wallet-balance-small">{balance.toFixed(2)} STX</span>
                  </div>
                  <span className="dropdown-arrow">▼</span>
                </button>

                {showWalletDropdown && (
                  <div className="wallet-dropdown">
                    <button className="dropdown-item" onClick={handleCopyAddress}>
                      <span className="dropdown-icon">📋</span>
                      {copiedAddress ? 'Copied!' : 'Copy Address'}
                    </button>
                    <button className="dropdown-item" onClick={handleViewExplorer}>
                      <span className="dropdown-icon">🔍</span>
                      View on Explorer
                    </button>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item disconnect" onClick={handleDisconnect}>
                      <span className="dropdown-icon">🚪</span>
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="connect-wallet-nav"
                onClick={connect}
                disabled={connecting}
              >
                <Wallet size={18} strokeWidth={2} />
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
              <span className="logo-icon">🧡</span>
              <span className="logo-text">AgarCrypto</span>
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
            {['hero', 'features', 'roadmap'].map((section) => (
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
              <div className="mobile-wallet-connected">
                <div className="mobile-wallet-display">
                  <WalletLogo walletName={wallet?.name || 'Hiro Wallet'} size={32} />
                  <div className="mobile-wallet-details">
                    <span className="mobile-wallet-name">{wallet?.name}</span>
                    <span className="mobile-wallet-address">{formatAddress(stxAddress)}</span>
                    <span className="mobile-wallet-balance">{balance.toFixed(2)} STX</span>
                  </div>
                </div>
                <div className="mobile-wallet-actions">
                  <button className="mobile-action-btn" onClick={handleCopyAddress}>
                    📋 {copiedAddress ? 'Copied!' : 'Copy'}
                  </button>
                  <button className="mobile-action-btn" onClick={handleViewExplorer}>
                    🔍 Explorer
                  </button>
                  <button className="mobile-action-btn disconnect" onClick={handleDisconnect}>
                    🚪 Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="mobile-connect-wallet"
                onClick={connect}
                disabled={connecting}
              >
                <Wallet size={20} strokeWidth={2} />
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
                className="cta-launch"
                onClick={() => {
                  console.log('🚀 LandingPage: Launch App button clicked!');
                  onPlayNow();
                }}
              >
                <Rocket size={24} strokeWidth={2} />
                <span>LAUNCH APP</span>
                <ArrowRight size={20} strokeWidth={2} />
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
            <h2 className="section-title">Why AgarCrypto?</h2>
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


      {/* Interactive Roadmap */}
      <InteractiveRoadmap />

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-main">
            <div className="footer-brand">
              <span className="footer-logo">🧡 AgarCrypto</span>
              <p>The future of crypto gaming is here. Play, earn, and compete in the ultimate blockchain-powered battle arena.</p>
              <div className="footer-social">
                <a href="https://twitter.com/agarcrypto" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
                  </svg>
                </a>
                <a href="https://discord.gg/agarcrypto" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"></path>
                  </svg>
                </a>
                <a href="https://t.me/agarcrypto" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"></path>
                  </svg>
                </a>
                <a href="https://github.com/agarcrypto" target="_blank" rel="noopener noreferrer" className="social-link">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"></path>
                  </svg>
                </a>
              </div>
            </div>

            <div className="footer-links">
              <div className="footer-column">
                <h4>Game</h4>
                <a href="#" onClick={(e) => { e.preventDefault(); onPlayNow(); }}>Play Now</a>
                <a href="#" onClick={(e) => { e.preventDefault(); onShowLeaderboards(); }}>Leaderboards</a>
                <a href="#" onClick={(e) => { e.preventDefault(); onShowAchievements(); }}>Achievements</a>
              </div>

              <div className="footer-column">
                <h4>Community</h4>
                <a href="https://twitter.com/agarcrypto" target="_blank" rel="noopener noreferrer">Twitter</a>
                <a href="https://discord.gg/agarcrypto" target="_blank" rel="noopener noreferrer">Discord</a>
                <a href="https://t.me/agarcrypto" target="_blank" rel="noopener noreferrer">Telegram</a>
              </div>

              <div className="footer-column">
                <h4>Resources</h4>
                <a href="https://docs.stacks.co" target="_blank" rel="noopener noreferrer">Stacks Docs</a>
                <a href="https://explorer.hiro.so" target="_blank" rel="noopener noreferrer">Block Explorer</a>
                <a href="https://github.com/agarcrypto" target="_blank" rel="noopener noreferrer">GitHub</a>
              </div>
            </div>
          </div>

          <div className="footer-divider"></div>

          <div className="footer-bottom">
            <div className="footer-legal">
              <p>&copy; 2025 AgarCrypto. All rights reserved.</p>
              <p className="footer-tagline">Built on Stacks • Powered by Bitcoin Security</p>
            </div>
            <div className="footer-disclaimer">
              <p>This is a demo project. Cryptocurrency gaming involves risk. Play responsibly.</p>
            </div>
          </div>
        </div>
      </footer>

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