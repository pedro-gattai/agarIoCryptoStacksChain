import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Logger, LogLevel } from 'shared'

// Configure Logger for client
const isDevelopment = import.meta.env.DEV;
Logger.setLevel(isDevelopment ? LogLevel.WARN : LogLevel.ERROR);
Logger.setPrefix('[CLIENT] ');

// Force GameEngineManager singleton creation VERY early
import { gameEngineManager } from './services/GameEngineManager.ts'
Logger.info('GameEngineManager initialized at startup');
gameEngineManager; // This will trigger singleton creation immediately

createRoot(document.getElementById('root')!).render(
  // Temporarily disable StrictMode to avoid double-initialization issues during development
  // <StrictMode>
    <App />
  // </StrictMode>,
)
