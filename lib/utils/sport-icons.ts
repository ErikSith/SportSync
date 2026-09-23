/** Central sport → Material icon + accent color mapping. */

export const SPORT_ICONS: Record<string, string> = {
  TENNIS: 'sports_tennis',
  PADEL: 'sports_tennis',
  BADMINTON: 'sports_tennis',
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
  JUMPING: 'fitness_center',
  CROSSFIT: 'fitness_center',
  CURLING: 'sports',
  YOGA: 'self_improvement',
  PILATES: 'self_improvement',
  HOCKEY: 'sports_hockey',
  HANDBALL: 'sports_handball',
  FLOORBALL: 'sports_hockey',
  COMBAT: 'sports_mma',
  MMA: 'sports_mma',
  TABLE_TENNIS: 'sports_tennis',
  CLIMBING: 'hiking',
  BOWLING: 'sports',
  DARTS: 'target',
  SKATING: 'ice_skating',
  BILLIARDS: 'sports',
  OTHER: 'sports',
};

/** Per-sport accent — same sport always gets the same cute color. */
export const SPORT_COLORS: Record<string, string> = {
  TENNIS: '#a3e635',
  PADEL: '#4ade80',
  BADMINTON: '#86efac',
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
  JUMPING: '#f472b6',
  CROSSFIT: '#fb923c',
  CURLING: '#7dd3fc',
  YOGA: '#c4b5fd',
  PILATES: '#f9a8d4',
  HOCKEY: '#7dd3fc',
  HANDBALL: '#fdba74',
  FLOORBALL: '#4ade80',
  COMBAT: '#f87171',
  TABLE_TENNIS: '#facc15',
  CLIMBING: '#fdba74',
  BOWLING: '#fde68a',
  DARTS: '#fca5a5',
  SKATING: '#7dd3fc',
  BILLIARDS: '#86efac',
  OTHER: '#e9c349',
};

/** Dance / social dance listings (often stored as OTHER). */
const DANCE_TITLE =
  /latin|salsa|bachata|tango|zumba|tanec|tane[cč]n|dance|disco|kizomba|cha[\s-]?cha|merengue|cuba\b|reggaeton|hip[\s-]?hop\s*dance|ballroom|waltz|val[cč][ií]k/i;

export function sportIcon(sport: string, title?: string): string {
  const t = title ?? '';
  if (DANCE_TITLE.test(t)) return 'nightlife';
  if (/wakeboard|wakeskat|wakesurf|kitesurf|surf/i.test(t)) return 'surfing';
  if (/kor[cč]u[ľl]|inline\s*skate|skating/i.test(t)) return 'ice_skating';
  if (/3\s*x\s*3|3x3|basket/i.test(t)) return 'sports_basketball';
  return SPORT_ICONS[sport.toUpperCase()] ?? 'sports';
}

export function sportColor(sport: string, title?: string): string {
  const t = title ?? '';
  if (DANCE_TITLE.test(t)) return '#f0abfc';
  if (/wakeboard|wakeskat|wakesurf|kitesurf|surf/i.test(t)) {
    return SPORT_COLORS.SURFING ?? '#22d3ee';
  }
  if (/kor[cč]u[ľl]|inline\s*skate|skating/i.test(t)) return '#7dd3fc';
  return SPORT_COLORS[sport.toUpperCase()] ?? SPORT_COLORS.OTHER ?? '#e9c349';
}
