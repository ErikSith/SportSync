/**
 * Canonical sports / activity types used across events, tournaments, lobbies, and filters.
 * Values match `events.sport` / `tournaments.sport` strings in the DB (and scrapers).
 *
 * Yoga classes store YOGA (not FITNESS). Pilates stores PILATES. Martial arts store COMBAT.
 * Jumping (mini-trampoline) stores JUMPING (not FITNESS).
 * Trampoline parks store TRAMPOLINE (not JUMPING).
 * CrossFit stores CROSSFIT (not FITNESS).
 * Curling stores CURLING.
 */
export const EVENT_SPORTS = [
  'TENNIS',
  'PADEL',
  'BADMINTON',
  'FOOTBALL',
  'BASKETBALL',
  'HOCKEY',
  'HANDBALL',
  'FLOORBALL',
  'RUNNING',
  'CYCLING',
  'GOLF',
  'FITNESS',
  'JUMPING',
  'TRAMPOLINE',
  'CROSSFIT',
  'CURLING',
  'YOGA',
  'PILATES',
  'COMBAT',
  'PARKOUR',
  'GYMNASTICS',
  'SQUASH',
  'VOLLEYBALL',
  'SWIMMING',
  'SURFING',
  'TABLE_TENNIS',
  'CLIMBING',
  'BOWLING',
  'DARTS',
  'SKATING',
  'SKATEBOARD',
  'SCOOTER',
  'BILLIARDS',
  'OTHER',
] as const;

export const LOBBY_SPORTS = [
  'TENNIS',
  'PADEL',
  'BADMINTON',
  'FOOTBALL',
  'BASKETBALL',
  'HOCKEY',
  'HANDBALL',
  'FLOORBALL',
  'RUNNING',
  'CYCLING',
  'GOLF',
  'FITNESS',
  'JUMPING',
  'TRAMPOLINE',
  'CROSSFIT',
  'CURLING',
  'YOGA',
  'PILATES',
  'COMBAT',
  'PARKOUR',
  'GYMNASTICS',
  'SQUASH',
  'VOLLEYBALL',
  'SWIMMING',
  'SURFING',
  'TABLE_TENNIS',
  'CLIMBING',
  'BOWLING',
  'DARTS',
  'SKATING',
  'SKATEBOARD',
  'SCOOTER',
  'BILLIARDS',
  'OTHER',
] as const;

export type EventSport = (typeof EVENT_SPORTS)[number];
export type LobbySport = (typeof LOBBY_SPORTS)[number];

/** Human labels for filter chips and pickers (SK, matching /events chrome). */
export const EVENT_SPORT_LABELS: Record<EventSport, string> = {
  TENNIS: 'Tenis',
  PADEL: 'Padel',
  BADMINTON: 'Badminton',
  FOOTBALL: 'Futbal',
  BASKETBALL: 'Basketbal',
  HOCKEY: 'Hokej',
  HANDBALL: 'Hádzaná',
  FLOORBALL: 'Florbal',
  RUNNING: 'Beh',
  CYCLING: 'Cyklistika',
  GOLF: 'Golf',
  FITNESS: 'Fitness',
  JUMPING: 'Jumping',
  TRAMPOLINE: 'Trampolíny',
  CROSSFIT: 'CrossFit',
  CURLING: 'Curling',
  YOGA: 'Joga',
  PILATES: 'Pilates',
  COMBAT: 'Bojové umenia',
  PARKOUR: 'Parkour',
  GYMNASTICS: 'Gymnastika',
  SQUASH: 'Squash',
  VOLLEYBALL: 'Volejbal',
  SWIMMING: 'Plávanie',
  SURFING: 'Surf',
  TABLE_TENNIS: 'Stolný tenis',
  CLIMBING: 'Lezenie',
  BOWLING: 'Bowling',
  DARTS: 'Šipky',
  SKATING: 'Korčuľovanie',
  SKATEBOARD: 'Skateboard',
  SCOOTER: 'Kolobežky',
  BILLIARDS: 'Biliard',
  OTHER: 'Iné',
};

/** English labels for pickers when UI locale is `en`. */
export const EVENT_SPORT_LABELS_EN: Record<EventSport, string> = {
  TENNIS: 'Tennis',
  PADEL: 'Padel',
  BADMINTON: 'Badminton',
  FOOTBALL: 'Football',
  BASKETBALL: 'Basketball',
  HOCKEY: 'Hockey',
  HANDBALL: 'Handball',
  FLOORBALL: 'Floorball',
  RUNNING: 'Running',
  CYCLING: 'Cycling',
  GOLF: 'Golf',
  FITNESS: 'Fitness',
  JUMPING: 'Jumping',
  TRAMPOLINE: 'Trampoline',
  CROSSFIT: 'CrossFit',
  CURLING: 'Curling',
  YOGA: 'Yoga',
  PILATES: 'Pilates',
  COMBAT: 'Combat sports',
  PARKOUR: 'Parkour',
  GYMNASTICS: 'Gymnastics',
  SQUASH: 'Squash',
  VOLLEYBALL: 'Volleyball',
  SWIMMING: 'Swimming',
  SURFING: 'Surfing',
  TABLE_TENNIS: 'Table tennis',
  CLIMBING: 'Climbing',
  BOWLING: 'Bowling',
  DARTS: 'Darts',
  SKATING: 'Skating',
  SKATEBOARD: 'Skateboard',
  SCOOTER: 'Scooter',
  BILLIARDS: 'Billiards',
  OTHER: 'Other',
};

/**
 * Keywords for heuristic sport detection (briefs, scrapers, AI fallback).
 * Order of keys in EVENT_SPORTS does not matter — prefer more specific matches first
 * when iterating (e.g. padel before tennis).
 */
export const EVENT_SPORT_KEYWORDS: Record<EventSport, string[]> = {
  TENNIS: ['tennis', 'tenis', 'davis cup'],
  PADEL: ['padel'],
  BADMINTON: ['badminton', 'bedminton'],
  FOOTBALL: ['football', 'soccer', 'futbal', 'futsal'],
  BASKETBALL: ['basketball', 'basket', 'košík', 'kosik', '3x3', '3 x 3'],
  HOCKEY: ['hockey', 'hokej'],
  HANDBALL: ['handball', 'hádzan', 'hadzan'],
  FLOORBALL: [
    'floorball',
    'florbal',
    'florbale',
    'unihockey',
    'uni-hockey',
    'innebandy',
  ],
  RUNNING: ['running', 'behanie', 'beh', 'marathon', '5k', '10k', 'atlet'],
  CYCLING: ['cycling', 'bike', 'bicykel', 'cykl'],
  GOLF: ['golf'],
  FITNESS: [
    'fitness',
    'trx',
    'gymstick',
    'instagym',
    'barre',
    'cvičenie',
    'cvicenie',
    'workout',
    'open air',
    'piatkovica',
    'hiit',
    'tabata',
    'deepwork',
    'bungee',
    'spinning',
    'piloxing',
    'kruhov',
    'power plate',
    'rpm',
    'funkčný',
    'funkcny',
    'functional',
    're-move',
    'remove',
    'kettlebell',
    'silový',
    'silovy',
    'kb5',
  ],
  JUMPING: [
    'jumping',
    'jumpin',
    'mini trampolín',
    'mini trampolin',
    'minitrampolín',
    'minitrampolin',
  ],
  TRAMPOLINE: [
    'trampolíny',
    'trampoliny',
    'trampolínov',
    'trampolinov',
    'trampoline',
    'trampolínový park',
    'trampolinovy park',
  ],
  CROSSFIT: ['crossfit', 'cross fit', 'cross-fit'],
  CURLING: ['curling', 'curlingu', 'curler'],
  YOGA: ['yoga', 'joga'],
  PILATES: ['pilates'],
  COMBAT: [
    'mma',
    'muay thai',
    'muay',
    'thai box',
    'thaibox',
    'kickbox',
    'boxing',
    'box',
    'bjj',
    'jiu-jitsu',
    'jiujitsu',
    'jiu jitsu',
    'judo',
    'karate',
    'aikido',
    'grappling',
    'nogi',
    'no-gi',
    'no gi',
    'open mat',
    'k1',
    'k-1',
    'fight night',
    'gladiátor',
    'gladiator',
    'combat',
    'ufc',
    'sebaobran',
    'self-defense',
    'self defense',
    'selfdefence',
  ],
  PARKOUR: ['parkour', 'freerun', 'free run', 'free-run'],
  GYMNASTICS: [
    'gymnastika',
    'gymnastik',
    'gymnastics',
    'gymnast',
    'akrobaci',
    'akrobácia',
    'akrobacia',
  ],
  SQUASH: ['squash'],
  VOLLEYBALL: ['volleyball', 'volejbal'],
  SWIMMING: ['swimming', 'plávanie', 'plavanie', 'pool'],
  SURFING: [
    'surfing',
    'surf',
    'wakeboard',
    'wakeskat',
    'wakesurf',
    'kitesurf',
    'kiteboard',
    'wakelake',
  ],
  TABLE_TENNIS: ['table tennis', 'stolný tenis', 'stolny tenis', 'ping pong'],
  CLIMBING: ['climbing', 'lezen', 'lezeck', 'boulder', 'bouldering'],
  BOWLING: ['bowling'],
  DARTS: [
    'šipky',
    'sipky',
    'šípk',
    'sipk',
    'šípková',
    'sipkova',
    'šípkar',
    'sipkar',
    'darts',
    'dart',
  ],
  SKATING: [
    'korčuľ',
    'korcul',
    'korčul',
    'korculovanie',
    'korčuľovanie',
    'skating',
    'ice skate',
    'iceskate',
    'inline',
    'in-line',
    'brusl',
  ],
  SKATEBOARD: [
    'skateboard',
    'skateboarding',
    'skate park',
    'skatepark',
    'longboard',
  ],
  SCOOTER: [
    'kolobežk',
    'kolobezk',
    'scooter',
    'kick scooter',
    'freestyle scooter',
  ],
  BILLIARDS: [
    'billiard',
    'billiards',
    'biliard',
    'biliárd',
    'pool billiard',
    'snooker',
    'karambol',
  ],
  OTHER: ['decathlon'],
};

export function isEventSport(value: string): value is EventSport {
  return (EVENT_SPORTS as readonly string[]).includes(value.toUpperCase());
}

export function isLobbySport(value: string): value is LobbySport {
  return (LOBBY_SPORTS as readonly string[]).includes(value.toUpperCase());
}

export type SportLabelLocale = 'sk' | 'en';

export function sportDisplayLabel(
  sport: string,
  locale: SportLabelLocale = 'sk',
): string {
  const key = sport.toUpperCase();
  if (isEventSport(key)) {
    return locale === 'en' ? EVENT_SPORT_LABELS_EN[key] : EVENT_SPORT_LABELS[key];
  }
  return key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ');
}

function normalizeSportSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** Match typed query against SK/EN labels, keywords, and canonical code. */
export function sportMatchesTypedQuery(sport: EventSport, query: string): boolean {
  const q = normalizeSportSearch(query);
  if (!q) return true;
  const haystacks = [
    sport,
    EVENT_SPORT_LABELS[sport],
    EVENT_SPORT_LABELS_EN[sport],
    ...(EVENT_SPORT_KEYWORDS[sport] ?? []),
  ];
  return haystacks.some((h) => normalizeSportSearch(h).includes(q));
}

/** Rank for typeahead: prefix match on locale label first, then any match. */
export function rankSportForTypedQuery(
  sport: EventSport,
  query: string,
  locale: SportLabelLocale,
): number {
  const q = normalizeSportSearch(query);
  if (!q) return 0;
  const label = normalizeSportSearch(sportDisplayLabel(sport, locale));
  const sk = normalizeSportSearch(EVENT_SPORT_LABELS[sport]);
  const en = normalizeSportSearch(EVENT_SPORT_LABELS_EN[sport]);
  if (label.startsWith(q) || sk.startsWith(q) || en.startsWith(q)) return 0;
  if (label.includes(q) || sk.includes(q) || en.includes(q)) return 1;
  if (normalizeSportSearch(sport).includes(q)) return 2;
  return 3;
}

/** Picker order: A–Z by label for locale, `OTHER` always last. */
export function eventSportsSortedByLabel(locale: SportLabelLocale = 'sk'): EventSport[] {
  const collatorLocale = locale === 'en' ? 'en' : 'sk';
  return [...EVENT_SPORTS].sort((a, b) => {
    if (a === 'OTHER') return 1;
    if (b === 'OTHER') return -1;
    return sportDisplayLabel(a, locale).localeCompare(
      sportDisplayLabel(b, locale),
      collatorLocale,
      { sensitivity: 'base' },
    );
  });
}

/** Typeahead suggestions: filter + rank by typed query. Empty query → sorted catalog. */
export function suggestSportsForQuery(
  query: string,
  locale: SportLabelLocale = 'sk',
  limit = 8,
): EventSport[] {
  const trimmed = query.trim();
  if (!trimmed) return eventSportsSortedByLabel(locale).slice(0, limit);
  return EVENT_SPORTS.filter((sport) => sportMatchesTypedQuery(sport, trimmed))
    .sort((a, b) => {
      const rankDiff =
        rankSportForTypedQuery(a, trimmed, locale) -
        rankSportForTypedQuery(b, trimmed, locale);
      if (rankDiff !== 0) return rankDiff;
      return sportDisplayLabel(a, locale).localeCompare(
        sportDisplayLabel(b, locale),
        locale === 'en' ? 'en' : 'sk',
        { sensitivity: 'base' },
      );
    })
    .slice(0, limit);
}

/** How you play — drill-down groups kept for non-filter callers. */
export type SportPlayGroupId = 'feet' | 'hands' | 'rackets' | 'sticks' | 'body';

export interface SportPlayGroup {
  id: SportPlayGroupId;
  label: string;
  /** Short hint under the label in pickers. */
  hint: string;
  sports: readonly EventSport[];
}

export const SPORT_PLAY_GROUPS: readonly SportPlayGroup[] = [
  {
    id: 'feet',
    label: 'Nohami',
    hint: 'Futbal, beh…',
    sports: ['FOOTBALL', 'RUNNING', 'CYCLING'],
  },
  {
    id: 'hands',
    label: 'Rukami',
    hint: 'Basket, volejbal…',
    sports: ['BASKETBALL', 'HANDBALL', 'VOLLEYBALL'],
  },
  {
    id: 'rackets',
    label: 'Raketami',
    hint: 'Tenis, padel…',
    sports: ['TENNIS', 'PADEL', 'BADMINTON', 'SQUASH', 'TABLE_TENNIS'],
  },
  {
    id: 'sticks',
    label: 'Hokejkami',
    hint: 'Hokej, curling, golf…',
    sports: ['HOCKEY', 'FLOORBALL', 'GOLF', 'CURLING'],
  },
  {
    id: 'body',
    label: 'Telom',
    hint: 'Fitness, crossfit, jumping…',
    sports: [
      'FITNESS',
      'JUMPING',
      'TRAMPOLINE',
      'CROSSFIT',
      'YOGA',
      'PILATES',
      'COMBAT',
      'PARKOUR',
      'GYMNASTICS',
      'SWIMMING',
      'SURFING',
      'CLIMBING',
      'BOWLING',
      'DARTS',
      'SKATING',
      'SKATEBOARD',
      'SCOOTER',
      'BILLIARDS',
      'OTHER',
    ],
  },
] as const;

export function sportPlayGroupForSport(sport: string): SportPlayGroup | null {
  const upper = sport.toUpperCase();
  return SPORT_PLAY_GROUPS.find((g) => g.sports.includes(upper as EventSport)) ?? null;
}

/** Detect sport from free text; falls back to `fallback` when nothing matches. */
export function detectEventSport(
  text: string,
  fallback: EventSport = 'OTHER',
): EventSport {
  const lower = text.toLowerCase();
  // Prefer longer / more specific families before generic ones
  const priority: EventSport[] = [
    'PADEL',
    'BADMINTON',
    'SURFING',
    'TABLE_TENNIS',
    'JUMPING',
    'TRAMPOLINE',
    'CROSSFIT',
    'CURLING',
    'PILATES',
    'YOGA',
    'PARKOUR',
    'GYMNASTICS',
    'CLIMBING',
    'BOWLING',
    'DARTS',
    'SKATEBOARD',
    'SCOOTER',
    'SKATING',
    'BILLIARDS',
    'COMBAT',
    'TENNIS',
    'HANDBALL',
    'FLOORBALL',
    'BASKETBALL',
    'FOOTBALL',
    'HOCKEY',
    'SWIMMING',
    'SQUASH',
    'VOLLEYBALL',
    'CYCLING',
    'GOLF',
    'RUNNING',
    'FITNESS',
    'OTHER',
  ];
  for (const sport of priority) {
    if (EVENT_SPORT_KEYWORDS[sport].some((keyword) => lower.includes(keyword))) {
      return sport;
    }
  }
  return fallback;
}
