import type { LobbySportKey, MatchCardData, SkillLevel, SportIconKind } from '@/types/lobby';
import { SKILL_LEVEL_LABELS } from '@/types/lobby';

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
  const s = sport.toLowerCase();
  if (s.includes('padel')) return 'padel';
  if (s.includes('squash')) return 'squash';
  if (s.includes('volejbal') || s.includes('volleyball')) return 'volleyball';
  if (s.includes('hokej') || s.includes('hockey')) return 'hockey';
  if (s.includes('running') || s.includes('behanie') || /\bbeh\b/.test(s) || s.includes('jogging'))
    return 'running';
  if (s.includes('futbal') || s.includes('football') || s.includes('soccer') || s.includes('futsal'))
    return 'football';
  if ((s.includes('tenis') || s.includes('tennis')) && !s.includes('table')) return 'tennis';
  if (s.includes('basket')) return 'basketball';
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

  if (lower.includes('padel')) result.sport = 'Padel';
  else if (lower.includes('squash')) result.sport = 'Squash';
  else if (lower.includes('volejbal') || lower.includes('volleyball')) result.sport = 'Volleyball';
  else if (lower.includes('hokej') || lower.includes('hockey')) result.sport = 'Hockey';
  else if (lower.includes('beh') || lower.includes('running')) result.sport = 'Running';
  else if (lower.includes('tenis')) result.sport = 'Tenis';
  else if (lower.includes('futbal')) result.sport = 'Futbal';
  else if (lower.includes('basket')) result.sport = 'Basketbal';

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
  }
}

export const LOBBY_SPORT_META: Record<
  LobbySportKey,
  { label: string; materialIcon: string; countSuffix: string }
> = {
  padel: { label: 'Padel', materialIcon: 'sports_tennis', countSuffix: 'Active Games' },
  football: { label: 'Football', materialIcon: 'sports_soccer', countSuffix: 'Active Teams' },
  tennis: { label: 'Tennis', materialIcon: 'sports_tennis', countSuffix: 'Players Searching' },
  basketball: { label: 'Basketball', materialIcon: 'sports_basketball', countSuffix: 'Active Games' },
  squash: { label: 'Squash', materialIcon: 'sports_tennis', countSuffix: 'Open Courts' },
  running: { label: 'Running', materialIcon: 'directions_run', countSuffix: 'Groups Nearby' },
  volleyball: { label: 'Volleyball', materialIcon: 'sports_volleyball', countSuffix: 'Active Games' },
  hockey: { label: 'Hockey', materialIcon: 'sports_hockey', countSuffix: 'Open Spots' },
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
];
