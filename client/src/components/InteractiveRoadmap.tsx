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

export const InteractiveRoadmap: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [roadmapData] = useState<RoadmapItem[]>([
    {
      id: 'phase1',
      phase: 'Phase 1',
      title: 'Foundation Launch',
      description: 'Core game mechanics and basic multiplayer functionality',
      status: 'completed',
      quarter: 'Q1 2024',
      progress: 100,
      features: [
        'Real-time multiplayer for 100 players',
        'Basic Agar.io gameplay mechanics',
        'Stacks wallet integration',
        'Entry fee system with STX rewards',
        'Leaderboards and statistics',
        'Mobile-responsive design'
      ]
    },
    {
      id: 'phase2',
      phase: 'Phase 2',
      title: 'Token Launch & Advanced Features',
      description: 'AGAR token deployment and enhanced gaming experience',
      status: 'in-progress',
      quarter: 'Q2 2024',
      progress: 75,
      features: [
        '$AGAR token launch on Stacks',
        'Staking rewards program',
        'NFT skins marketplace',
        'Achievement system',
        'Tournament mode (Beta)',
        'Anti-cheat system',
        'Mobile app development'
      ]
    },
    {
      id: 'phase3',
      phase: 'Phase 3',
      title: 'DeFi Integration',
      description: 'Advanced DeFi features and yield farming opportunities',
      status: 'upcoming',
      quarter: 'Q3 2024',
      progress: 0,
      features: [
        'Liquidity mining programs',
        'Cross-chain bridge (Ethereum)',
        'Governance token voting',
        'Private room betting',
        'Referral system with rewards',
        'Advanced tournament structures',
        'API for third-party developers'
      ]
    },
    {
      id: 'phase4',
      phase: 'Phase 4',
      title: 'Ecosystem Expansion',
      description: 'Multi-game platform and community-driven features',
      status: 'upcoming',
      quarter: 'Q4 2024',
      progress: 0,
      features: [
        'Additional game modes',
        'Community-created content',
        'DAO governance implementation',
        'Mobile app launch',
        'Esports tournaments',
        'Metaverse integration',
        'Educational gaming platform'
      ]
    },
    {
      id: 'phase5',
      phase: 'Phase 5',
      title: 'Global Scale',
      description: 'Worldwide adoption and advanced gaming ecosystem',
      status: 'upcoming',
      quarter: 'Q1 2025',
      progress: 0,
      features: [
        'Multi-language support',
        'Regional tournaments',
        'Professional gaming leagues',
        'VR/AR game modes',
        'AI-powered game balancing',
        'Blockchain gaming SDK',
        'Educational partnerships'
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
            <div className="stat-number">12</div>
            <div className="stat-label">Months Timeline</div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="roadmap-cta">
          <div className="cta-content">
            <h3>Be Part of Our Journey</h3>
            <p>Join thousands of players shaping the future of crypto gaming</p>
            <div className="cta-actions">
              <button className="cta-primary">Join Community</button>
              <button className="cta-secondary">Read Whitepaper</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};