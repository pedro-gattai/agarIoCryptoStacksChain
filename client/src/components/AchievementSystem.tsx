import React, { useState, useEffect } from 'react';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: {
    current: number;
    required: number;
  };
}

interface AchievementSystemProps {
  playerId?: string;
  onClose?: () => void;
}

const ACHIEVEMENT_DEFINITIONS: Record<string, Omit<Achievement, 'unlocked' | 'unlockedAt'>> = {
  FIRST_WIN: {
    id: 'FIRST_WIN',
    name: 'First Victory',
    description: 'Win your first game',
    icon: '🏆',
    rarity: 'common'
  },
  WIN_STREAK_5: {
    id: 'WIN_STREAK_5',
    name: 'Hot Streak',
    description: 'Win 5 games in a row',
    icon: '🔥',
    rarity: 'rare'
  },
  WIN_STREAK_10: {
    id: 'WIN_STREAK_10',
    name: 'Unstoppable',
    description: 'Win 10 games in a row',
    icon: '⚡',
    rarity: 'epic'
  },
  KILLER_100: {
    id: 'KILLER_100',
    name: 'Centurion',
    description: 'Eliminate 100 opponents',
    icon: '⚔️',
    rarity: 'rare'
  },
  KILLER_1000: {
    id: 'KILLER_1000',
    name: 'Executioner',
    description: 'Eliminate 1000 opponents',
    icon: '💀',
    rarity: 'legendary'
  },
  EARNER_1_STX: {
    id: 'EARNER_1_STX',
    name: 'First Earnings',
    description: 'Earn your first STX',
    icon: '💰',
    rarity: 'common'
  },
  EARNER_10_STX: {
    id: 'EARNER_10_STX',
    name: 'Big Winner',
    description: 'Earn 10 STX total',
    icon: '💎',
    rarity: 'epic'
  },
  HIGH_SCORE_10K: {
    id: 'HIGH_SCORE_10K',
    name: 'Score Master',
    description: 'Reach 10,000 points in a single game',
    icon: '🎯',
    rarity: 'rare'
  },
  HIGH_SCORE_50K: {
    id: 'HIGH_SCORE_50K',
    name: 'Legend',
    description: 'Reach 50,000 points in a single game',
    icon: '👑',
    rarity: 'legendary'
  },
  SURVIVOR_5MIN: {
    id: 'SURVIVOR_5MIN',
    name: 'Survivor',
    description: 'Survive for 5 minutes',
    icon: '🛡️',
    rarity: 'common'
  },
  SURVIVOR_10MIN: {
    id: 'SURVIVOR_10MIN',
    name: 'Endurance Master',
    description: 'Survive for 10 minutes',
    icon: '🔒',
    rarity: 'rare'
  },
  VETERAN_100: {
    id: 'VETERAN_100',
    name: 'Veteran',
    description: 'Play 100 games',
    icon: '🎮',
    rarity: 'rare'
  },
  VETERAN_500: {
    id: 'VETERAN_500',
    name: 'Master Player',
    description: 'Play 500 games',
    icon: '🏅',
    rarity: 'epic'
  },
  SKILLED_PLAYER: {
    id: 'SKILLED_PLAYER',
    name: 'Skilled Player',
    description: 'Reach 1500 ELO rating',
    icon: '⭐',
    rarity: 'rare'
  },
  EXPERT_PLAYER: {
    id: 'EXPERT_PLAYER',
    name: 'Expert Player',
    description: 'Reach 2000 ELO rating',
    icon: '🌟',
    rarity: 'legendary'
  }
};

export const AchievementSystem: React.FC<AchievementSystemProps> = ({ playerId, onClose }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | 'common' | 'rare' | 'epic' | 'legendary'>('all');

  const fetchPlayerAchievements = async () => {
    if (!playerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3000/api/stats/${playerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch player achievements');
      }
      
      const playerData = await response.json();
      const unlockedAchievements = playerData.achievements || [];
      
      // Create achievement objects with unlock status
      const achievementList: Achievement[] = Object.values(ACHIEVEMENT_DEFINITIONS).map(def => ({
        ...def,
        unlocked: unlockedAchievements.includes(def.id),
        unlockedAt: unlockedAchievements.includes(def.id) ? new Date() : undefined
      }));
      
      setAchievements(achievementList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playerId) {
      fetchPlayerAchievements();
    } else {
      // Show all achievements as locked for demo
      const achievementList: Achievement[] = Object.values(ACHIEVEMENT_DEFINITIONS).map(def => ({
        ...def,
        unlocked: false
      }));
      setAchievements(achievementList);
    }
  }, [playerId]);

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return '#95a5a6';
      case 'rare': return '#3498db';
      case 'epic': return '#9b59b6';
      case 'legendary': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getRarityGlow = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return '0 0 10px rgba(149, 165, 166, 0.5)';
      case 'rare': return '0 0 20px rgba(52, 152, 219, 0.7)';
      case 'epic': return '0 0 30px rgba(155, 89, 182, 0.8)';
      case 'legendary': return '0 0 40px rgba(243, 156, 18, 1)';
      default: return 'none';
    }
  };

  const filteredAchievements = achievements.filter(achievement => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'unlocked' && achievement.unlocked) ||
                         (filter === 'locked' && !achievement.unlocked);
    
    const matchesRarity = rarityFilter === 'all' || achievement.rarity === rarityFilter;
    
    return matchesFilter && matchesRarity;
  });

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="achievement-system-container">
      <div className="achievement-header">
        <div className="header-content">
          <h2>🏅 Achievements</h2>
          <div className="progress-info">
            <span className="progress-text">
              {unlockedCount} / {totalCount} ({completionPercentage}%)
            </span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        )}
      </div>

      <div className="achievement-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">All</option>
            <option value="unlocked">Unlocked</option>
            <option value="locked">Locked</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Rarity:</label>
          <select 
            value={rarityFilter} 
            onChange={(e) => setRarityFilter(e.target.value as typeof rarityFilter)}
          >
            <option value="all">All</option>
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </select>
        </div>
      </div>

      <div className="achievement-content">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading achievements...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>❌ {error}</p>
            <button onClick={fetchPlayerAchievements}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="achievements-grid">
            {filteredAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'} ${achievement.rarity}`}
                style={{
                  borderColor: getRarityColor(achievement.rarity),
                  boxShadow: achievement.unlocked ? getRarityGlow(achievement.rarity) : 'none'
                }}
              >
                <div className="achievement-icon">
                  {achievement.unlocked ? achievement.icon : '🔒'}
                </div>
                
                <div className="achievement-info">
                  <h3 className="achievement-name">
                    {achievement.name}
                  </h3>
                  <p className="achievement-description">
                    {achievement.description}
                  </p>
                  
                  <div className="achievement-meta">
                    <span 
                      className="achievement-rarity"
                      style={{ color: getRarityColor(achievement.rarity) }}
                    >
                      {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
                    </span>
                    
                    {achievement.unlocked && achievement.unlockedAt && (
                      <span className="achievement-date">
                        {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {achievement.progress && (
                    <div className="achievement-progress">
                      <div className="progress-bar-small">
                        <div 
                          className="progress-fill-small"
                          style={{ 
                            width: `${Math.min((achievement.progress.current / achievement.progress.required) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      <span className="progress-text-small">
                        {achievement.progress.current} / {achievement.progress.required}
                      </span>
                    </div>
                  )}
                </div>

                {achievement.unlocked && (
                  <div className="achievement-checkmark">
                    ✅
                  </div>
                )}
              </div>
            ))}
            
            {filteredAchievements.length === 0 && (
              <div className="no-achievements">
                <p>No achievements match the selected filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};