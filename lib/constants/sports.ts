/**
 * Canonical sports / activity types used across events, tournaments, lobbies, and filters.
 * Values match `events.sport` / `tournaments.sport` strings in the DB (and scrapers).
 *
 * Yoga classes store YOGA (not FITNESS). Martial arts store COMBAT.
 */
export const EVENT_SPORTS = [
  'TENNIS',
  'PADEL',
  'FOOTBALL',
  'BASKETBALL',
  'HOCKEY',
  'HANDBALL',
  'RUNNING',
  'CYCLING',
  'GOLF',
  'FITNESS',
  'YOGA',
  'COMBAT',
  'SQUASH',
  'VOLLEYBALL',
  'SWIMMING',
  'SURFING',
  'TABLE_TENNIS',
  'CLIMBING',
  'BOWLING',
  'OTHER',
] as const;

export const LOBBY_SPORTS = [
  'TENNIS',
  'PADEL',
  'FOOTBALL',
  'BASKETBALL',
  'HOCKEY',
  'HANDBALL',
  'RUNNING',
  'CYCLING',
  'GOLF',
  'FITNESS',
  'YOGA',
  'COMBAT',
  'SQUASH',
  'VOLLEYBALL',
  'SWIMMING',
  'SURFING',
  'TABLE_TENNIS',
  'CLIMBING',
  'BOWLING',
  'OTHER',
] as const;

export type EventSport = (typeof EVENT_SPORTS)[number];
export type LobbySport = (typeof LOBBY_SPORTS)[number];

/** Human labels for filter chips and pickers (SK, matching /events chrome). */
export const EVENT_SPORT_LABELS: Record<EventSport, string> = {
  TENNIS: 'Tenis',
  PADEL: 'Padel',
  FOOTBALL: 'Futbal',
  BASKETBALL: 'Basketbal',
  HOCKEY: 'Hokej',
  HANDBALL: 'Hádzaná',
  RUNNING: 'Beh',
  CYCLING: 'Cyklistika',
  GOLF: 'Golf',
  FITNESS: 'Fitness',
  YOGA: 'Joga',
  COMBAT: 'Bojové umenia',
  SQUASH: 'Squash',
  VOLLEYBALL: 'Volejbal',
  SWIMMING: 'Plávanie',
  SURFING: 'Surf',
  TABLE_TENNIS: 'Stolný tenis',
  CLIMBING: 'Lezenie',
  BOWLING: 'Bowling',
  OTHER: 'Iné',
};

/**
 * Keywords for heuristic sport detection (briefs, scrapers, AI fallback).
 * Order of keys in EVENT_SPORTS does not matter — prefer more specific matches first
 * when iterating (e.g. padel before tennis).
 */
export const EVENT_SPORT_KEYWORDS: Record<EventSport, string[]> = {
  TENNIS: ['tennis', 'tenis', 'davis cup'],
  PADEL: ['padel'],
  FOOTBALL: ['football', 'soccer', 'futbal', 'futsal'],
  BASKETBALL: ['basketball', 'basket', 'košík', 'kosik', '3x3', '3 x 3'],
  HOCKEY: ['hockey', 'hokej'],
  HANDBALL: ['handball', 'hádzan', 'hadzan'],
  RUNNING: ['running', 'behanie', 'beh', 'marathon', '5k', '10k', 'atlet'],
  CYCLING: ['cycling', 'bike', 'bicykel', 'cykl'],
  GOLF: ['golf'],
  FITNESS: [
    'fitness',
    'pilates',
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
    'jumping',
    'tabata',
    'deepwork',
    'bungee',
    'spinning',
    'piloxing',
    'kruhov',
    'power plate',
    'rpm',
  ],
  YOGA: ['yoga', 'joga'],
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
  OTHER: ['korčuľ', 'korcul', 'skating', 'decathlon', 'inline'],
};

export function isEventSport(value: string): value is EventSport {
  return (EVENT_SPORTS as readonly string[]).includes(value.toUpperCase());
}

export function isLobbySport(value: string): value is LobbySport {
  return (LOBBY_SPORTS as readonly string[]).includes(value.toUpperCase());
}

export function sportDisplayLabel(sport: string): string {
  const key = sport.toUpperCase();
  if (isEventSport(key)) return EVENT_SPORT_LABELS[key];
  return key.charAt(0) + key.slice(1).toLowerCase();
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
    sports: ['TENNIS', 'PADEL', 'SQUASH', 'TABLE_TENNIS'],
  },
  {
    id: 'sticks',
    label: 'Hokejkami',
    hint: 'Hokej, golf…',
    sports: ['HOCKEY', 'GOLF'],
  },
  {
    id: 'body',
    label: 'Telom',
    hint: 'Fitness, joga, plávanie…',
    sports: ['FITNESS', 'YOGA', 'COMBAT', 'SWIMMING', 'SURFING', 'CLIMBING', 'BOWLING', 'OTHER'],
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
    'SURFING',
    'TABLE_TENNIS',
    'YOGA',
    'CLIMBING',
    'BOWLING',
    'COMBAT',
    'TENNIS',
    'HANDBALL',
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
