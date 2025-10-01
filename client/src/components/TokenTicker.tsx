import React from 'react';

export const TokenTicker: React.FC = () => {
  // Static "coming soon" data instead of dynamic updates
  const priceData = {
    price: "Soon...",
    change24h: "TBA",
    volume24h: "TBA",
    marketCap: "TBA", 
    holders: "TBA"
  };

  return (
    <div className="token-ticker">
      <div className="ticker-container">
        <div className="ticker-scroll">
          <div className="ticker-item primary">
            <span className="ticker-label">$AGAR</span>
            <span className="ticker-value">{priceData.price}</span>
            <span className="ticker-change neutral">
              {priceData.change24h}
            </span>
          </div>
          
          <div className="ticker-separator">|</div>
          
          <div className="ticker-item">
            <span className="ticker-label">Volume 24H</span>
            <span className="ticker-value">{priceData.volume24h}</span>
          </div>
          
          <div className="ticker-separator">|</div>
          
          <div className="ticker-item">
            <span className="ticker-label">Market Cap</span>
            <span className="ticker-value">{priceData.marketCap}</span>
          </div>
          
          <div className="ticker-separator">|</div>
          
          <div className="ticker-item">
            <span className="ticker-label">Holders</span>
            <span className="ticker-value">{priceData.holders}</span>
          </div>
          
          <div className="ticker-separator">|</div>
          
          <div className="ticker-item">
            <span className="ticker-label">Live Games</span>
            <span className="ticker-value">🟡 Pre-Launch</span>
          </div>
          
          <div className="ticker-separator">|</div>
          
          <div className="ticker-item">
            <span className="ticker-label">Total Rewards Paid</span>
            <span className="ticker-value">Soon...</span>
          </div>
          
          {/* Repeat for continuous scroll effect */}
          <div className="ticker-separator">|</div>
          
          <div className="ticker-item primary">
            <span className="ticker-label">$AGAR</span>
            <span className="ticker-value">{priceData.price}</span>
            <span className="ticker-change neutral">
              {priceData.change24h}
            </span>
          </div>
          
          <div className="ticker-separator">|</div>
          
          <div className="ticker-item">
            <span className="ticker-label">Volume 24H</span>
            <span className="ticker-value">{priceData.volume24h}</span>
          </div>
          
          <div className="ticker-separator">|</div>
          
          <div className="ticker-item">
            <span className="ticker-label">Market Cap</span>
            <span className="ticker-value">{priceData.marketCap}</span>
          </div>
        </div>
      </div>
    </div>
  );
};