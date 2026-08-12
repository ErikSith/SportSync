/** Gamified emoji mapping for profile badges and event highlights. */

export const BADGE_EMOJIS: Record<string, string> = {
  'first-match': '👟',
  finisher: '🏁',
  'karma-king': '👑',
  'tournament-pro': '🏆',
  student: '📚',
  'elite-contender': '💎',
  'event-finisher': '🥇',
  'tournament-champion': '🏅',
  'sport-specialist': '🎾',
};

export const SPORT_EMOJIS: Record<string, string> = {
  RUNNING: '🏃',
  TENNIS: '🎾',
  PADEL: '🎾',
  FOOTBALL: '⚽',
  BASKETBALL: '🏀',
  CYCLING: '🚴',
  GOLF: '⛳',
  SQUASH: '🎾',
  FITNESS: '💪',
  HOCKEY: '🏒',
  HANDBALL: '🤾',
  COMBAT: '🥊',
  VOLLEYBALL: '🏐',
  SWIMMING: '🏊',
  SURFING: '🏄',
  OTHER: '🏅',
};

export function badgeEmoji(badgeId: string): string {
  return BADGE_EMOJIS[badgeId] ?? '🏅';
}

export function sportEmoji(sport: string): string {
  return SPORT_EMOJIS[sport.toUpperCase()] ?? '🏅';
}
