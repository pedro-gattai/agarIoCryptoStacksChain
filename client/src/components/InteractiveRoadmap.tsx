import React, { useState, useEffect } from 'react';

interface RoadmapItem {
  id: string;
  phase: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  quarter: string;
  features: string[];
  progress: number;
}

interface InteractiveRoadmapProps {
  onShowWhitepaper?: () => void;
}

export const InteractiveRoadmap: React.FC<InteractiveRoadmapProps> = ({ onShowWhitepaper }) => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [roadmapData] = useState<RoadmapItem[]>([
    {
      id: 'phase1',
      phase: 'Phase 1',
      title: 'Current POC',
      description: 'Proof of concept with core infrastructure and testnet deployment',
      status: 'completed',
      quarter: 'Q4 2024',
      progress: 100,
      features: [
        'Smart contract for escrow & distribution',
        'Session recording & hashing',
        'On-chain verification',
        'Anti-cheat validation',
        'Replay APIs',
        'Real-time multiplayer game engine',
        'Wallet integration',
        'Testnet deployment'
      ]
    },
    {
      id: 'phase2',
      phase: 'Phase 2',
      title: 'Production-Ready',
      description: 'Integration with popular games and mainnet deployment',
      status: 'upcoming',
      quarter: 'Q1 2025',
      progress: 0,
      features: [
        'Integration with popular games (LoL, CS:GO, Dota 2)',
        'IPFS storage for replays (decentralized)',
        'Advanced anti-cheat (ML-based detection)',
        'Formal dispute resolution system',
        'Mobile app support (iOS/Android)',
        'Mainnet deployment',
        'Security audit'
      ]
    },
    {
      id: 'phase3',
      phase: 'Phase 3',
      title: 'Platform Growth',
      description: 'Open SDK and enhanced gaming features',
      status: 'upcoming',
      quarter: 'Q2 2025',
      progress: 0,
      features: [
        'Open SDK for any game to integrate',
        'Tournament management system',
        'Team & clan features',
        'Streaming integration (Twitch, YouTube)',
        'Social features (friends, chat)',
        'NFT achievements & badges',
        'Sponsored tournaments'
      ]
    },
    {
      id: 'phase4',
      phase: 'Phase 4',
      title: 'Ecosystem',
      description: 'DAO governance and multi-chain expansion',
      status: 'upcoming',
      quarter: 'Q3 2025',
      progress: 0,
      features: [
        'DAO governance for platform decisions',
        'Platform token launch',
        'Liquidity mining for early users',
        'Multi-chain expansion (Bitcoin L2s)',
        'Developer grants program',
        'Partner network (game studios)'
      ]
    }
  ]);

  const getStatusColor = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in-progress': return '#f59e0b';
      case 'upcoming': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🚧';
      case 'upcoming': return '🔮';
      default: return '⏳';
    }
  };

  return (
    <section id="roadmap" className="roadmap-section">
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Roadmap to the Future</h2>
          <p className="section-subtitle">
            Our journey to revolutionize crypto gaming
          </p>
        </div>

        <div className="roadmap-container">
          <div className="roadmap-timeline">
            {roadmapData.map((item, index) => (
              <div
                key={item.id}
                className={`roadmap-item ${item.status} ${selectedItem === item.id ? 'selected' : ''}`}
                onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
              >
                <div className="roadmap-connector">
                  {index < roadmapData.length - 1 && (
                    <div className={`connector-line ${item.status === 'completed' ? 'completed' : ''}`}></div>
                  )}
                </div>

                <div className="roadmap-node">
                  <div 
                    className="node-circle"
                    style={{ borderColor: getStatusColor(item.status) }}
                  >
                    <span className="node-icon">{getStatusIcon(item.status)}</span>
                  </div>
                </div>

                <div className="roadmap-content">
                  <div className="roadmap-header">
                    <div className="roadmap-meta">
                      <span className="roadmap-phase">{item.phase}</span>
                      <span className="roadmap-quarter">{item.quarter}</span>
                    </div>
                    <h3 className="roadmap-title">{item.title}</h3>
                    <p className="roadmap-description">{item.description}</p>
                  </div>

                  {item.status === 'in-progress' && (
                    <div className="progress-container">
                      <div className="progress-header">
                        <span>Progress</span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {selectedItem === item.id && (
                    <div className="roadmap-details">
                      <h4>Key Features:</h4>
                      <ul className="features-list">
                        {item.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="feature-item">
                            <span className="feature-checkmark">
                              {item.status === 'completed' ? '✓' : 
                               item.status === 'in-progress' ? '⭕' : '○'}
                            </span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap Stats */}
        <div className="roadmap-stats">
          <div className="stat-card">
            <div className="stat-number">
              {roadmapData.filter(item => item.status === 'completed').length}
            </div>
            <div className="stat-label">Phases Completed</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-number">
              {roadmapData.filter(item => item.status === 'in-progress').length}
            </div>
            <div className="stat-label">In Development</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-number">
              {roadmapData.reduce((acc, item) => acc + item.features.length, 0)}
            </div>
            <div className="stat-label">Total Features</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-number">9</div>
            <div className="stat-label">Months Timeline</div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="roadmap-cta">
          <div className="cta-content">
            <h3>Be Part of Our Journey</h3>
            <p>Join thousands of players shaping the future of crypto gaming</p>
            <div className="cta-actions">
              <button
                className="cta-primary"
                onClick={() => window.open('https://t.me/+wYTqPTvz7XY0MGVh', '_blank')}
              >
                Join Community
              </button>
              <button
                className="cta-secondary"
                onClick={onShowWhitepaper}
              >
                Read Whitepaper
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};