import React, { useState } from 'react';
import type { NFTSkin } from './NFTSkinSystem';

interface MarketplaceListing {
  id: string;
  skin: NFTSkin;
  seller: string;
  price: number;
  originalPrice: number;
  listingDate: Date;
  expiresAt?: Date;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  views: number;
  favorites: number;
}

interface NFTMarketplaceProps {
  onClose?: () => void;
  playerWallet?: string;
  playerBalance?: number;
  onPurchase?: (listingId: string) => Promise<boolean>;
  onListSkin?: (skinId: string, price: number, duration?: number) => Promise<boolean>;
}

const SAMPLE_LISTINGS: MarketplaceListing[] = [
  {
    id: 'listing_1',
    skin: {
      id: 'dragon_scale_rare',
      name: 'Dragon Scale (Rare Variant)',
      description: 'A rare variant with enhanced fire effects',
      image: '🔥',
      rarity: 'epic',
      owned: false,
      equipped: false,
      attributes: {
        pattern: 'scales',
        primaryColor: '#8b0000',
        secondaryColor: '#ff4500',
        effect: 'fire',
        animation: 'pulse'
      },
      collection: 'Fantasy Beasts',
      creator: 'CryptoArtist',
      royalties: 7.5,
      totalSupply: 100,
      currentSupply: 34
    },
    seller: 'DragonMaster123',
    price: 0.45,
    originalPrice: 0.3,
    listingDate: new Date(Date.now() - 86400000 * 2), // 2 days ago
    status: 'active',
    views: 156,
    favorites: 23
  },
  {
    id: 'listing_2',
    skin: {
      id: 'cosmic_orb_gold',
      name: 'Cosmic Orb (Golden Edition)',
      description: 'Limited golden edition with extra sparkle',
      image: '✨',
      rarity: 'legendary',
      owned: false,
      equipped: false,
      attributes: {
        pattern: 'cosmic',
        primaryColor: '#ffd700',
        secondaryColor: '#ffed4e',
        effect: 'sparkle',
        animation: 'rotate'
      },
      collection: 'Celestial Collection',
      creator: 'AgarCrypto Team',
      royalties: 5,
      totalSupply: 50,
      currentSupply: 12
    },
    seller: 'CosmicCollector',
    price: 0.8,
    originalPrice: 0.5,
    listingDate: new Date(Date.now() - 43200000), // 12 hours ago
    expiresAt: new Date(Date.now() + 86400000 * 5), // 5 days from now
    status: 'active',
    views: 289,
    favorites: 67
  },
  {
    id: 'listing_3',
    skin: {
      id: 'cyber_matrix_blue',
      name: 'Cyber Matrix (Blue Variant)',
      description: 'Electric blue cyberpunk aesthetic',
      image: '💠',
      rarity: 'rare',
      owned: false,
      equipped: false,
      attributes: {
        pattern: 'matrix',
        primaryColor: '#0080ff',
        secondaryColor: '#000040',
        effect: 'glitch',
        animation: 'scan'
      },
      collection: 'Cyber Punk',
      creator: 'TechWizard',
      royalties: 3,
      totalSupply: 500,
      currentSupply: 234
    },
    seller: 'CyberNinja',
    price: 0.18,
    originalPrice: 0.15,
    listingDate: new Date(Date.now() - 172800000), // 2 days ago
    status: 'active',
    views: 78,
    favorites: 12
  }
];

export const NFTMarketplace: React.FC<NFTMarketplaceProps> = ({
  onClose,
  // playerWallet,
  playerBalance = 0,
  onPurchase,
  onListSkin
}) => {
  const [listings, setListings] = useState<MarketplaceListing[]>(SAMPLE_LISTINGS);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [view, setView] = useState<'browse' | 'my_listings' | 'list_skin'>('browse');
  const [sortBy, setSortBy] = useState<'price_low' | 'price_high' | 'recent' | 'popular'>('recent');
  const [rarityFilter, setRarityFilter] = useState<'all' | string>('all');
  const [priceRange] = useState<{ min: number; max: number }>({ min: 0, max: 5 });
  const [loading, setLoading] = useState<string | null>(null);
  
  // For listing skins
  const [listingPrice, setListingPrice] = useState(0);
  const [listingDuration, setListingDuration] = useState(7);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#95a5a6';
      case 'rare': return '#3498db';
      case 'epic': return '#9b59b6';
      case 'legendary': return '#f39c12';
      case 'mythic': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const filterAndSortListings = () => {
    return listings
      .filter(listing => {
        if (listing.status !== 'active') return false;
        if (rarityFilter !== 'all' && listing.skin.rarity !== rarityFilter) return false;
        if (listing.price < priceRange.min || listing.price > priceRange.max) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price_low':
            return a.price - b.price;
          case 'price_high':
            return b.price - a.price;
          case 'recent':
            return b.listingDate.getTime() - a.listingDate.getTime();
          case 'popular':
            return b.views - a.views;
          default:
            return 0;
        }
      });
  };

  const handlePurchaseListing = async (listing: MarketplaceListing) => {
    if (!onPurchase || loading) return;
    
    if (playerBalance < listing.price) {
      alert('Insufficient balance to purchase this item!');
      return;
    }

    setLoading(listing.id);
    
    try {
      const success = await onPurchase(listing.id);
      if (success) {
        setListings(prev => prev.map(l => 
          l.id === listing.id ? { ...l, status: 'sold' as const } : l
        ));
        alert(`Successfully purchased ${listing.skin.name}!`);
        setSelectedListing(null);
      } else {
        alert('Purchase failed. Please try again.');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleListSkin = async () => {
    if (!onListSkin || loading || listingPrice <= 0) return;
    
    setLoading('listing');
    
    try {
      const success = await onListSkin('selected_skin_id', listingPrice, listingDuration);
      if (success) {
        alert('Skin listed successfully!');
        setView('browse');
      } else {
        alert('Failed to list skin. Please try again.');
      }
    } catch (error) {
      console.error('Listing error:', error);
      alert('Failed to list skin. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getPriceChange = (listing: MarketplaceListing) => {
    const change = ((listing.price - listing.originalPrice) / listing.originalPrice) * 100;
    return {
      percentage: Math.abs(change),
      isIncrease: change > 0,
      isDecrease: change < 0
    };
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

  const getTimeUntilExpiry = (expiresAt?: Date) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMs <= 0) return 'Expired';
    if (diffDays > 0) return `${diffDays}d left`;
    if (diffHours > 0) return `${diffHours}h left`;
    return 'Expiring soon';
  };

  return (
    <div className="nft-marketplace-container">
      <div className="marketplace-header">
        <div className="header-content">
          <h2>🏪 NFT Marketplace</h2>
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

      <div className="marketplace-tabs">
        {(['browse', 'my_listings', 'list_skin'] as const).map(tab => (
          <button
            key={tab}
            className={`tab-btn ${view === tab ? 'active' : ''}`}
            onClick={() => setView(tab)}
          >
            {tab === 'browse' && 'Browse'}
            {tab === 'my_listings' && 'My Listings'}
            {tab === 'list_skin' && 'List Skin'}
          </button>
        ))}
      </div>

      {view === 'browse' && (
        <>
          <div className="marketplace-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label>Sort by:</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                >
                  <option value="recent">Recently Listed</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Rarity:</label>
                <select 
                  value={rarityFilter} 
                  onChange={(e) => setRarityFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                  <option value="mythic">Mythic</option>
                </select>
              </div>
            </div>
            
            <div className="price-range-filter">
              <label>Price Range: {priceRange.min} - {priceRange.max} STX</label>
              <div className="range-inputs">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={priceRange.min}
                  readOnly
                />
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={priceRange.max}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="marketplace-content">
            <div className="listings-grid">
              {filterAndSortListings().map((listing) => {
                const priceChange = getPriceChange(listing);
                const timeLeft = getTimeUntilExpiry(listing.expiresAt);
                
                return (
                  <div
                    key={listing.id}
                    className={`marketplace-card ${selectedListing?.id === listing.id ? 'selected' : ''}`}
                    onClick={() => setSelectedListing(listing)}
                  >
                    <div className="card-header">
                      <div className="skin-preview">
                        <span className="skin-icon">{listing.skin.image}</span>
                        <div className="rarity-badge" style={{ color: getRarityColor(listing.skin.rarity) }}>
                          {listing.skin.rarity}
                        </div>
                      </div>
                      
                      {timeLeft && (
                        <div className={`expiry-badge ${timeLeft === 'Expired' ? 'expired' : ''}`}>
                          {timeLeft}
                        </div>
                      )}
                    </div>

                    <div className="card-content">
                      <h3 className="skin-name">{listing.skin.name}</h3>
                      <p className="skin-description">{listing.skin.description}</p>
                      
                      <div className="price-info">
                        <div className="current-price">{listing.price.toFixed(3)} STX</div>
                        {priceChange.percentage > 0 && (
                          <div className={`price-change ${priceChange.isIncrease ? 'increase' : 'decrease'}`}>
                            {priceChange.isIncrease ? '+' : '-'}{priceChange.percentage.toFixed(1)}%
                          </div>
                        )}
                      </div>
                      
                      <div className="listing-info">
                        <div className="seller-info">
                          <span>Seller: {listing.seller}</span>
                        </div>
                        <div className="listing-stats">
                          <span>👁️ {listing.views}</span>
                          <span>❤️ {listing.favorites}</span>
                          <span>{formatTimeAgo(listing.listingDate)}</span>
                        </div>
                      </div>

                      <button
                        className="purchase-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurchaseListing(listing);
                        }}
                        disabled={loading === listing.id || playerBalance < listing.price}
                      >
                        {loading === listing.id ? 'Purchasing...' : 
                         playerBalance < listing.price ? 'Insufficient Balance' : 
                         `Buy for ${listing.price.toFixed(3)} STX`}
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {filterAndSortListings().length === 0 && (
                <div className="no-listings">
                  <p>No listings match your current filters.</p>
                </div>
              )}
            </div>

            {selectedListing && (
              <div className="listing-details-panel">
                <h3>{selectedListing.skin.name}</h3>
                
                <div className="detail-section">
                  <h4>Price History</h4>
                  <div className="price-chart">
                    <div className="original-price">
                      Original: {selectedListing.originalPrice.toFixed(3)} STX
                    </div>
                    <div className="current-price-large">
                      Current: {selectedListing.price.toFixed(3)} STX
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Seller Information</h4>
                  <div className="seller-details">
                    <p><strong>Seller:</strong> {selectedListing.seller}</p>
                    <p><strong>Listed:</strong> {formatTimeAgo(selectedListing.listingDate)}</p>
                    {selectedListing.expiresAt && (
                      <p><strong>Expires:</strong> {getTimeUntilExpiry(selectedListing.expiresAt)}</p>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Activity</h4>
                  <div className="activity-stats">
                    <div className="stat-item">
                      <span className="stat-label">Views:</span>
                      <span className="stat-value">{selectedListing.views}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Favorites:</span>
                      <span className="stat-value">{selectedListing.favorites}</span>
                    </div>
                  </div>
                </div>

                <button
                  className="purchase-btn-large"
                  onClick={() => handlePurchaseListing(selectedListing)}
                  disabled={loading === selectedListing.id || playerBalance < selectedListing.price}
                >
                  {loading === selectedListing.id ? 'Purchasing...' : 
                   playerBalance < selectedListing.price ? `Need ${(selectedListing.price - playerBalance).toFixed(3)} more STX` : 
                   `Purchase for ${selectedListing.price.toFixed(3)} STX`}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {view === 'list_skin' && (
        <div className="list-skin-form">
          <h3>List Your Skin for Sale</h3>
          
          <div className="form-group">
            <label>Select Skin:</label>
            <select>
              <option>Ocean Pearl (Owned)</option>
              <option>Cyber Matrix (Owned)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Price (STX):</label>
            <input
              type="number"
              value={listingPrice}
              onChange={(e) => setListingPrice(Number(e.target.value))}
              min="0"
              step="0.001"
              placeholder="0.000"
            />
          </div>
          
          <div className="form-group">
            <label>Listing Duration:</label>
            <select
              value={listingDuration}
              onChange={(e) => setListingDuration(Number(e.target.value))}
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
          
          <div className="listing-preview">
            <h4>Listing Preview</h4>
            <p>Price: {listingPrice.toFixed(3)} STX</p>
            <p>Platform Fee (2.5%): {(listingPrice * 0.025).toFixed(3)} STX</p>
            <p>You will receive: {(listingPrice * 0.975).toFixed(3)} STX</p>
          </div>
          
          <button
            className="list-btn"
            onClick={handleListSkin}
            disabled={loading === 'listing' || listingPrice <= 0}
          >
            {loading === 'listing' ? 'Listing...' : 'List Skin for Sale'}
          </button>
        </div>
      )}

      {view === 'my_listings' && (
        <div className="my-listings">
          <h3>Your Active Listings</h3>
          <div className="empty-state">
            <p>You don't have any active listings.</p>
            <button onClick={() => setView('list_skin')}>
              List a Skin
            </button>
          </div>
        </div>
      )}
    </div>
  );
};