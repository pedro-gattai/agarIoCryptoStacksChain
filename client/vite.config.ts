import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': '"development"',
    'process.env.DEMO_MODE': '"true"',
    'process.env.BYPASS_BLOCKCHAIN': '"true"',
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
        globals: {}
      }
    }
  }
})
