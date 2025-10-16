/**
 * TestnetBanner - Warning banner displayed on all pages except game
 * Alerts users that the project is running on Stacks Testnet
 */

import '../../styles/components/testnet-banner.css';

export function TestnetBanner() {
  return (
    <div className="testnet-banner">
      <div className="testnet-banner-content">
        <span className="testnet-banner-icon">⚠️</span>
        <span className="testnet-banner-text">
          <strong>TESTNET ONLY</strong> - This project is currently running on Stacks Testnet
        </span>
      </div>
    </div>
  );
}
