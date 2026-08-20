import { EVENT_SPORTS, type EventSport } from '@/lib/constants/sports';

export type SportSkillLevel = 1 | 2 | 3 | 4;
export type SportSkillsMap = Partial<Record<EventSport, SportSkillLevel>>;

const SKILL_LABELS_SK: Record<SportSkillLevel, string> = {
  1: 'Začiatočník',
  2: 'Stredne pokročilý',
  3: 'Pokročilý',
  4: 'Expert',
};

export function parseSportSkills(raw: unknown): SportSkillsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: SportSkillsMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const sport = key.toUpperCase();
    if (!(EVENT_SPORTS as readonly string[]).includes(sport)) continue;
    const n = typeof value === 'number' ? value : Number(value);
    if (n === 1 || n === 2 || n === 3 || n === 4) {
      out[sport as EventSport] = n;
    }
  }
  return out;
}

/** Keep only skills for sports still in preferredSports; default new sports to 2. */
export function normalizeSportSkills(
  preferredSports: string[],
  skills: SportSkillsMap,
): SportSkillsMap {
  const out: SportSkillsMap = {};
  for (const sport of preferredSports) {
    const key = sport.toUpperCase();
    if (!(EVENT_SPORTS as readonly string[]).includes(key)) continue;
    out[key as EventSport] = skills[key as EventSport] ?? 2;
  }
  return out;
}

export function sportSkillLabel(level: SportSkillLevel): string {
  return SKILL_LABELS_SK[level];
}

export function sportIconName(sport: string): string {
  const s = sport.toUpperCase();
  if (s === 'FOOTBALL' || s === 'FUTSAL') return 'sports_soccer';
  if (s === 'TENNIS' || s === 'PADEL' || s === 'SQUASH' || s === 'BADMINTON') return 'sports_tennis';
  if (s === 'BASKETBALL') return 'sports_basketball';
  if (s === 'VOLLEYBALL') return 'sports_volleyball';
  if (s === 'RUNNING' || s === 'ATLETIKA') return 'directions_run';
  if (s === 'CYCLING') return 'directions_bike';
  if (s === 'GOLF') return 'sports_golf';
  if (s === 'SWIMMING') return 'pool';
  if (s === 'HOCKEY') return 'sports_hockey';
  return 'sports';
}
