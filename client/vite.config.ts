import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      'shared': path.resolve(__dirname, '../shared/dist/index.js'),
    },
  },
  // Include shared package in build
  optimizeDeps: {
    include: ['shared']
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        // Optimize chunk splitting for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'stacks-vendor': ['@stacks/connect', '@stacks/transactions', '@stacks/network', '@stacks/auth'],
          'socket-vendor': ['socket.io-client'],
        }
      }
    },
    // Production build optimizations
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
  // Server configuration for development
  server: {
    port: 5173,
    strictPort: false,
    host: true,
  },
})
