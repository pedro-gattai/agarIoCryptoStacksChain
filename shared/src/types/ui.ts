// UI-specific types

// App navigation state
export type AppState = 'landing' | 'lobby' | 'game' | 'leaderboards' | 'achievements' | 'tournaments';

// Modal state interface
export interface ModalState {
  isOpen: boolean;
  title?: string;
  content?: string;
  onClose?: () => void;
  onConfirm?: () => void;
}

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  color?: string;
  id?: string;
}

// HUD player interface
export interface HUDPlayer {
  id?: string;
  name?: string;
  score: number;
  size?: number;
}

// Achievement interface
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

// Tournament interface
export interface Tournament {
  id: string;
  title: string;
  description: string;
  entryFee: number;
  prizePool: number;
  startTime: Date;
  endTime: Date;
  maxParticipants: number;
  currentParticipants: number;
  status: 'upcoming' | 'active' | 'finished';
}

// Navigation handler interface
export interface NavigationHandlers {
  onPlayNow: () => void;
  onShowLeaderboards: () => void;
  onShowAchievements: () => void;
  onShowTournaments: () => void;
  onBackToLanding: () => void;
  onBackToLobby: () => void;
  onGameStart: () => void;
}

// Game status interface for UI
export interface UIGameStatus {
  playersOnline: number;
  maxPlayers: number;
  queuePosition: number;
  inQueue: boolean;
  inGame: boolean;
}