import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';

interface DemoStep {
  id: string;
  title: string;
  description: string;
  action: string;
  icon: string;
  completed: boolean;
}

export const FeatureDemo: React.FC = () => {
  const { isSignedIn, connect, balance } = useWallet();
  
  const [demoSteps, setDemoSteps] = useState<DemoStep[]>([
    {
      id: 'wallet',
      title: 'Connect Stacks Wallet',
      description: 'Connect your Stacks wallet to start playing and earning STX',
      action: 'Connect Wallet',
      icon: '👛',
      completed: false
    },
    {
      id: 'game',
      title: 'Join Live Game',
      description: 'Pay a small STX entry fee to join multiplayer agar.io action',
      action: 'Join Game (0.01 STX)',
      icon: '🎮',
      completed: false
    },
    {
      id: 'play',
      title: 'Play & Compete',
      description: 'Eat smaller players, avoid bigger ones, climb the leaderboard',
      action: 'Start Playing',
      icon: '🏆',
      completed: false
    },
    {
      id: 'win',
      title: 'Win STX Prizes',
      description: 'Top 3 players automatically receive STX rewards to their wallet',
      action: 'Collect Winnings',
      icon: '💰',
      completed: false
    }
  ]);

  const [selectedFeature, setSelectedFeature] = useState<string>('smart-contracts');

  const features = {
    'smart-contracts': {
      title: '🔗 Smart Contract Integration',
      description: 'Fully automated prize distribution using Clarity smart contracts',
      details: [
        'Entry fees held in escrow',
        'Automatic prize distribution',
        'Transparent game mechanics',
        'No centralized control'
      ],
      code: `
;; Stacks Clarity Contract
(define-public (join-game (game-id uint))
  (let ((entry-fee (get entry-fee game-pool)))
    (try! (stx-transfer? entry-fee tx-sender (as-contract tx-sender)))
    (map-set player-entries 
      { game-id: game-id, player: tx-sender }
      { entry-time: stacks-block-height, paid: true })
    (ok true)))
      `
    },
    'real-time': {
      title: '⚡ Real-time Multiplayer',
      description: 'Seamless multiplayer experience with blockchain rewards',
      details: [
        'WebSocket-based communication',
        'Sub-100ms latency',
        'Up to 20 players per game',
        'Live position tracking'
      ],
      code: `
// Real-time game state synchronization
socket.on('gameUpdate', (gameState) => {
  updatePlayerPositions(gameState.players);
  updatePellets(gameState.pellets);
  checkCollisions();
  
  if (gameState.status === 'finished') {
    distributePrizes(gameState.winners);
  }
});
      `
    },
    'wallet': {
      title: '👛 Stacks Wallet Integration',
      description: 'Native integration with Stacks Connect for seamless UX',
      details: [
        'One-click wallet connection',
        'Real-time balance updates',
        'Secure transaction signing',
        'Multiple wallet support'
      ],
      code: `
// Stacks Connect Integration
import { showConnect, showSTXTransfer } from '@stacks/connect';

const connectWallet = () => {
  showConnect({
    appDetails: { name: 'AgarCoin', icon: '/logo.svg' },
    onFinish: (data) => {
      setWalletConnected(true);
      refreshBalance();
    }
  });
};
      `
    },
    'defi': {
      title: '💎 DeFi Gaming Mechanics',
      description: 'Transparent prize pools and automated reward distribution',
      details: [
        '50%/30%/20% prize distribution',
        '20% protocol fee',
        'Instant STX payouts',
        'Verifiable randomness'
      ],
      code: `
// Prize Distribution Logic
const calculatePrizes = (totalPool: number) => ({
  first: totalPool * 0.5,   // 50% to winner
  second: totalPool * 0.3,  // 30% to second
  third: totalPool * 0.2,   // 20% to third
  house: totalPool * 0.2    // 20% house fee
});
      `
    }
  };

  const markStepCompleted = (stepId: string) => {
    setDemoSteps(prev => 
      prev.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      )
    );
  };

  const handleStepAction = async (step: DemoStep) => {
    switch (step.id) {
      case 'wallet':
        if (!isSignedIn) {
          connect();
        }
        markStepCompleted('wallet');
        break;
      case 'game':
        // Simulate joining game
        setTimeout(() => markStepCompleted('game'), 1000);
        break;
      case 'play':
        // Simulate playing
        setTimeout(() => markStepCompleted('play'), 2000);
        break;
      case 'win':
        // Simulate winning
        setTimeout(() => markStepCompleted('win'), 1500);
        break;
    }
  };

  return (
    <div className="feature-demo">
      <div className="demo-header">
        <h1>🚀 Live Demo - AgarCoin Features</h1>
        <p>Experience blockchain gaming on Stacks in real-time</p>
      </div>

      <div className="demo-content">
        {/* Demo Steps */}
        <div className="demo-steps">
          <h2>🎯 Try It Yourself</h2>
          <div className="steps-container">
            {demoSteps.map((step, index) => (
              <div 
                key={step.id} 
                className={`demo-step ${step.completed ? 'completed' : ''}`}
              >
                <div className="step-number">{index + 1}</div>
                <div className="step-icon">{step.icon}</div>
                <div className="step-content">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <button
                    className={`step-action ${step.completed ? 'completed' : ''}`}
                    onClick={() => handleStepAction(step)}
                    disabled={step.completed}
                  >
                    {step.completed ? '✅ Completed' : step.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Showcase */}
        <div className="feature-showcase">
          <h2>🛠️ Technical Features</h2>
          <div className="feature-tabs">
            {Object.entries(features).map(([key, feature]) => (
              <button
                key={key}
                className={`feature-tab ${selectedFeature === key ? 'active' : ''}`}
                onClick={() => setSelectedFeature(key)}
              >
                {feature.title}
              </button>
            ))}
          </div>

          <div className="feature-content">
            <div className="feature-info">
              <h3>{features[selectedFeature as keyof typeof features].title}</h3>
              <p>{features[selectedFeature as keyof typeof features].description}</p>
              
              <div className="feature-details">
                <h4>Key Features:</h4>
                <ul>
                  {features[selectedFeature as keyof typeof features].details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="feature-code">
              <h4>Code Example:</h4>
              <pre>
                <code>{features[selectedFeature as keyof typeof features].code}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <div className="metrics-dashboard">
          <h2>📊 Live Metrics</h2>
          <div className="metrics-grid">
            <div className="metric">
              <div className="metric-icon">🎮</div>
              <div className="metric-value">147</div>
              <div className="metric-label">Games Played</div>
            </div>
            <div className="metric">
              <div className="metric-icon">💰</div>
              <div className="metric-value">{balance.toFixed(2)} STX</div>
              <div className="metric-label">Your Balance</div>
            </div>
            <div className="metric">
              <div className="metric-icon">👥</div>
              <div className="metric-value">89</div>
              <div className="metric-label">Active Players</div>
            </div>
            <div className="metric">
              <div className="metric-icon">🏆</div>
              <div className="metric-value">23.4 STX</div>
              <div className="metric-label">Total Prizes</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .feature-demo {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          font-family: 'Inter', sans-serif;
        }

        .demo-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .demo-header h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .demo-header p {
          font-size: 1.2rem;
          color: #666;
        }

        .demo-content {
          display: grid;
          gap: 3rem;
        }

        .demo-steps h2 {
          margin-bottom: 1.5rem;
          color: #333;
        }

        .steps-container {
          display: grid;
          gap: 1.5rem;
        }

        .demo-step {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border: 2px solid #f0f0f0;
          transition: all 0.3s;
        }

        .demo-step.completed {
          border-color: #28a745;
          background: #f8fff9;
        }

        .step-number {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #667eea;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .demo-step.completed .step-number {
          background: #28a745;
        }

        .step-icon {
          font-size: 2rem;
        }

        .step-content {
          flex: 1;
        }

        .step-content h3 {
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        .step-content p {
          margin: 0 0 1rem 0;
          color: #666;
        }

        .step-action {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .step-action:hover:not(:disabled) {
          background: #5a6fd8;
          transform: translateY(-1px);
        }

        .step-action.completed {
          background: #28a745;
          cursor: default;
        }

        .step-action:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .feature-showcase h2 {
          margin-bottom: 1.5rem;
          color: #333;
        }

        .feature-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .feature-tab {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .feature-tab.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .feature-tab:hover:not(.active) {
          background: #e9ecef;
        }

        .feature-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .feature-info h3 {
          margin-bottom: 1rem;
          color: #333;
        }

        .feature-info p {
          color: #666;
          margin-bottom: 1.5rem;
        }

        .feature-details h4 {
          margin-bottom: 0.5rem;
          color: #333;
        }

        .feature-details ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .feature-details li {
          margin-bottom: 0.5rem;
          color: #666;
        }

        .feature-code h4 {
          margin-bottom: 1rem;
          color: #333;
        }

        .feature-code pre {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 0;
        }

        .feature-code code {
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.85rem;
          color: #333;
        }

        .metrics-dashboard h2 {
          margin-bottom: 1.5rem;
          color: #333;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }

        .metric {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          text-align: center;
        }

        .metric-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: bold;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .metric-label {
          color: #666;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .feature-demo {
            padding: 1rem;
          }
          
          .demo-step {
            flex-direction: column;
            text-align: center;
          }
          
          .feature-content {
            grid-template-columns: 1fr;
          }
          
          .feature-tabs {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};