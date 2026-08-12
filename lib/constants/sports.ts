/**
 * Canonical sports / activity types used across events, tournaments, lobbies, and filters.
 * Values match `events.sport` / `tournaments.sport` strings in the DB (and scrapers).
 *
 * Note: activity titles like "Pilates FC" or "Power Yoga" are stored as FITNESS —
 * filter by FITNESS, not by the marketing title.
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
  'COMBAT',
  'SQUASH',
  'VOLLEYBALL',
  'SWIMMING',
  'SURFING',
  'TABLE_TENNIS',
  'OTHER',
] as const;

export const LOBBY_SPORTS = [
  'TENNIS',
  'PADEL',
  'SQUASH',
  'RUNNING',
  'FOOTBALL',
  'BASKETBALL',
  'VOLLEYBALL',
  'HOCKEY',
] as const;

export type EventSport = (typeof EVENT_SPORTS)[number];
export type LobbySport = (typeof LOBBY_SPORTS)[number];

/** Human labels for filter chips and pickers. */
export const EVENT_SPORT_LABELS: Record<EventSport, string> = {
  TENNIS: 'Tennis',
  PADEL: 'Padel',
  FOOTBALL: 'Football',
  BASKETBALL: 'Basketball',
  HOCKEY: 'Hockey',
  HANDBALL: 'Handball',
  RUNNING: 'Running',
  CYCLING: 'Cycling',
  GOLF: 'Golf',
  FITNESS: 'Fitness',
  COMBAT: 'Combat',
  SQUASH: 'Squash',
  VOLLEYBALL: 'Volleyball',
  SWIMMING: 'Swimming',
  SURFING: 'Surfing',
  TABLE_TENNIS: 'Table tennis',
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
  FOOTBALL: ['football', 'soccer', 'futbal', 'futsal'],
  BASKETBALL: ['basketball', 'basket', 'koš', 'kosik'],
  HOCKEY: ['hockey', 'hokej'],
  HANDBALL: ['handball', 'hádzan', 'hadzan'],
  RUNNING: ['running', 'behanie', 'beh', 'marathon', '5k', '10k', 'atlet'],
  CYCLING: ['cycling', 'bike', 'bicykel', 'cykl'],
  GOLF: ['golf'],
  FITNESS: [
    'fitness',
    'pilates',
    'yoga',
    'joga',
    'trx',
    'gymstick',
    'instagym',
    'barre',
    'cvičenie',
    'cvicenie',
    'workout',
    'open air',
    'piatkovica',
  ],
  COMBAT: ['mma', 'boxing', 'box', 'fight night', 'gladiátor', 'gladiator', 'combat', 'ufc'],
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
  OTHER: ['korčuľ', 'korcul', 'skating', 'decathlon', 'inline'],
};

export function isEventSport(value: string): value is EventSport {
  return (EVENT_SPORTS as readonly string[]).includes(value.toUpperCase());
}

export function sportDisplayLabel(sport: string): string {
  const key = sport.toUpperCase();
  if (isEventSport(key)) return EVENT_SPORT_LABELS[key];
  return key.charAt(0) + key.slice(1).toLowerCase();
}

/** How you play — drill-down groups for /events sport filter. */
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
    hint: 'Fitness, plávanie…',
    sports: ['FITNESS', 'COMBAT', 'SWIMMING', 'SURFING', 'OTHER'],
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
    'TENNIS',
    'HANDBALL',
    'BASKETBALL',
    'FOOTBALL',
    'HOCKEY',
    'COMBAT',
    'SWIMMING',
    'SQUASH',
    'VOLLEYBALL',
    'TABLE_TENNIS',
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
