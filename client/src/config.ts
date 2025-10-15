/**
 * Application Configuration
 *
 * This file centralizes all environment-specific configuration.
 * It uses Vite's import.meta.env for environment variables.
 *
 * Environment variables must be prefixed with VITE_ to be exposed to the client.
 *
 * @see https://vitejs.dev/guide/env-and-mode.html
 */

interface AppConfig {
  // Server Configuration
  serverUrl: string;

  // Environment
  isDevelopment: boolean;
  isProduction: boolean;

  // Feature Flags
  demoMode: boolean;
  bypassBlockchain: boolean;

  // Stacks Configuration
  stacksNetwork: 'testnet' | 'mainnet';
}

const getServerUrl = (): string => {
  // Priority:
  // 1. Environment variable (for production builds)
  // 2. Mode-based default (development vs production)

  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }

  // Development default
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:3000';
  }

  // Production default (should be overridden by env var)
  console.warn('⚠️ VITE_SERVER_URL not set! Using placeholder. Set this in Cloudflare Pages environment variables.');
  return 'https://your-backend-url.railway.app';
};

export const config: AppConfig = {
  // Server
  serverUrl: getServerUrl(),

  // Environment
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',

  // Feature Flags
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
  bypassBlockchain: import.meta.env.VITE_BYPASS_BLOCKCHAIN === 'true',

  // Stacks
  stacksNetwork: (import.meta.env.VITE_STACKS_NETWORK as 'testnet' | 'mainnet') || 'testnet',
};

// Log configuration in development
if (config.isDevelopment) {
  console.log('📝 App Configuration:', {
    serverUrl: config.serverUrl,
    mode: import.meta.env.MODE,
    demoMode: config.demoMode,
    stacksNetwork: config.stacksNetwork,
  });
}

// Validate required config in production
if (config.isProduction) {
  if (config.serverUrl.includes('your-backend-url')) {
    console.error('❌ CRITICAL: VITE_SERVER_URL not configured for production!');
    console.error('Set this in Cloudflare Pages Environment Variables:');
    console.error('VITE_SERVER_URL=https://your-backend.railway.app');
  }
}

export default config;
