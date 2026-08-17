/** Central sport → Material icon + accent color mapping. */

export const SPORT_ICONS: Record<string, string> = {
  TENNIS: 'sports_tennis',
  PADEL: 'sports_tennis',
  RUNNING: 'directions_run',
  CYCLING: 'directions_bike',
  GOLF: 'sports_golf',
  FOOTBALL: 'sports_soccer',
  BASKETBALL: 'sports_basketball',
  SQUASH: 'sports_tennis',
  VOLLEYBALL: 'sports_volleyball',
  SWIMMING: 'pool',
  SURFING: 'surfing',
  FITNESS: 'fitness_center',
  YOGA: 'self_improvement',
  HOCKEY: 'sports_hockey',
  HANDBALL: 'sports_handball',
  COMBAT: 'sports_mma',
  MMA: 'sports_mma',
  TABLE_TENNIS: 'sports_tennis',
  CLIMBING: 'hiking',
  BOWLING: 'sports',
  OTHER: 'sports',
};

/** Per-sport accent — same sport always gets the same cute color. */
export const SPORT_COLORS: Record<string, string> = {
  TENNIS: '#a3e635',
  PADEL: '#4ade80',
  RUNNING: '#fbbf24',
  CYCLING: '#2dd4bf',
  GOLF: '#86efac',
  FOOTBALL: '#38bdf8',
  BASKETBALL: '#fb923c',
  SQUASH: '#fda4af',
  VOLLEYBALL: '#fde047',
  SWIMMING: '#67e8f9',
  SURFING: '#22d3ee',
  FITNESS: '#fb7185',
  YOGA: '#c4b5fd',
  HOCKEY: '#7dd3fc',
  HANDBALL: '#fdba74',
  COMBAT: '#f87171',
  TABLE_TENNIS: '#facc15',
  CLIMBING: '#fdba74',
  BOWLING: '#fde68a',
  OTHER: '#e9c349',
};

export function sportIcon(sport: string, title?: string): string {
  const t = title ?? '';
  if (/wakeboard|wakeskat|wakesurf|kitesurf|surf/i.test(t)) return 'surfing';
  if (/kor[cč]u[ľl]|inline\s*skate|skating/i.test(t)) return 'ice_skating';
  if (/3\s*x\s*3|3x3|basket/i.test(t)) return 'sports_basketball';
  return SPORT_ICONS[sport.toUpperCase()] ?? 'sports';
}

export function sportColor(sport: string, title?: string): string {
  const t = title ?? '';
  if (/wakeboard|wakeskat|wakesurf|kitesurf|surf/i.test(t)) {
    return SPORT_COLORS.SURFING ?? '#22d3ee';
  }
  if (/kor[cč]u[ľl]|inline\s*skate|skating/i.test(t)) return '#7dd3fc';
  return SPORT_COLORS[sport.toUpperCase()] ?? SPORT_COLORS.OTHER ?? '#e9c349';
}
