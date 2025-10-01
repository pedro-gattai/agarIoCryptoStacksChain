import React, { useState } from 'react';

interface ReferralStats {
  totalReferred: number;
  totalEarnings: number;
  activeReferrals: number;
  pendingEarnings: number;
  referralCode: string;
  commissionRate: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
}

interface ReferralHistory {
  id: string;
  referredUser: string;
  joinDate: Date;
  totalSpent: number;
  earnedCommission: number;
  status: 'active' | 'inactive';
  lastActivity: Date;
}

interface ReferralSystemProps {
  onClose?: () => void;
  playerWallet?: string;
}

const SAMPLE_STATS: ReferralStats = {
  totalReferred: 12,
  totalEarnings: 2.456,
  activeReferrals: 8,
  pendingEarnings: 0.123,
  referralCode: 'AGAR2024XYZ',
  commissionRate: 10,
  tier: 'Silver'
};

const SAMPLE_HISTORY: ReferralHistory[] = [
  {
    id: 'ref_1',
    referredUser: 'CryptoGamer123',
    joinDate: new Date(Date.now() - 86400000 * 15),
    totalSpent: 1.245,
    earnedCommission: 0.1245,
    status: 'active',
    lastActivity: new Date(Date.now() - 3600000 * 2)
  },
  {
    id: 'ref_2',
    referredUser: 'NFTCollector',
    joinDate: new Date(Date.now() - 86400000 * 8),
    totalSpent: 0.856,
    earnedCommission: 0.0856,
    status: 'active',
    lastActivity: new Date(Date.now() - 86400000)
  },
  {
    id: 'ref_3',
    referredUser: 'GameMaster',
    joinDate: new Date(Date.now() - 86400000 * 3),
    totalSpent: 0.234,
    earnedCommission: 0.0234,
    status: 'active',
    lastActivity: new Date(Date.now() - 3600000 * 6)
  }
];

export const ReferralSystem: React.FC<ReferralSystemProps> = ({ 
  onClose,
  // playerWallet 
}) => {
  const [stats] = useState<ReferralStats>(SAMPLE_STATS);
  const [history] = useState<ReferralHistory[]>(SAMPLE_HISTORY);
  const [view, setView] = useState<'overview' | 'history' | 'invite'>('overview');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const getReferralLink = () => {
    return `https://agarcrypto.game?ref=${stats.referralCode}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getTierColor = (tier: ReferralStats['tier']) => {
    switch (tier) {
      case 'Bronze': return '#cd7f32';
      case 'Silver': return '#c0c0c0';
      case 'Gold': return '#ffd700';
      case 'Diamond': return '#b9f2ff';
      default: return '#c0c0c0';
    }
  };

  const getTierBenefits = (tier: ReferralStats['tier']) => {
    switch (tier) {
      case 'Bronze':
        return ['5% commission rate', 'Basic referral tracking'];
      case 'Silver':
        return ['10% commission rate', 'Advanced analytics', 'Custom referral codes'];
      case 'Gold':
        return ['15% commission rate', 'Priority support', 'Exclusive rewards', 'Bonus multipliers'];
      case 'Diamond':
        return ['20% commission rate', 'VIP status', 'Maximum rewards', 'Special tournaments'];
      default:
        return [];
    }
  };

  const getNextTierRequirements = (tier: ReferralStats['tier']) => {
    switch (tier) {
      case 'Bronze':
        return { referrals: 10, earnings: 1.0 };
      case 'Silver':
        return { referrals: 25, earnings: 5.0 };
      case 'Gold':
        return { referrals: 50, earnings: 15.0 };
      default:
        return null;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  const generateShareMessage = () => {
    const baseMessage = `🎮 Join me on AgarCrypto - the first crypto betting agar.io game!
    
💰 Earn real STX tokens by winning games
🏆 Compete in tournaments and leaderboards  
🎨 Collect and trade NFT skins
⚡ Use power-ups to dominate the arena

Use my referral code: ${stats.referralCode}
Link: ${getReferralLink()}`;

    return customMessage || baseMessage;
  };

  const shareOnTwitter = () => {
    const message = encodeURIComponent(generateShareMessage());
    window.open(`https://twitter.com/intent/tweet?text=${message}`, '_blank');
  };

  const shareOnDiscord = () => {
    copyToClipboard(generateShareMessage());
    alert('Message copied to clipboard! Paste it in Discord.');
  };

  const nextTier = getNextTierRequirements(stats.tier);

  return (
    <div className="referral-system-container">
      <div className="referral-header">
        <div className="header-content">
          <h2>🤝 Referral Program</h2>
          <div className="tier-badge" style={{ color: getTierColor(stats.tier) }}>
            {stats.tier} Tier
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        )}
      </div>

      <div className="referral-tabs">
        {(['overview', 'history', 'invite'] as const).map(tab => (
          <button
            key={tab}
            className={`tab-btn ${view === tab ? 'active' : ''}`}
            onClick={() => setView(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="referral-content">
        {view === 'overview' && (
          <div className="overview-content">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.totalReferred}</div>
                  <div className="stat-label">Total Referred</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.totalEarnings.toFixed(3)} STX</div>
                  <div className="stat-label">Total Earnings</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">🔥</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.activeReferrals}</div>
                  <div className="stat-label">Active Referrals</div>
                </div>
              </div>
              
              <div className="stat-card pending">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <div className="stat-value">{stats.pendingEarnings.toFixed(3)} STX</div>
                  <div className="stat-label">Pending Earnings</div>
                </div>
              </div>
            </div>

            <div className="tier-progress">
              <h3>Tier Progress</h3>
              <div className="current-tier" style={{ borderColor: getTierColor(stats.tier) }}>
                <h4 style={{ color: getTierColor(stats.tier) }}>
                  {stats.tier} Tier ({stats.commissionRate}% commission)
                </h4>
                <div className="tier-benefits">
                  {getTierBenefits(stats.tier).map((benefit, index) => (
                    <span key={index} className="benefit-badge">✓ {benefit}</span>
                  ))}
                </div>
              </div>

              {nextTier && (
                <div className="next-tier">
                  <h4>Next Tier Requirements:</h4>
                  <div className="progress-bars">
                    <div className="progress-item">
                      <span>Referrals: {stats.totalReferred}/{nextTier.referrals}</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${Math.min((stats.totalReferred / nextTier.referrals) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="progress-item">
                      <span>Earnings: {stats.totalEarnings.toFixed(3)}/{nextTier.earnings.toFixed(3)} STX</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${Math.min((stats.totalEarnings / nextTier.earnings) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="referral-code-section">
              <h3>Your Referral Code</h3>
              <div className="code-display">
                <span className="code">{stats.referralCode}</span>
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(stats.referralCode)}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div className="referral-link">
                <input 
                  type="text" 
                  value={getReferralLink()} 
                  readOnly 
                  className="link-input"
                />
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(getReferralLink())}
                >
                  {copied ? '✓ Copied' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="history-content">
            <h3>Referral History</h3>
            <div className="history-table">
              {history.map((ref) => (
                <div key={ref.id} className="history-item">
                  <div className="user-info">
                    <div className="user-name">{ref.referredUser}</div>
                    <div className="join-date">Joined {formatTimeAgo(ref.joinDate)}</div>
                  </div>
                  <div className="activity-info">
                    <div className="spent">{ref.totalSpent.toFixed(3)} STX spent</div>
                    <div className="earned">+{ref.earnedCommission.toFixed(3)} STX earned</div>
                  </div>
                  <div className="status-info">
                    <span className={`status ${ref.status}`}>{ref.status}</span>
                    <div className="last-activity">Active {formatTimeAgo(ref.lastActivity)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'invite' && (
          <div className="invite-content">
            <h3>Invite Friends</h3>
            
            <div className="share-methods">
              <button className="share-btn twitter" onClick={shareOnTwitter}>
                🐦 Share on Twitter
              </button>
              <button className="share-btn discord" onClick={shareOnDiscord}>
                💬 Share on Discord  
              </button>
              <button 
                className="share-btn copy" 
                onClick={() => copyToClipboard(generateShareMessage())}
              >
                📋 Copy Message
              </button>
            </div>

            <div className="custom-message">
              <h4>Custom Message</h4>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Write your own invitation message..."
                rows={6}
              />
            </div>

            <div className="message-preview">
              <h4>Message Preview</h4>
              <div className="preview-text">
                {generateShareMessage()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};