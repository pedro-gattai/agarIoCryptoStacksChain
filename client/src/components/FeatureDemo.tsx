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

    </div>
  );
};