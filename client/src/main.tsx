import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Force GameEngineManager singleton creation VERY early
import { gameEngineManager } from './services/GameEngineManager.ts'
console.log('🎯 [MAIN] Forcing GameEngineManager initialization at app startup...')
gameEngineManager; // This will trigger singleton creation immediately

createRoot(document.getElementById('root')!).render(
  // Temporarily disable StrictMode to avoid double-initialization issues during development
  // <StrictMode>
    <App />
  // </StrictMode>,
)
