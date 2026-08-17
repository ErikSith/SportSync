import type { LobbySportKey, MatchCardData, SkillLevel, SportIconKind } from '@/types/lobby';
import { SKILL_LEVEL_LABELS } from '@/types/lobby';
import { detectEventSport, isLobbySport, sportDisplayLabel } from '@/lib/constants/sports';
import { SPORT_ICONS } from '@/lib/utils/sport-icons';

export function skillLabel(level: SkillLevel): string {
  return SKILL_LEVEL_LABELS[level];
}

/** Short EN labels for hub player cards (design mock). */
export function skillLabelShort(level: SkillLevel): string {
  switch (level) {
    case 'NOVICE':
      return 'Novice';
    case 'INTERMEDIATE':
      return 'Intermediate';
    case 'ADVANCED':
      return 'Advanced';
    case 'MEDIUM':
      return 'Medium';
  }
}

export function normalizeLobbySport(sport: string): LobbySportKey | null {
  const compact = sport.trim().toUpperCase().replace(/\s+/g, '_');
  if (isLobbySport(compact) && compact !== 'OTHER') {
    return compact.toLowerCase() as LobbySportKey;
  }
  const detected = detectEventSport(sport);
  if (detected !== 'OTHER' && isLobbySport(detected)) {
    return detected.toLowerCase() as LobbySportKey;
  }
  return null;
}

export function matchesLobbySport(match: MatchCardData, key: LobbySportKey): boolean {
  return normalizeLobbySport(match.sport) === key;
}

export function filterMatchesBySport(
  items: MatchCardData[],
  key: LobbySportKey | null,
): MatchCardData[] {
  if (!key) return items;
  return items.filter((m) => matchesLobbySport(m, key));
}

export function skillBadgeClass(level: SkillLevel): string {
  switch (level) {
    case 'NOVICE':
      return 'text-emerald-300';
    case 'MEDIUM':
    case 'INTERMEDIATE':
      return 'text-zinc-200';
    case 'ADVANCED':
      return 'text-rose-400';
  }
}

export const ICON_ACCENT_HEX = {
  orange: '#FF5500',
  lime: '#C8F542',
  purple: '#8B5CF6',
} as const;

export type IconAccent = keyof typeof ICON_ACCENT_HEX;

/** Lightweight AI prompt → form fill (mock NLP). */
export function parseAiLobbyPrompt(prompt: string): {
  sport?: string;
  venue?: string;
  time?: string;
  skillLevel?: SkillLevel;
  spotsNeeded?: number;
} {
  const lower = prompt.toLowerCase();
  const result: ReturnType<typeof parseAiLobbyPrompt> = {};

  const detected = detectEventSport(lower);
  if (detected !== 'OTHER') result.sport = sportDisplayLabel(detected);

  if (lower.includes('park 21') || lower.includes('parku 21')) result.venue = 'Park 21';
  else if (lower.includes('fitcamp')) result.venue = 'FitCamp';
  else if (lower.includes('tehelné') || lower.includes('tehelne')) result.venue = 'Tehelné pole';

  const timeMatch = lower.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (timeMatch?.[1] && timeMatch[2]) {
    result.time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }

  if (lower.includes('pokročil')) result.skillLevel = 'ADVANCED';
  else if (lower.includes('nováčik')) result.skillLevel = 'NOVICE';
  else if (lower.includes('mierne') || lower.includes('stredn')) result.skillLevel = 'INTERMEDIATE';

  const spotsMatch = lower.match(/(\d+)\.?\s*(do|hráč|hrac)/);
  if (spotsMatch?.[1]) result.spotsNeeded = Math.max(1, Number(spotsMatch[1]));

  return result;
}

export function sportIconLabel(kind: SportIconKind): string {
  switch (kind) {
    case 'football':
      return 'Futbal';
    case 'tennis':
      return 'Tenis';
    case 'padel':
      return 'Padel';
    case 'basketball':
      return 'Basketbal';
    case 'squash':
      return 'Squash';
    case 'running':
      return 'Running';
    case 'volleyball':
      return 'Volejbal';
    case 'hockey':
      return 'Hokej';
  }
}

/** Map free-text sport → linear Lobby glyph (fallback: tennis racket). */
export function sportToIconKind(sport: string, title?: string): SportIconKind {
  const key = normalizeLobbySport(`${sport} ${title ?? ''}`);
  switch (key) {
    case 'football':
    case 'combat':
      return 'football';
    case 'tennis':
    case 'table_tennis':
      return 'tennis';
    case 'padel':
      return 'padel';
    case 'basketball':
    case 'handball':
      return 'basketball';
    case 'squash':
      return 'squash';
    case 'running':
    case 'cycling':
    case 'fitness':
    case 'yoga':
    case 'swimming':
    case 'surfing':
    case 'climbing':
      return 'running';
    case 'volleyball':
      return 'volleyball';
    case 'hockey':
    case 'golf':
    case 'bowling':
      return 'hockey';
    default:
      return 'tennis';
  }
}

/** Accent for watermark / corner marks — keeps Lobby feed color language. */
export function sportIconAccent(kind: SportIconKind): IconAccent {
  switch (kind) {
    case 'tennis':
    case 'padel':
    case 'volleyball':
      return 'lime';
    case 'hockey':
    case 'running':
      return 'purple';
    default:
      return 'orange';
  }
}

export const LOBBY_SPORT_META: Record<
  LobbySportKey,
  { label: string; materialIcon: string; countSuffix: string }
> = {
  padel: { label: sportDisplayLabel('PADEL'), materialIcon: SPORT_ICONS.PADEL ?? 'sports_tennis', countSuffix: 'zápasov' },
  football: { label: sportDisplayLabel('FOOTBALL'), materialIcon: SPORT_ICONS.FOOTBALL ?? 'sports_soccer', countSuffix: 'tímov' },
  tennis: { label: sportDisplayLabel('TENNIS'), materialIcon: SPORT_ICONS.TENNIS ?? 'sports_tennis', countSuffix: 'hľadá hráčov' },
  basketball: { label: sportDisplayLabel('BASKETBALL'), materialIcon: SPORT_ICONS.BASKETBALL ?? 'sports_basketball', countSuffix: 'zápasov' },
  squash: { label: sportDisplayLabel('SQUASH'), materialIcon: SPORT_ICONS.SQUASH ?? 'sports_tennis', countSuffix: 'kurtov' },
  running: { label: sportDisplayLabel('RUNNING'), materialIcon: SPORT_ICONS.RUNNING ?? 'directions_run', countSuffix: 'skupín' },
  volleyball: { label: sportDisplayLabel('VOLLEYBALL'), materialIcon: SPORT_ICONS.VOLLEYBALL ?? 'sports_volleyball', countSuffix: 'zápasov' },
  hockey: { label: sportDisplayLabel('HOCKEY'), materialIcon: SPORT_ICONS.HOCKEY ?? 'sports_hockey', countSuffix: 'miest' },
  handball: { label: sportDisplayLabel('HANDBALL'), materialIcon: SPORT_ICONS.HANDBALL ?? 'sports_handball', countSuffix: 'zápasov' },
  cycling: { label: sportDisplayLabel('CYCLING'), materialIcon: SPORT_ICONS.CYCLING ?? 'directions_bike', countSuffix: 'skupín' },
  golf: { label: sportDisplayLabel('GOLF'), materialIcon: SPORT_ICONS.GOLF ?? 'sports_golf', countSuffix: 'termínov' },
  fitness: { label: sportDisplayLabel('FITNESS'), materialIcon: SPORT_ICONS.FITNESS ?? 'fitness_center', countSuffix: 'tréningov' },
  yoga: { label: sportDisplayLabel('YOGA'), materialIcon: SPORT_ICONS.YOGA ?? 'self_improvement', countSuffix: 'lekcií' },
  combat: { label: sportDisplayLabel('COMBAT'), materialIcon: SPORT_ICONS.COMBAT ?? 'sports_mma', countSuffix: 'tréningov' },
  swimming: { label: sportDisplayLabel('SWIMMING'), materialIcon: SPORT_ICONS.SWIMMING ?? 'pool', countSuffix: 'tréningov' },
  surfing: { label: sportDisplayLabel('SURFING'), materialIcon: SPORT_ICONS.SURFING ?? 'surfing', countSuffix: 'termínov' },
  table_tennis: { label: sportDisplayLabel('TABLE_TENNIS'), materialIcon: SPORT_ICONS.TABLE_TENNIS ?? 'sports_tennis', countSuffix: 'zápasov' },
  climbing: { label: sportDisplayLabel('CLIMBING'), materialIcon: SPORT_ICONS.CLIMBING ?? 'hiking', countSuffix: 'tréningov' },
  bowling: { label: sportDisplayLabel('BOWLING'), materialIcon: SPORT_ICONS.BOWLING ?? 'sports', countSuffix: 'dráhy' },
};

export const LOBBY_SPORT_ORDER: LobbySportKey[] = [
  'padel',
  'football',
  'tennis',
  'basketball',
  'squash',
  'running',
  'volleyball',
  'hockey',
  'yoga',
  'combat',
  'fitness',
  'swimming',
  'handball',
  'cycling',
  'golf',
  'table_tennis',
  'climbing',
  'bowling',
  'surfing',
];
