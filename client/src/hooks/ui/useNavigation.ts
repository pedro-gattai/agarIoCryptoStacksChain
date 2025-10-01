import { useState, useCallback, useMemo } from 'react';
import type { AppState, NavigationHandlers } from 'shared';

export const useNavigation = (initialState: AppState = 'landing') => {
  const [appState, setAppState] = useState<AppState>(initialState);

  const navigate = useCallback((newState: AppState) => {
    setAppState(newState);
  }, []);

  const navigationHandlers: NavigationHandlers = useMemo(() => ({
    onPlayNow: () => navigate('lobby'),
    onShowLeaderboards: () => navigate('leaderboards'),
    onShowAchievements: () => navigate('achievements'),
    onShowTournaments: () => navigate('tournaments'),
    onBackToLanding: () => navigate('landing'),
    onBackToLobby: () => navigate('lobby'),
    onGameStart: () => navigate('game')
  }), [navigate]);

  return {
    appState,
    navigate,
    ...navigationHandlers
  };
};