import React, { useState } from 'react';

export interface PowerUp {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  duration: number;
  effect: {
    type: 'speed' | 'size' | 'shield' | 'magnet' | 'stealth' | 'split';
    multiplier?: number;
    value?: number;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  owned?: number;
  maxStack?: number;
}

interface PowerUpShopProps {
  onClose?: () => void;
  playerBalance?: number;
  onPurchase?: (powerUpId: string, quantity: number) => Promise<boolean>;
}

const AVAILABLE_POWERUPS: PowerUp[] = [
  {
    id: 'speed_boost',
    name: 'Speed Boost',
    description: 'Increases movement speed by 50% for 30 seconds',
    icon: '🚀',
    price: 0.01,
    duration: 30000,
    effect: { type: 'speed', multiplier: 1.5 },
    rarity: 'common',
    maxStack: 10
  },
  {
    id: 'size_reduction',
    name: 'Size Reduction',
    description: 'Temporarily reduces your size by 25% for stealth',
    icon: '🔍',
    price: 0.015,
    duration: 45000,
    effect: { type: 'size', multiplier: 0.75 },
    rarity: 'common',
    maxStack: 5
  },
  {
    id: 'shield',
    name: 'Energy Shield',
    description: 'Protects from being eaten by smaller cells',
    icon: '🛡️',
    price: 0.05,
    duration: 15000,
    effect: { type: 'shield', value: 1 },
    rarity: 'rare',
    maxStack: 3
  },
  {
    id: 'magnet',
    name: 'Pellet Magnet',
    description: 'Attracts nearby pellets automatically',
    icon: '🧲',
    price: 0.02,
    duration: 60000,
    effect: { type: 'magnet', value: 100 },
    rarity: 'common',
    maxStack: 5
  },
  {
    id: 'stealth',
    name: 'Stealth Mode',
    description: 'Become invisible to other players for 20 seconds',
    icon: '👻',
    price: 0.1,
    duration: 20000,
    effect: { type: 'stealth', value: 1 },
    rarity: 'epic',
    maxStack: 2
  },
  {
    id: 'mega_split',
    name: 'Mega Split',
    description: 'Split into 8 pieces instead of 4',
    icon: '💥',
    price: 0.08,
    duration: 0,
    effect: { type: 'split', multiplier: 2 },
    rarity: 'rare',
    maxStack: 1
  },
  {
    id: 'growth_serum',
    name: 'Growth Serum',
    description: 'Doubles mass gain from pellets for 2 minutes',
    icon: '💊',
    price: 0.03,
    duration: 120000,
    effect: { type: 'size', multiplier: 2 },
    rarity: 'rare',
    maxStack: 3
  },
  {
    id: 'legendary_aura',
    name: 'Legendary Aura',
    description: 'Combines speed, shield, and magnet effects',
    icon: '✨',
    price: 0.25,
    duration: 30000,
    effect: { type: 'speed', multiplier: 1.3 },
    rarity: 'legendary',
    maxStack: 1
  }
];

export const PowerUpShop: React.FC<PowerUpShopProps> = ({ 
  onClose, 
  playerBalance = 0, 
  onPurchase 
}) => {
  const [powerUps, setPowerUps] = useState<PowerUp[]>(AVAILABLE_POWERUPS);
  const [selectedPowerUp, setSelectedPowerUp] = useState<PowerUp | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'common' | 'rare' | 'epic' | 'legendary'>('all');
  const [sortBy, setSortBy] = useState<'price' | 'name' | 'rarity'>('price');

  const getRarityColor = (rarity: PowerUp['rarity']) => {
    switch (rarity) {
      case 'common': return '#95a5a6';
      case 'rare': return '#3498db';
      case 'epic': return '#9b59b6';
      case 'legendary': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getRarityGlow = (rarity: PowerUp['rarity']) => {
    switch (rarity) {
      case 'common': return '0 0 10px rgba(149, 165, 166, 0.3)';
      case 'rare': return '0 0 15px rgba(52, 152, 219, 0.5)';
      case 'epic': return '0 0 20px rgba(155, 89, 182, 0.7)';
      case 'legendary': return '0 0 25px rgba(243, 156, 18, 0.9)';
      default: return 'none';
    }
  };

  const filteredAndSortedPowerUps = powerUps
    .filter(powerUp => filter === 'all' || powerUp.rarity === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rarity':
          const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 };
          return rarityOrder[a.rarity] - rarityOrder[b.rarity];
        default:
          return 0;
      }
    });

  const handlePurchase = async (powerUp: PowerUp) => {
    if (!onPurchase || purchasing) return;
    
    const totalPrice = powerUp.price * quantity;
    if (playerBalance < totalPrice) {
      alert('Insufficient balance!');
      return;
    }

    setPurchasing(powerUp.id);
    
    try {
      const success = await onPurchase(powerUp.id, quantity);
      if (success) {
        // Update local state to show owned quantity
        setPowerUps(prev => prev.map(p => 
          p.id === powerUp.id 
            ? { ...p, owned: (p.owned || 0) + quantity }
            : p
        ));
        setQuantity(1);
        alert(`Successfully purchased ${quantity}x ${powerUp.name}!`);
      } else {
        alert('Purchase failed. Please try again.');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms === 0) return 'Instant';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="powerup-shop-container">
      <div className="powerup-shop-header">
        <div className="header-content">
          <h2>⚡ Power-Up Shop</h2>
          <div className="balance-display">
            <span className="balance-label">Balance:</span>
            <span className="balance-amount">{playerBalance.toFixed(3)} STX</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        )}
      </div>

      <div className="shop-filters">
        <div className="filter-group">
          <label>Filter:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">All</option>
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="price">Price</option>
            <option value="name">Name</option>
            <option value="rarity">Rarity</option>
          </select>
        </div>
      </div>

      <div className="shop-content">
        <div className="powerups-grid">
          {filteredAndSortedPowerUps.map((powerUp) => {
            // const canAfford = playerBalance >= powerUp.price * quantity;
            const maxQuantity = powerUp.maxStack ? 
              Math.max(0, powerUp.maxStack - (powerUp.owned || 0)) : 10;
            const isMaxed = maxQuantity === 0;

            return (
              <div
                key={powerUp.id}
                className={`powerup-card ${powerUp.rarity} ${selectedPowerUp?.id === powerUp.id ? 'selected' : ''}`}
                style={{
                  borderColor: getRarityColor(powerUp.rarity),
                  boxShadow: getRarityGlow(powerUp.rarity)
                }}
                onClick={() => setSelectedPowerUp(powerUp)}
              >
                <div className="powerup-icon">
                  {powerUp.icon}
                </div>
                
                <div className="powerup-info">
                  <h3 className="powerup-name">
                    {powerUp.name}
                  </h3>
                  <p className="powerup-description">
                    {powerUp.description}
                  </p>
                  
                  <div className="powerup-stats">
                    <div className="stat">
                      <span className="stat-label">Price:</span>
                      <span className="stat-value">{powerUp.price.toFixed(3)} STX</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Duration:</span>
                      <span className="stat-value">{formatDuration(powerUp.duration)}</span>
                    </div>
                    {powerUp.owned && powerUp.owned > 0 && (
                      <div className="stat">
                        <span className="stat-label">Owned:</span>
                        <span className="stat-value">{powerUp.owned}</span>
                      </div>
                    )}
                  </div>

                  <div className="powerup-rarity">
                    <span 
                      style={{ color: getRarityColor(powerUp.rarity) }}
                    >
                      {powerUp.rarity.charAt(0).toUpperCase() + powerUp.rarity.slice(1)}
                    </span>
                  </div>
                </div>

                {isMaxed && (
                  <div className="maxed-overlay">
                    <span>MAX</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedPowerUp && (
          <div className="purchase-panel">
            <h3>Purchase {selectedPowerUp.name}</h3>
            
            <div className="quantity-selector">
              <label>Quantity:</label>
              <div className="quantity-controls">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="quantity-display">{quantity}</span>
                <button 
                  onClick={() => {
                    const maxQuantity = selectedPowerUp.maxStack ? 
                      Math.max(0, selectedPowerUp.maxStack - (selectedPowerUp.owned || 0)) : 10;
                    setQuantity(Math.min(maxQuantity, quantity + 1));
                  }}
                  disabled={quantity >= (selectedPowerUp.maxStack ? 
                    Math.max(0, selectedPowerUp.maxStack - (selectedPowerUp.owned || 0)) : 10)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="purchase-summary">
              <div className="total-price">
                Total: {(selectedPowerUp.price * quantity).toFixed(3)} STX
              </div>
              <div className={`balance-check ${playerBalance >= selectedPowerUp.price * quantity ? 'sufficient' : 'insufficient'}`}>
                Balance: {playerBalance.toFixed(3)} STX
              </div>
            </div>

            <button
              className="purchase-btn"
              onClick={() => handlePurchase(selectedPowerUp)}
              disabled={
                !onPurchase || 
                purchasing === selectedPowerUp.id || 
                playerBalance < selectedPowerUp.price * quantity ||
                Boolean(selectedPowerUp.maxStack && (selectedPowerUp.owned || 0) >= selectedPowerUp.maxStack)
              }
            >
              {purchasing === selectedPowerUp.id ? (
                <span>Purchasing...</span>
              ) : (
                <span>Purchase {quantity}x for {(selectedPowerUp.price * quantity).toFixed(3)} STX</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};