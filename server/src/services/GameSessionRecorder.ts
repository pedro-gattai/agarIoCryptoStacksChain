import { createHash } from 'crypto';
import { Logger } from 'shared';

/**
 * Game Event Types for Session Recording
 */
export interface GameEvent {
  timestamp: number;
  type: 'kill' | 'death' | 'pellet_eaten' | 'game_start' | 'game_end' | 'player_join' | 'player_leave';
  playerId?: string;
  data?: any;
}

export interface GameSessionData {
  gameId: string;
  startTime: number;
  endTime?: number;
  events: GameEvent[];
  players: Map<string, PlayerSessionData>;
  finalStats?: {
    winner?: string;
    totalKills: number;
    totalPelletsEaten: number;
    duration: number;
  };
}

export interface PlayerSessionData {
  playerId: string;
  walletAddress?: string;
  joinTime: number;
  leaveTime?: number;
  kills: number;
  deaths: number;
  pelletsEaten: number;
  finalScore: number;
  maxMass: number;
}

/**
 * Records game session events and generates cryptographic hash for on-chain verification
 */
export class GameSessionRecorder {
  private sessions: Map<string, GameSessionData>;
  private activeRecording: boolean;

  constructor() {
    this.sessions = new Map();
    this.activeRecording = true;
    Logger.info('[GameSessionRecorder] Initialized');
  }

  /**
   * Start recording a new game session
   */
  startSession(gameId: string): void {
    if (this.sessions.has(gameId)) {
      Logger.warn(`[GameSessionRecorder] Session ${gameId} already exists, overwriting`);
    }

    const sessionData: GameSessionData = {
      gameId,
      startTime: Date.now(),
      events: [],
      players: new Map(),
    };

    this.sessions.set(gameId, sessionData);

    this.recordEvent(gameId, {
      timestamp: Date.now(),
      type: 'game_start',
      data: { gameId }
    });

    Logger.info(`[GameSessionRecorder] Started session: ${gameId}`);
  }

  /**
   * Record a player joining the game
   */
  recordPlayerJoin(gameId: string, playerId: string, walletAddress?: string): void {
    const session = this.sessions.get(gameId);
    if (!session) {
      Logger.warn(`[GameSessionRecorder] Cannot record player join: session ${gameId} not found`);
      return;
    }

    const playerData: PlayerSessionData = {
      playerId,
      walletAddress,
      joinTime: Date.now(),
      kills: 0,
      deaths: 0,
      pelletsEaten: 0,
      finalScore: 0,
      maxMass: 0,
    };

    session.players.set(playerId, playerData);

    this.recordEvent(gameId, {
      timestamp: Date.now(),
      type: 'player_join',
      playerId,
      data: { walletAddress }
    });
  }

  /**
   * Record a player leaving the game
   */
  recordPlayerLeave(gameId: string, playerId: string, finalScore: number): void {
    const session = this.sessions.get(gameId);
    if (!session) return;

    const playerData = session.players.get(playerId);
    if (playerData) {
      playerData.leaveTime = Date.now();
      playerData.finalScore = finalScore;
    }

    this.recordEvent(gameId, {
      timestamp: Date.now(),
      type: 'player_leave',
      playerId,
      data: { finalScore }
    });
  }

  /**
   * Record a kill event
   */
  recordKill(gameId: string, killerId: string, victimId: string, killerMass: number): void {
    const session = this.sessions.get(gameId);
    if (!session) return;

    const killerData = session.players.get(killerId);
    const victimData = session.players.get(victimId);

    if (killerData) {
      killerData.kills++;
      killerData.maxMass = Math.max(killerData.maxMass, killerMass);
    }

    if (victimData) {
      victimData.deaths++;
    }

    this.recordEvent(gameId, {
      timestamp: Date.now(),
      type: 'kill',
      playerId: killerId,
      data: {
        killer: killerId,
        victim: victimId,
        killerMass
      }
    });
  }

  /**
   * Record a pellet eaten event (batched for performance)
   */
  recordPelletEaten(gameId: string, playerId: string, count: number = 1): void {
    const session = this.sessions.get(gameId);
    if (!session) return;

    const playerData = session.players.get(playerId);
    if (playerData) {
      playerData.pelletsEaten += count;
    }

    // Only record every 10th pellet to avoid too many events
    if (count === 1 && playerData && playerData.pelletsEaten % 10 === 0) {
      this.recordEvent(gameId, {
        timestamp: Date.now(),
        type: 'pellet_eaten',
        playerId,
        data: { totalPellets: playerData.pelletsEaten }
      });
    }
  }

  /**
   * End session and finalize stats
   */
  endSession(gameId: string, winnerId?: string): GameSessionData | null {
    const session = this.sessions.get(gameId);
    if (!session) {
      Logger.warn(`[GameSessionRecorder] Cannot end session: ${gameId} not found`);
      return null;
    }

    session.endTime = Date.now();

    // Calculate final stats
    let totalKills = 0;
    let totalPelletsEaten = 0;

    session.players.forEach((player) => {
      totalKills += player.kills;
      totalPelletsEaten += player.pelletsEaten;
    });

    session.finalStats = {
      winner: winnerId,
      totalKills,
      totalPelletsEaten,
      duration: session.endTime - session.startTime
    };

    this.recordEvent(gameId, {
      timestamp: Date.now(),
      type: 'game_end',
      data: {
        winner: winnerId,
        duration: session.finalStats.duration,
        totalKills,
        totalPlayers: session.players.size
      }
    });

    Logger.info(`[GameSessionRecorder] Ended session: ${gameId} (${session.events.length} events, ${session.players.size} players)`);

    return session;
  }

  /**
   * Generate SHA256 hash of session for on-chain verification
   */
  generateSessionHash(gameId: string): string | null {
    const session = this.sessions.get(gameId);
    if (!session) {
      Logger.warn(`[GameSessionRecorder] Cannot generate hash: session ${gameId} not found`);
      return null;
    }

    // Create deterministic string representation of session
    const sessionString = this.serializeSession(session);

    // Generate SHA256 hash
    const hash = createHash('sha256').update(sessionString).digest('hex');

    Logger.info(`[GameSessionRecorder] Generated hash for session ${gameId}: ${hash.substring(0, 16)}...`);

    return hash;
  }

  /**
   * Get session data (for replay storage)
   */
  getSession(gameId: string): GameSessionData | null {
    return this.sessions.get(gameId) || null;
  }

  /**
   * Get session as JSON (for API export)
   */
  getSessionJSON(gameId: string): string | null {
    const session = this.sessions.get(gameId);
    if (!session) return null;

    // Convert Map to object for JSON serialization
    const sessionObj = {
      gameId: session.gameId,
      startTime: session.startTime,
      endTime: session.endTime,
      events: session.events,
      finalStats: session.finalStats,
      players: Array.from(session.players.entries()).map(([id, data]) => ({
        playerId: id,
        walletAddress: data.walletAddress,
        joinTime: data.joinTime,
        leaveTime: data.leaveTime,
        kills: data.kills,
        deaths: data.deaths,
        pelletsEaten: data.pelletsEaten,
        finalScore: data.finalScore,
        maxMass: data.maxMass
      }))
    };

    return JSON.stringify(sessionObj, null, 2);
  }

  /**
   * Clear old sessions (memory management)
   */
  clearSession(gameId: string): void {
    this.sessions.delete(gameId);
    Logger.info(`[GameSessionRecorder] Cleared session: ${gameId}`);
  }

  /**
   * Clear sessions older than specified time (in milliseconds)
   */
  clearOldSessions(maxAge: number = 3600000): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.sessions.forEach((session, gameId) => {
      const sessionAge = now - session.startTime;
      if (sessionAge > maxAge) {
        toDelete.push(gameId);
      }
    });

    toDelete.forEach(gameId => this.clearSession(gameId));

    if (toDelete.length > 0) {
      Logger.info(`[GameSessionRecorder] Cleared ${toDelete.length} old sessions`);
    }
  }

  /**
   * Get total number of active sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  // Private helper methods

  private recordEvent(gameId: string, event: GameEvent): void {
    if (!this.activeRecording) return;

    const session = this.sessions.get(gameId);
    if (!session) return;

    session.events.push(event);
  }

  private serializeSession(session: GameSessionData): string {
    // Create a deterministic string from session data
    const parts: string[] = [];

    // Session metadata
    parts.push(`GAME:${session.gameId}`);
    parts.push(`START:${session.startTime}`);
    parts.push(`END:${session.endTime || 0}`);

    // Player data (sorted by playerId for determinism)
    const sortedPlayers = Array.from(session.players.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    sortedPlayers.forEach(([playerId, data]) => {
      parts.push(`PLAYER:${playerId}:${data.kills}:${data.deaths}:${data.pelletsEaten}:${data.finalScore}`);
    });

    // Events (already in chronological order)
    session.events.forEach(event => {
      parts.push(`EVENT:${event.timestamp}:${event.type}:${event.playerId || 'SYSTEM'}:${JSON.stringify(event.data || {})}`);
    });

    // Final stats
    if (session.finalStats) {
      parts.push(`STATS:${session.finalStats.winner || 'NONE'}:${session.finalStats.totalKills}:${session.finalStats.totalPelletsEaten}:${session.finalStats.duration}`);
    }

    return parts.join('|');
  }
}

// Export singleton instance
export const gameSessionRecorder = new GameSessionRecorder();
