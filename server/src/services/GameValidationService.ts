import { Logger } from 'shared';
import { GameSessionData, PlayerSessionData } from './GameSessionRecorder.js';

/**
 * Game Validation Service
 *
 * Validates game sessions for fairness and detects cheating attempts.
 * Critical for betting/wagering scenarios where money is involved.
 *
 * Validation checks:
 * - Movement speed (impossible velocity)
 * - Mass changes (suspicious gains)
 * - Kill patterns (unrealistic kill counts)
 * - Session integrity (timing, event order)
 */

export interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
  riskScore: number; // 0-100, higher = more suspicious
  recommendation: 'APPROVE' | 'REVIEW' | 'REJECT';
}

export interface ValidationViolation {
  type: 'SPEED' | 'MASS' | 'KILLS' | 'TIMING' | 'INTEGRITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  playerId?: string;
  description: string;
  evidence: any;
}

export class GameValidationService {
  // Detect testnet/development mode from environment
  private readonly isTestnetMode: boolean;

  // Anti-cheat thresholds (adjusted based on network)
  private readonly MAX_REASONABLE_KILLS: number;
  private readonly MAX_REASONABLE_KDR: number;
  private readonly MIN_GAME_DURATION: number;
  private readonly MAX_GAME_DURATION: number;
  private readonly MAX_PELLETS_PER_SECOND: number;
  private readonly SUSPICIOUS_MASS_THRESHOLD: number;
  private readonly MIN_EVENTS: number;
  private readonly MIN_PELLETS_PER_PLAYER: number;

  constructor() {
    // Check if running on testnet or development
    // FIXED: More robust detection with fallback to testnet
    const stacksNetwork = process.env.STACKS_NETWORK;
    const nodeEnv = process.env.NODE_ENV;

    Logger.info(`[GameValidationService] Environment variables:`);
    Logger.info(`  - STACKS_NETWORK: ${stacksNetwork || 'undefined'}`);
    Logger.info(`  - NODE_ENV: ${nodeEnv || 'undefined'}`);

    // Default to testnet unless explicitly set to mainnet
    this.isTestnetMode = stacksNetwork !== 'mainnet';

    if (this.isTestnetMode) {
      // TESTNET/DEV: Relaxed thresholds for testing
      this.MAX_REASONABLE_KILLS = 100;
      this.MAX_REASONABLE_KDR = 50;
      this.MIN_GAME_DURATION = 10000; // 10 seconds
      this.MAX_GAME_DURATION = 7200000; // 2 hours
      this.MAX_PELLETS_PER_SECOND = 50;
      this.SUSPICIOUS_MASS_THRESHOLD = 50000;
      this.MIN_EVENTS = 2; // Reduced from 5
      this.MIN_PELLETS_PER_PLAYER = 3; // Reduced from 10

      Logger.info('[GameValidationService] Initialized in TESTNET/DEV mode (relaxed thresholds)');
    } else {
      // MAINNET: Strict thresholds for production
      this.MAX_REASONABLE_KILLS = 50;
      this.MAX_REASONABLE_KDR = 20;
      this.MIN_GAME_DURATION = 30000; // 30 seconds
      this.MAX_GAME_DURATION = 3600000; // 1 hour
      this.MAX_PELLETS_PER_SECOND = 20;
      this.SUSPICIOUS_MASS_THRESHOLD = 10000;
      this.MIN_EVENTS = 5;
      this.MIN_PELLETS_PER_PLAYER = 10;

      Logger.info('[GameValidationService] Initialized in MAINNET mode (strict thresholds)');
    }
  }

  /**
   * Validate a complete game session
   * Returns validation result with any violations found
   */
  validateSession(session: GameSessionData): ValidationResult {
    const violations: ValidationViolation[] = [];

    // Check session integrity
    violations.push(...this.validateSessionIntegrity(session));

    // Check each player for suspicious behavior
    session.players.forEach((playerData, playerId) => {
      violations.push(...this.validatePlayer(playerData, session));
    });

    // Calculate risk score (0-100)
    const riskScore = this.calculateRiskScore(violations);

    // Determine recommendation
    const recommendation = this.getRecommendation(riskScore, violations);

    const isValid = recommendation !== 'REJECT';

    // Log validation result with mode context
    const modeStr = this.isTestnetMode ? 'TESTNET/DEV' : 'MAINNET';
    Logger.info(`[GameValidationService] [${modeStr}] Session ${session.gameId} validated: ${isValid ? 'VALID' : 'INVALID'} (risk: ${riskScore}, violations: ${violations.length}, recommendation: ${recommendation})`);

    // If rejected, log detailed explanation
    if (!isValid) {
      Logger.warn(`[GameValidationService] Session REJECTED. Violations:`);
      violations.forEach((v, i) => {
        Logger.warn(`  ${i+1}. [${v.severity}] ${v.type}: ${v.description}`);
      });
    }

    return {
      isValid,
      violations,
      riskScore,
      recommendation
    };
  }

  /**
   * Validate session-level integrity
   */
  private validateSessionIntegrity(session: GameSessionData): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Check game duration
    if (session.endTime && session.startTime) {
      const duration = session.endTime - session.startTime;

      if (duration < this.MIN_GAME_DURATION) {
        violations.push({
          type: 'TIMING',
          severity: 'HIGH',
          description: `Game duration too short: ${duration}ms (minimum: ${this.MIN_GAME_DURATION}ms)`,
          evidence: { duration, startTime: session.startTime, endTime: session.endTime }
        });
      }

      if (duration > this.MAX_GAME_DURATION) {
        violations.push({
          type: 'TIMING',
          severity: 'MEDIUM',
          description: `Game duration suspiciously long: ${duration}ms`,
          evidence: { duration }
        });
      }
    }

    // Check for minimum events
    if (session.events.length < this.MIN_EVENTS) {
      // In testnet mode, downgrade severity to MEDIUM
      const severity = this.isTestnetMode ? 'MEDIUM' : 'HIGH';

      violations.push({
        type: 'INTEGRITY',
        severity: severity,
        description: `Too few events recorded: ${session.events.length} (minimum: ${this.MIN_EVENTS})`,
        evidence: { eventCount: session.events.length, minRequired: this.MIN_EVENTS }
      });
    }

    // Check for minimum players
    if (session.players.size < 1) {
      violations.push({
        type: 'INTEGRITY',
        severity: 'CRITICAL',
        description: 'No players in session',
        evidence: { playerCount: session.players.size }
      });
    }

    // Check events are in chronological order
    for (let i = 1; i < session.events.length; i++) {
      if (session.events[i].timestamp < session.events[i - 1].timestamp) {
        violations.push({
          type: 'INTEGRITY',
          severity: 'CRITICAL',
          description: 'Events not in chronological order',
          evidence: {
            event1: session.events[i - 1],
            event2: session.events[i]
          }
        });
        break;
      }
    }

    return violations;
  }

  /**
   * Validate individual player behavior
   */
  private validatePlayer(player: PlayerSessionData, session: GameSessionData): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Check kill count
    if (player.kills > this.MAX_REASONABLE_KILLS) {
      violations.push({
        type: 'KILLS',
        severity: 'HIGH',
        playerId: player.playerId,
        description: `Unrealistic kill count: ${player.kills}`,
        evidence: { kills: player.kills, maxReasonable: this.MAX_REASONABLE_KILLS }
      });
    }

    // Check Kill/Death ratio
    if (player.deaths > 0) {
      const kdr = player.kills / player.deaths;
      if (kdr > this.MAX_REASONABLE_KDR) {
        violations.push({
          type: 'KILLS',
          severity: 'MEDIUM',
          playerId: player.playerId,
          description: `Suspicious K/D ratio: ${kdr.toFixed(2)}`,
          evidence: { kdr, kills: player.kills, deaths: player.deaths }
        });
      }
    }

    // Check max mass
    if (player.maxMass > this.SUSPICIOUS_MASS_THRESHOLD) {
      violations.push({
        type: 'MASS',
        severity: 'LOW',
        playerId: player.playerId,
        description: `Very high max mass: ${player.maxMass}`,
        evidence: { maxMass: player.maxMass }
      });
    }

    // Check pellets eaten rate
    if (player.leaveTime && player.joinTime) {
      const duration = (player.leaveTime - player.joinTime) / 1000; // seconds
      const pelletsPerSecond = player.pelletsEaten / duration;

      if (pelletsPerSecond > this.MAX_PELLETS_PER_SECOND) {
        violations.push({
          type: 'SPEED',
          severity: 'HIGH',
          playerId: player.playerId,
          description: `Impossible pellet consumption rate: ${pelletsPerSecond.toFixed(2)} pellets/second`,
          evidence: { pelletsPerSecond, pelletsEaten: player.pelletsEaten, duration }
        });
      }
    }

    // Check for zero activity (AFK farming)
    // In testnet mode, only flag if COMPLETELY inactive (0 pellets)
    const minPellets = this.isTestnetMode ? 0 : this.MIN_PELLETS_PER_PLAYER;
    if (player.kills === 0 && player.deaths === 0 && player.pelletsEaten <= minPellets) {
      // In testnet, only add violation if truly 0 activity
      if (!this.isTestnetMode || player.pelletsEaten === 0) {
        violations.push({
          type: 'INTEGRITY',
          severity: this.isTestnetMode ? 'LOW' : 'MEDIUM',
          playerId: player.playerId,
          description: `Player showed minimal activity (possible AFK)`,
          evidence: { kills: player.kills, deaths: player.deaths, pelletsEaten: player.pelletsEaten }
        });
      }
    }

    return violations;
  }

  /**
   * Calculate overall risk score (0-100)
   */
  private calculateRiskScore(violations: ValidationViolation[]): number {
    if (violations.length === 0) return 0;

    const severityScores = {
      'LOW': 10,
      'MEDIUM': 25,
      'HIGH': 50,
      'CRITICAL': 100
    };

    let totalScore = 0;
    violations.forEach(v => {
      totalScore += severityScores[v.severity];
    });

    // Cap at 100
    return Math.min(100, totalScore);
  }

  /**
   * Get recommendation based on risk score
   */
  private getRecommendation(
    riskScore: number,
    violations: ValidationViolation[]
  ): 'APPROVE' | 'REVIEW' | 'REJECT' {
    // Auto-reject if any CRITICAL violations
    if (violations.some(v => v.severity === 'CRITICAL')) {
      return 'REJECT';
    }

    // Auto-reject if risk score too high
    if (riskScore >= 75) {
      return 'REJECT';
    }

    // Manual review if moderate risk
    if (riskScore >= 40 || violations.some(v => v.severity === 'HIGH')) {
      return 'REVIEW';
    }

    // Approve if low risk
    return 'APPROVE';
  }

  /**
   * Validate session hash matches expected
   * Use for on-chain verification
   */
  validateHash(expectedHash: string, actualHash: string): boolean {
    return expectedHash === actualHash;
  }

  /**
   * Generate audit log for session
   * Useful for disputes and manual review
   */
  generateAuditLog(session: GameSessionData, validation: ValidationResult): string {
    const log = [];

    log.push('='.repeat(80));
    log.push('GAME SESSION AUDIT LOG');
    log.push('='.repeat(80));
    log.push(`Game ID: ${session.gameId}`);
    log.push(`Start Time: ${new Date(session.startTime).toISOString()}`);
    log.push(`End Time: ${session.endTime ? new Date(session.endTime).toISOString() : 'N/A'}`);
    log.push(`Duration: ${session.endTime ? ((session.endTime - session.startTime) / 1000).toFixed(2) : 'N/A'}s`);
    log.push(`Total Events: ${session.events.length}`);
    log.push(`Total Players: ${session.players.size}`);
    log.push('');

    log.push('-'.repeat(80));
    log.push('VALIDATION RESULT');
    log.push('-'.repeat(80));
    log.push(`Valid: ${validation.isValid ? 'YES' : 'NO'}`);
    log.push(`Risk Score: ${validation.riskScore}/100`);
    log.push(`Recommendation: ${validation.recommendation}`);
    log.push(`Violations: ${validation.violations.length}`);
    log.push('');

    if (validation.violations.length > 0) {
      log.push('-'.repeat(80));
      log.push('VIOLATIONS');
      log.push('-'.repeat(80));
      validation.violations.forEach((v, i) => {
        log.push(`${i + 1}. [${v.severity}] ${v.type}${v.playerId ? ` - Player: ${v.playerId}` : ''}`);
        log.push(`   ${v.description}`);
        log.push(`   Evidence: ${JSON.stringify(v.evidence)}`);
        log.push('');
      });
    }

    log.push('-'.repeat(80));
    log.push('PLAYER STATS');
    log.push('-'.repeat(80));
    Array.from(session.players.values()).forEach((player, i) => {
      log.push(`Player ${i + 1}: ${player.playerId}`);
      log.push(`  Wallet: ${player.walletAddress || 'N/A'}`);
      log.push(`  Kills: ${player.kills} | Deaths: ${player.deaths} | K/D: ${player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : 'N/A'}`);
      log.push(`  Pellets: ${player.pelletsEaten} | Final Score: ${player.finalScore} | Max Mass: ${player.maxMass}`);
      log.push('');
    });

    log.push('='.repeat(80));

    return log.join('\n');
  }
}

// Export singleton instance
export const gameValidationService = new GameValidationService();
