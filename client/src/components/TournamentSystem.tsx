import React, { useState } from 'react';

interface Tournament {
  id: string;
  name: string;
  description: string;
  type: 'single_elimination' | 'double_elimination' | 'round_robin';
  status: 'upcoming' | 'registration' | 'active' | 'completed';
  entryFee: number;
  prizePool: number;
  maxParticipants: number;
  currentParticipants: number;
  startTime: Date;
  endTime?: Date;
  registrationDeadline: Date;
  minEloRequired?: number;
  sponsor?: string;
  rules: string[];
}

interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1?: string;
  player2?: string;
  winner?: string;
  status: 'pending' | 'active' | 'completed';
  scheduledTime?: Date;
  gameId?: string;
}

interface TournamentSystemProps {
  onClose?: () => void;
  playerWallet?: string;
  playerBalance?: number;
  onJoinTournament?: (tournamentId: string) => Promise<boolean>;
}

const SAMPLE_TOURNAMENTS: Tournament[] = [
  {
    id: 'weekly_championship',
    name: 'Weekly Championship',
    description: 'The biggest tournament of the week with massive prizes!',
    type: 'single_elimination',
    status: 'registration',
    entryFee: 0.1,
    prizePool: 5.6,
    maxParticipants: 64,
    currentParticipants: 42,
    startTime: new Date(Date.now() + 86400000 * 2), // 2 days from now
    registrationDeadline: new Date(Date.now() + 86400000), // 1 day from now
    minEloRequired: 1200,
    sponsor: 'AgarCrypto',
    rules: [
      'Single elimination format',
      'Best of 3 games per match',
      '10 minute time limit per game',
      'No power-ups allowed',
      'Minimum 1200 ELO required'
    ]
  },
  {
    id: 'newbie_tournament',
    name: 'Newbie Tournament',
    description: 'Perfect for new players to compete and learn',
    type: 'round_robin',
    status: 'upcoming',
    entryFee: 0.01,
    prizePool: 0.32,
    maxParticipants: 16,
    currentParticipants: 8,
    startTime: new Date(Date.now() + 86400000 * 5), // 5 days from now
    registrationDeadline: new Date(Date.now() + 86400000 * 4), // 4 days from now
    rules: [
      'Round robin format',
      'All players play each other once',
      '5 minute games',
      'Basic power-ups allowed',
      'No ELO requirement'
    ]
  },
  {
    id: 'elite_masters',
    name: 'Elite Masters Cup',
    description: 'Only for the highest ranked players',
    type: 'double_elimination',
    status: 'active',
    entryFee: 0.5,
    prizePool: 12.8,
    maxParticipants: 32,
    currentParticipants: 32,
    startTime: new Date(Date.now() - 3600000), // Started 1 hour ago
    registrationDeadline: new Date(Date.now() - 86400000), // Deadline passed
    minEloRequired: 1800,
    sponsor: 'CryptoGaming',
    rules: [
      'Double elimination bracket',
      'Best of 5 final matches',
      'All power-ups enabled',
      'Minimum 1800 ELO required',
      'Premium skins only'
    ]
  }
];

const SAMPLE_MATCHES: TournamentMatch[] = [
  {
    id: 'match_1',
    tournamentId: 'elite_masters',
    round: 1,
    matchNumber: 1,
    player1: 'ProGamer123',
    player2: 'EliteMaster',
    winner: 'ProGamer123',
    status: 'completed'
  },
  {
    id: 'match_2',
    tournamentId: 'elite_masters',
    round: 1,
    matchNumber: 2,
    player1: 'CryptoKing',
    player2: 'AgarLegend',
    status: 'active',
    scheduledTime: new Date(Date.now() + 1800000) // 30 minutes from now
  }
];

export const TournamentSystem: React.FC<TournamentSystemProps> = ({
  onClose,
  // playerWallet,
  playerBalance = 0,
  onJoinTournament
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>(SAMPLE_TOURNAMENTS);
  const [matches] = useState<TournamentMatch[]>(SAMPLE_MATCHES);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [view, setView] = useState<'browse' | 'my_tournaments' | 'bracket'>('browse');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'registration' | 'active'>('all');
  const [joining, setJoining] = useState<string | null>(null);

  const getStatusColor = (status: Tournament['status']) => {
    switch (status) {
      case 'upcoming': return '#3498db';
      case 'registration': return '#2ecc71';
      case 'active': return '#f39c12';
      case 'completed': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: Tournament['status']) => {
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'registration': return 'Registration Open';
      case 'active': return 'Live';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const canJoinTournament = (tournament: Tournament) => {
    if (tournament.status !== 'registration') return false;
    if (tournament.currentParticipants >= tournament.maxParticipants) return false;
    if (playerBalance < tournament.entryFee) return false;
    if (tournament.registrationDeadline < new Date()) return false;
    return true;
  };

  const handleJoinTournament = async (tournament: Tournament) => {
    if (!onJoinTournament || joining || !canJoinTournament(tournament)) return;
    
    setJoining(tournament.id);
    
    try {
      const success = await onJoinTournament(tournament.id);
      if (success) {
        setTournaments(prev => prev.map(t => 
          t.id === tournament.id 
            ? { ...t, currentParticipants: t.currentParticipants + 1 }
            : t
        ));
        alert(`Successfully joined ${tournament.name}!`);
      } else {
        alert('Failed to join tournament. Please try again.');
      }
    } catch (error) {
      console.error('Join tournament error:', error);
      alert('Failed to join tournament. Please try again.');
    } finally {
      setJoining(null);
    }
  };

  const filteredTournaments = tournaments.filter(tournament => 
    filter === 'all' || tournament.status === filter
  );

  const formatTimeUntil = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Started';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h ${Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))}m`;
    return `${Math.floor(diffMs / (1000 * 60))}m`;
  };

  const generateBracket = (tournamentId: string) => {
    const tournamentMatches = matches.filter(m => m.tournamentId === tournamentId);
    const rounds = [...new Set(tournamentMatches.map(m => m.round))].sort();
    
    return rounds.map(round => ({
      round,
      matches: tournamentMatches.filter(m => m.round === round).sort((a, b) => a.matchNumber - b.matchNumber)
    }));
  };

  return (
    <div className="tournament-system-container">
      <div className="tournament-header">
        <div className="header-content">
          <h2>🏆 Tournament Center</h2>
          <div className="balance-display">
            <span className="balance-label">Balance:</span>
            <span className="balance-amount">{playerBalance.toFixed(3)} STX</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        )}
      </div>

      <div className="tournament-tabs">
        {(['browse', 'my_tournaments', 'bracket'] as const).map(tab => (
          <button
            key={tab}
            className={`tab-btn ${view === tab ? 'active' : ''}`}
            onClick={() => setView(tab)}
          >
            {tab === 'browse' && 'Browse'}
            {tab === 'my_tournaments' && 'My Tournaments'}
            {tab === 'bracket' && 'Live Brackets'}
          </button>
        ))}
      </div>

      {view === 'browse' && (
        <>
          <div className="tournament-filters">
            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value as typeof filter)}
              >
                <option value="all">All</option>
                <option value="registration">Registration Open</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Live</option>
              </select>
            </div>
          </div>

          <div className="tournaments-grid">
            {filteredTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className={`tournament-card ${selectedTournament?.id === tournament.id ? 'selected' : ''}`}
                onClick={() => setSelectedTournament(tournament)}
              >
                <div className="tournament-header-card">
                  <h3>{tournament.name}</h3>
                  <div 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(tournament.status) }}
                  >
                    {getStatusText(tournament.status)}
                  </div>
                </div>

                <p className="tournament-description">{tournament.description}</p>

                <div className="tournament-stats">
                  <div className="stat-row">
                    <span className="stat-label">Prize Pool:</span>
                    <span className="stat-value prize">{tournament.prizePool.toFixed(3)} STX</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Entry Fee:</span>
                    <span className="stat-value">{tournament.entryFee.toFixed(3)} STX</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Players:</span>
                    <span className="stat-value">
                      {tournament.currentParticipants}/{tournament.maxParticipants}
                    </span>
                  </div>
                  {tournament.minEloRequired && (
                    <div className="stat-row">
                      <span className="stat-label">Min ELO:</span>
                      <span className="stat-value">{tournament.minEloRequired}</span>
                    </div>
                  )}
                </div>

                <div className="tournament-timing">
                  {tournament.status === 'registration' && (
                    <div className="timing-info">
                      <span>Registration ends: {formatTimeUntil(tournament.registrationDeadline)}</span>
                    </div>
                  )}
                  {tournament.status === 'upcoming' && (
                    <div className="timing-info">
                      <span>Starts in: {formatTimeUntil(tournament.startTime)}</span>
                    </div>
                  )}
                  {tournament.status === 'active' && (
                    <div className="timing-info live">
                      <span>🔴 LIVE NOW</span>
                    </div>
                  )}
                </div>

                <div className="tournament-actions">
                  {canJoinTournament(tournament) && (
                    <button
                      className="join-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinTournament(tournament);
                      }}
                      disabled={joining === tournament.id}
                    >
                      {joining === tournament.id ? 'Joining...' : `Join (${tournament.entryFee.toFixed(3)} STX)`}
                    </button>
                  )}
                  {tournament.status === 'active' && (
                    <button className="spectate-btn">
                      Spectate
                    </button>
                  )}
                  {!canJoinTournament(tournament) && tournament.status === 'registration' && (
                    <span className="cannot-join">
                      {playerBalance < tournament.entryFee ? 'Insufficient Balance' :
                       tournament.currentParticipants >= tournament.maxParticipants ? 'Full' :
                       tournament.registrationDeadline < new Date() ? 'Registration Closed' : 'Cannot Join'}
                    </span>
                  )}
                </div>

                {tournament.sponsor && (
                  <div className="sponsor">
                    Sponsored by {tournament.sponsor}
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedTournament && (
            <div className="tournament-details-panel">
              <h3>{selectedTournament.name}</h3>
              
              <div className="detail-section">
                <h4>Tournament Rules</h4>
                <ul className="rules-list">
                  {selectedTournament.rules.map((rule, index) => (
                    <li key={index}>{rule}</li>
                  ))}
                </ul>
              </div>

              <div className="detail-section">
                <h4>Prize Distribution</h4>
                <div className="prize-breakdown">
                  <div className="prize-item">
                    <span>🥇 1st Place:</span>
                    <span>{(selectedTournament.prizePool * 0.5).toFixed(3)} STX</span>
                  </div>
                  <div className="prize-item">
                    <span>🥈 2nd Place:</span>
                    <span>{(selectedTournament.prizePool * 0.3).toFixed(3)} STX</span>
                  </div>
                  <div className="prize-item">
                    <span>🥉 3rd Place:</span>
                    <span>{(selectedTournament.prizePool * 0.2).toFixed(3)} STX</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {view === 'bracket' && (
        <div className="bracket-view">
          <h3>Live Tournament Brackets</h3>
          <div className="tournament-selector">
            <select onChange={(e) => {
              const tournament = tournaments.find(t => t.id === e.target.value);
              setSelectedTournament(tournament || null);
            }}>
              <option value="">Select Tournament</option>
              {tournaments.filter(t => t.status === 'active').map(tournament => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTournament && (
            <div className="bracket-container">
              {generateBracket(selectedTournament.id).map(({ round, matches }) => (
                <div key={round} className="bracket-round">
                  <h4>Round {round}</h4>
                  <div className="matches-column">
                    {matches.map((match) => (
                      <div key={match.id} className={`match-card ${match.status}`}>
                        <div className="match-header">
                          <span>Match {match.matchNumber}</span>
                          {match.status === 'active' && <span className="live-indicator">🔴 LIVE</span>}
                        </div>
                        <div className="match-players">
                          <div className={`player ${match.winner === match.player1 ? 'winner' : ''}`}>
                            {match.player1 || 'TBD'}
                          </div>
                          <div className="vs">vs</div>
                          <div className={`player ${match.winner === match.player2 ? 'winner' : ''}`}>
                            {match.player2 || 'TBD'}
                          </div>
                        </div>
                        {match.scheduledTime && match.status === 'pending' && (
                          <div className="match-time">
                            {formatTimeUntil(match.scheduledTime)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'my_tournaments' && (
        <div className="my-tournaments">
          <h3>Your Tournaments</h3>
          <div className="empty-state">
            <p>You haven't joined any tournaments yet.</p>
            <button onClick={() => setView('browse')}>
              Browse Tournaments
            </button>
          </div>
        </div>
      )}
    </div>
  );
};