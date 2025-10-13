import React from 'react';

interface WalletLogoProps {
  walletName: string;
  size?: number;
  className?: string;
}

export const WalletLogo: React.FC<WalletLogoProps> = ({
  walletName,
  size = 32,
  className = ''
}) => {
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    display: 'inline-block',
    flexShrink: 0
  };

  // Hiro Wallet Logo (Purple/Orange gradient)
  if (walletName === 'Hiro Wallet' || walletName === 'Hiro') {
    return (
      <svg style={style} className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hiroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5546FF" />
            <stop offset="100%" stopColor="#FC6432" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="16" fill="url(#hiroGradient)" />
        <path
          d="M10 10h4v12h-4v-12zm8 0h4v5h-4v-5zm0 7h4v5h-4v-5z"
          fill="white"
        />
      </svg>
    );
  }

  // Xverse Logo (Blue/Purple)
  if (walletName === 'Xverse') {
    return (
      <svg style={style} className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="xverseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#xverseGradient)" />
        <path
          d="M8 24l8-8-8-8h4l6 6-6 6h-4zm8 0l8-8-8-8h4l6 6-6 6h-4z"
          fill="white"
          opacity="0.9"
        />
      </svg>
    );
  }

  // Leather Logo (Brown/Orange)
  if (walletName === 'Leather') {
    return (
      <svg style={style} className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="leatherGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#92400E" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="6" fill="url(#leatherGradient)" />
        <path
          d="M16 8l6 6-6 6-6-6 6-6zm0 10l4 4h-8l4-4z"
          fill="white"
        />
      </svg>
    );
  }

  // Default fallback (generic wallet icon)
  return (
    <svg style={style} className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="defaultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#defaultGradient)" />
      <path
        d="M8 12c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2v-8zm12 3a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
        fill="white"
      />
    </svg>
  );
};
