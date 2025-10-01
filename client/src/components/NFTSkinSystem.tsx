import React, { useState } from 'react';

export interface NFTSkin {
  id: string;
  name: string;
  description: string;
  image: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  price?: number;
  mintAddress?: string;
  owned: boolean;
  equipped: boolean;
  attributes: {
    pattern: string;
    primaryColor: string;
    secondaryColor: string;
    effect?: string;
    animation?: string;
  };
  stats?: {
    boost?: number;
    speedBonus?: number;
    sizeBonus?: number;
  };
  collection: string;
  creator: string;
  royalties: number;
  totalSupply: number;
  currentSupply: number;
}

interface NFTSkinSystemProps {
  onClose?: () => void;
  playerWallet?: string;
  onEquipSkin?: (skinId: string) => void;
  onMintSkin?: (skinId: string) => Promise<boolean>;
}

const AVAILABLE_SKINS: NFTSkin[] = [
  {
    id: 'cosmic_orb',
    name: 'Cosmic Orb',
    description: 'A mystical orb that shimmers with the light of distant stars',
    image: '🌟',
    rarity: 'legendary',
    price: 0.5,
    owned: false,
    equipped: false,
    attributes: {
      pattern: 'cosmic',
      primaryColor: '#4a0e4e',
      secondaryColor: '#ffd700',
      effect: 'sparkle',
      animation: 'rotate'
    },
    stats: {
      boost: 10,
      speedBonus: 5
    },
    collection: 'Celestial Collection',
    creator: 'AgarCrypto Team',
    royalties: 5,
    totalSupply: 100,
    currentSupply: 23
  },
  {
    id: 'dragon_scale',
    name: 'Dragon Scale',
    description: 'Forged from the scales of an ancient dragon',
    image: '🐉',
    rarity: 'epic',
    price: 0.3,
    owned: false,
    equipped: false,
    attributes: {
      pattern: 'scales',
      primaryColor: '#8b0000',
      secondaryColor: '#ff4500',
      effect: 'fire',
      animation: 'pulse'
    },
    stats: {
      boost: 7,
      sizeBonus: 3
    },
    collection: 'Fantasy Beasts',
    creator: 'CryptoArtist',
    royalties: 7.5,
    totalSupply: 500,
    currentSupply: 156
  },
  {
    id: 'cyber_matrix',
    name: 'Cyber Matrix',
    description: 'Digital patterns from the cyberpunk future',
    image: '🤖',
    rarity: 'rare',
    price: 0.15,
    owned: true,
    equipped: false,
    attributes: {
      pattern: 'matrix',
      primaryColor: '#00ff00',
      secondaryColor: '#000000',
      effect: 'glitch',
      animation: 'scan'
    },
    stats: {
      boost: 5,
      speedBonus: 8
    },
    collection: 'Cyber Punk',
    creator: 'TechWizard',
    royalties: 3,
    totalSupply: 1000,
    currentSupply: 789
  },
  {
    id: 'ocean_pearl',
    name: 'Ocean Pearl',
    description: 'Shimmering like pearls from the ocean depths',
    image: '🌊',
    rarity: 'common',
    price: 0.05,
    owned: true,
    equipped: true,
    attributes: {
      pattern: 'pearl',
      primaryColor: '#4682b4',
      secondaryColor: '#b0e0e6',
      effect: 'shimmer'
    },
    stats: {
      boost: 2
    },
    collection: 'Ocean Treasures',
    creator: 'SeaArtist',
    royalties: 2.5,
    totalSupply: 2000,
    currentSupply: 1456
  },
  {
    id: 'void_shadow',
    name: 'Void Shadow',
    description: 'Born from the darkness between dimensions',
    image: '🌑',
    rarity: 'mythic',
    price: 1.0,
    owned: false,
    equipped: false,
    attributes: {
      pattern: 'void',
      primaryColor: '#1a1a1a',
      secondaryColor: '#800080',
      effect: 'shadow',
      animation: 'dissolve'
    },
    stats: {
      boost: 15,
      speedBonus: 10,
      sizeBonus: 5
    },
    collection: 'Legendary Artifacts',
    creator: 'VoidMaster',
    royalties: 10,
    totalSupply: 10,
    currentSupply: 3
  },
  {
    id: 'rainbow_prism',
    name: 'Rainbow Prism',
    description: 'Refracts light into beautiful rainbow patterns',
    image: '🌈',
    rarity: 'rare',
    price: 0.2,
    owned: false,
    equipped: false,
    attributes: {
      pattern: 'prism',
      primaryColor: '#ff0000',
      secondaryColor: '#00ff00',
      effect: 'rainbow',
      animation: 'cycle'
    },
    stats: {
      boost: 6,
      speedBonus: 4
    },
    collection: 'Prismatic Wonders',
    creator: 'ColorMage',
    royalties: 4,
    totalSupply: 750,
    currentSupply: 234
  }
];

export const NFTSkinSystem: React.FC<NFTSkinSystemProps> = ({ 
  onClose, 
  playerWallet,
  onEquipSkin,
  onMintSkin 
}) => {
  const [skins, setSkins] = useState<NFTSkin[]>(AVAILABLE_SKINS);
  const [selectedSkin, setSelectedSkin] = useState<NFTSkin | null>(null);
  const [view, setView] = useState<'owned' | 'marketplace' | 'forge'>('owned');
  const [rarityFilter, setRarityFilter] = useState<'all' | NFTSkin['rarity']>('all');
  const [sortBy, setSortBy] = useState<'name' | 'rarity' | 'price'>('rarity');
  const [loading, setLoading] = useState<string | null>(null);

  const getRarityColor = (rarity: NFTSkin['rarity']) => {
    switch (rarity) {
      case 'common': return '#95a5a6';
      case 'rare': return '#3498db';
      case 'epic': return '#9b59b6';
      case 'legendary': return '#f39c12';
      case 'mythic': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getRarityGlow = (rarity: NFTSkin['rarity']) => {
    switch (rarity) {
      case 'common': return '0 0 10px rgba(149, 165, 166, 0.5)';
      case 'rare': return '0 0 15px rgba(52, 152, 219, 0.7)';
      case 'epic': return '0 0 20px rgba(155, 89, 182, 0.8)';
      case 'legendary': return '0 0 25px rgba(243, 156, 18, 1)';
      case 'mythic': return '0 0 30px rgba(231, 76, 60, 1.2)';
      default: return 'none';
    }
  };

  const filterSkins = () => {
    return skins
      .filter(skin => {
        if (view === 'owned' && !skin.owned) return false;
        if (view === 'marketplace' && skin.owned) return false;
        if (rarityFilter !== 'all' && skin.rarity !== rarityFilter) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'price':
            return (a.price || 0) - (b.price || 0);
          case 'rarity':
            const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
            return rarityOrder[b.rarity] - rarityOrder[a.rarity];
          default:
            return 0;
        }
      });
  };

  const handleEquipSkin = async (skin: NFTSkin) => {
    if (!skin.owned || !onEquipSkin) return;
    
    setLoading('equipping');
    try {
      await onEquipSkin(skin.id);
      setSkins(prev => prev.map(s => ({
        ...s,
        equipped: s.id === skin.id
      })));
    } catch (error) {
      console.error('Failed to equip skin:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleMintSkin = async (skin: NFTSkin) => {
    if (!onMintSkin) return;
    
    setLoading(skin.id);
    try {
      const success = await onMintSkin(skin.id);
      if (success) {
        setSkins(prev => prev.map(s => 
          s.id === skin.id ? { ...s, owned: true, currentSupply: s.currentSupply + 1 } : s
        ));
        alert(`Successfully minted ${skin.name}!`);
      } else {
        alert('Failed to mint NFT. Please try again.');
      }
    } catch (error) {
      console.error('Failed to mint skin:', error);
      alert('Failed to mint NFT. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getAvailabilityText = (skin: NFTSkin) => {
    const remaining = skin.totalSupply - skin.currentSupply;
    if (remaining === 0) return 'SOLD OUT';
    if (remaining <= 10) return `Only ${remaining} left!`;
    return `${remaining}/${skin.totalSupply} available`;
  };

  return (
    <div className="nft-skin-system-container">
      <div className="nft-skin-header">
        <div className="header-content">
          <h2>🎨 NFT Skin Collection</h2>
          <div className="wallet-info">
            <span className="wallet-label">Wallet:</span>
            <span className="wallet-address">
              {playerWallet ? `${playerWallet.slice(0, 8)}...${playerWallet.slice(-6)}` : 'Not connected'}
            </span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        )}
      </div>

      <div className="nft-skin-tabs">
        {(['owned', 'marketplace', 'forge'] as const).map(tab => (
          <button
            key={tab}
            className={`tab-btn ${view === tab ? 'active' : ''}`}
            onClick={() => setView(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'owned' && (
              <span className="tab-count">({skins.filter(s => s.owned).length})</span>
            )}
          </button>
        ))}
      </div>

      <div className="nft-filters">
        <div className="filter-group">
          <label>Rarity:</label>
          <select 
            value={rarityFilter} 
            onChange={(e) => setRarityFilter(e.target.value as typeof rarityFilter)}
          >
            <option value="all">All</option>
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
            <option value="mythic">Mythic</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="rarity">Rarity</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
          </select>
        </div>
      </div>

      <div className="nft-content">
        <div className="skins-grid">
          {filterSkins().map((skin) => (
            <div
              key={skin.id}
              className={`nft-skin-card ${skin.rarity} ${skin.equipped ? 'equipped' : ''} ${selectedSkin?.id === skin.id ? 'selected' : ''}`}
              style={{
                borderColor: getRarityColor(skin.rarity),
                boxShadow: getRarityGlow(skin.rarity)
              }}
              onClick={() => setSelectedSkin(skin)}
            >
              <div className="skin-image">
                {skin.image}
              </div>
              
              <div className="skin-info">
                <h3 className="skin-name">
                  {skin.name}
                  {skin.equipped && <span className="equipped-badge">EQUIPPED</span>}
                </h3>
                
                <p className="skin-description">
                  {skin.description}
                </p>
                
                <div className="skin-stats">
                  <div className="rarity-badge" style={{ color: getRarityColor(skin.rarity) }}>
                    {skin.rarity.charAt(0).toUpperCase() + skin.rarity.slice(1)}
                  </div>
                  
                  {skin.price && (
                    <div className="price-badge">
                      {skin.price} STX
                    </div>
                  )}
                </div>

                {skin.stats && (
                  <div className="bonus-stats">
                    {skin.stats.boost && <span>+{skin.stats.boost}% Score</span>}
                    {skin.stats.speedBonus && <span>+{skin.stats.speedBonus}% Speed</span>}
                    {skin.stats.sizeBonus && <span>+{skin.stats.sizeBonus}% Size</span>}
                  </div>
                )}

                <div className="availability">
                  {getAvailabilityText(skin)}
                </div>

                <div className="skin-actions">
                  {skin.owned ? (
                    <>
                      {!skin.equipped && (
                        <button
                          className="equip-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEquipSkin(skin);
                          }}
                          disabled={loading === 'equipping'}
                        >
                          {loading === 'equipping' ? 'Equipping...' : 'Equip'}
                        </button>
                      )}
                      {skin.equipped && (
                        <span className="equipped-text">Currently Equipped</span>
                      )}
                    </>
                  ) : (
                    <button
                      className="mint-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMintSkin(skin);
                      }}
                      disabled={loading === skin.id || skin.currentSupply >= skin.totalSupply}
                    >
                      {loading === skin.id ? 'Minting...' : 
                       skin.currentSupply >= skin.totalSupply ? 'Sold Out' : 
                       `Mint for ${skin.price} STX`}
                    </button>
                  )}
                </div>
              </div>

              {skin.rarity === 'mythic' && (
                <div className="mythic-aura"></div>
              )}
            </div>
          ))}
          
          {filterSkins().length === 0 && (
            <div className="no-skins">
              <p>
                {view === 'owned' 
                  ? 'You don\'t own any NFT skins yet. Visit the marketplace to mint some!'
                  : 'No skins match your current filters.'}
              </p>
            </div>
          )}
        </div>

        {selectedSkin && (
          <div className="skin-details-panel">
            <h3>{selectedSkin.name}</h3>
            
            <div className="detail-section">
              <h4>Attributes</h4>
              <div className="attributes-grid">
                <div className="attribute">
                  <span>Pattern:</span>
                  <span>{selectedSkin.attributes.pattern}</span>
                </div>
                <div className="attribute">
                  <span>Primary Color:</span>
                  <span style={{ color: selectedSkin.attributes.primaryColor }}>
                    {selectedSkin.attributes.primaryColor}
                  </span>
                </div>
                <div className="attribute">
                  <span>Secondary Color:</span>
                  <span style={{ color: selectedSkin.attributes.secondaryColor }}>
                    {selectedSkin.attributes.secondaryColor}
                  </span>
                </div>
                {selectedSkin.attributes.effect && (
                  <div className="attribute">
                    <span>Effect:</span>
                    <span>{selectedSkin.attributes.effect}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="detail-section">
              <h4>Collection Info</h4>
              <div className="collection-info">
                <p><strong>Collection:</strong> {selectedSkin.collection}</p>
                <p><strong>Creator:</strong> {selectedSkin.creator}</p>
                <p><strong>Royalties:</strong> {selectedSkin.royalties}%</p>
                <p><strong>Supply:</strong> {selectedSkin.currentSupply}/{selectedSkin.totalSupply}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};