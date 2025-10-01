import { useEffect } from 'react'
import { useNavigation } from './hooks/ui/useNavigation'
import { CombinedProvider } from './contexts/CombinedProvider'
import { LandingPage } from './components/LandingPage'
import { GameCanvas } from './components/GameCanvas'
import { GameLobby } from './components/GameLobby'
import { Leaderboards } from './components/Leaderboards'
import { AchievementSystem } from './components/AchievementSystem'
import { TournamentSystem } from './components/TournamentSystem'
import { ActionButton } from './components/ui/ActionButton'
import './styles/index.css'

// Componente interno que usa os hooks
function AppContent() {
  const {
    appState,
    onGameStart,
    onBackToLobby,
    onBackToLanding,
    onPlayNow,
    onShowLeaderboards,
    onShowAchievements,
    onShowTournaments
  } = useNavigation();

  // Gerenciar classes CSS baseadas no estado da aplicação
  useEffect(() => {
    const appElement = document.querySelector('.app');
    const bodyElement = document.body;

    // Remover todas as classes de estado anteriores
    appElement?.classList.remove('app-game', 'app-lobby', 'app-landing');
    bodyElement?.classList.remove('game-mode');

    // Adicionar classes baseadas no estado atual
    if (appState === 'game') {
      appElement?.classList.add('app-game');
      bodyElement?.classList.add('game-mode');
    } else if (appState === 'lobby') {
      appElement?.classList.add('app-lobby');
    } else if (appState === 'landing') {
      appElement?.classList.add('app-landing');
    }
  }, [appState]);

  return (
    <div className="app">
      {appState === 'landing' && (
        <LandingPage
          onPlayNow={onPlayNow}
          onShowLeaderboards={onShowLeaderboards}
          onShowAchievements={onShowAchievements}
          onShowTournaments={onShowTournaments}
        />
      )}

      {appState === 'lobby' && (
        <GameLobby 
          onGameStart={onGameStart}
          onShowLeaderboards={onShowLeaderboards}
          onShowAchievements={onShowAchievements}
          onBackToMenu={onBackToLanding}
        />
      )}

      {appState === 'game' && (
        <>
          <GameCanvas 
            className="main-game"
            isMultiplayer={true}
          />
          
          {/* Game controls using new ActionButton component */}
          <div className="game-controls">
            <ActionButton onClick={onBackToLobby} variant="secondary" size="small">
              ← Back to Lobby
            </ActionButton>
            
            <ActionButton onClick={onBackToLanding} variant="secondary" size="small">
              🏠 Home
            </ActionButton>
            
            <ActionButton onClick={onShowLeaderboards} variant="secondary" size="small">
              🏆 Leaderboards
            </ActionButton>
            
            <ActionButton onClick={onShowAchievements} variant="secondary" size="small">
              🏅 Achievements
            </ActionButton>
          </div>
        </>
      )}

      {appState === 'leaderboards' && (
        <Leaderboards onClose={onBackToLanding} />
      )}

      {appState === 'achievements' && (
        <AchievementSystem onClose={onBackToLanding} />
      )}

      {appState === 'tournaments' && (
        <TournamentSystem onClose={onBackToLanding} />
      )}
    </div>
  )
}

// Componente principal App
function App() {
  return (
    <CombinedProvider serverUrl="http://localhost:3000">
      <AppContent />
    </CombinedProvider>
  )
}

export default App
