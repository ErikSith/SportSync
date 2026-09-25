/**
 * Strict 6-way event categorization — mirrors homepage Rýchle akcie (one tile each).
 * Syncs with legacy boolean flags (isTournament / isGroupClass / isCamp / isWorkshop / isCourse).
 */

import { EventCategoryEnum, type EventCategory } from './types';

export type CategoryFlags = {
  isTournament: boolean;
  isGroupClass: boolean;
  isCamp: boolean;
  isWorkshop: boolean;
  isCourse: boolean;
};

/** Map primary category → mutually exclusive legacy flags. */
export function flagsFromCategory(category: EventCategory): CategoryFlags {
  switch (category) {
    case 'TURNAJ':
      return {
        isTournament: true,
        isGroupClass: false,
        isCamp: false,
        isWorkshop: false,
        isCourse: false,
      };
    case 'SKUPINOVE_CVICENIE':
      return {
        isTournament: false,
        isGroupClass: true,
        isCamp: false,
        isWorkshop: false,
        isCourse: false,
      };
    case 'WORKSHOP':
      return {
        isTournament: false,
        isGroupClass: false,
        isCamp: false,
        isWorkshop: true,
        isCourse: false,
      };
    case 'DETSKY_TABOR':
      return {
        isTournament: false,
        isGroupClass: false,
        isCamp: true,
        isWorkshop: false,
        isCourse: false,
      };
    case 'DETSKY_KRUZOK':
      return {
        isTournament: false,
        isGroupClass: false,
        isCamp: false,
        isWorkshop: false,
        isCourse: true,
      };
    case 'PODUJATIE':
    default:
      return {
        isTournament: false,
        isGroupClass: false,
        isCamp: false,
        isWorkshop: false,
        isCourse: false,
      };
  }
}

/**
 * Infer category from legacy flags / title heuristics.
 * Priority: camp → workshop → tournament → course/krúžok → group class → one-off.
 */
export function categoryFromFlags(
  flags: Partial<CategoryFlags> & {
    title?: string | null;
    isForKids?: boolean | null;
  },
): EventCategory {
  const title = (flags.title ?? '').trim();
  if (flags.isCamp || /t[aá]bor|camp|pr[aá]zdninov/i.test(title)) {
    return 'DETSKY_TABOR';
  }
  if (flags.isWorkshop || /workshop|masterclass|semin[aá]r/i.test(title)) {
    return 'WORKSHOP';
  }
  if (
    flags.isTournament ||
    /\b(turnaj|tournament|\bcup\b|championship|trophy|s[uú]ťaž|sutaz)/i.test(title)
  ) {
    return 'TURNAJ';
  }
  if (
    flags.isCourse ||
    /kr[uú][zž]ok|kurz|course/i.test(title) ||
    (flags.isForKids && /po\s+škole|po\s+skole|ml[aá]de[zž]/i.test(title))
  ) {
    return 'DETSKY_KRUZOK';
  }
  if (
    flags.isGroupClass ||
    /lekcia|rozvrh|fitcamp|pilates|joga|yoga|hiit|kruhov/i.test(title)
  ) {
    return 'SKUPINOVE_CVICENIE';
  }
  return 'PODUJATIE';
}

export function parseEventCategory(value: unknown): EventCategory | null {
  if (typeof value !== 'string') return null;
  const normalized = value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s-]+/g, '_');
  const aliases: Record<string, EventCategory> = {
    PODUJATIE: 'PODUJATIE',
    EVENT: 'PODUJATIE',
    AKCIA: 'PODUJATIE',
    SKUPINOVE_CVICENIE: 'SKUPINOVE_CVICENIE',
    GROUP_CLASS: 'SKUPINOVE_CVICENIE',
    LEKCIA: 'SKUPINOVE_CVICENIE',
    TURNAJ: 'TURNAJ',
    TOURNAMENT: 'TURNAJ',
    WORKSHOP: 'WORKSHOP',
    DETSKY_TABOR: 'DETSKY_TABOR',
    CAMP: 'DETSKY_TABOR',
    TABOR: 'DETSKY_TABOR',
    DETSKY_KRUZOK: 'DETSKY_KRUZOK',
    KRUZOK: 'DETSKY_KRUZOK',
    COURSE: 'DETSKY_KRUZOK',
    KURZ: 'DETSKY_KRUZOK',
  };
  const mapped = aliases[normalized];
  if (mapped) return mapped;
  const parsed = EventCategoryEnum.safeParse(value.trim().toUpperCase());
  return parsed.success ? parsed.data : null;
}

/**
 * Ensure category + flags are consistent. Category wins when present;
 * otherwise flags/title infer category, then flags are rewritten.
 */
export function syncCategoryAndFlags<
  T extends CategoryFlags & {
    category?: EventCategory | null;
    title?: string;
    isForKids?: boolean;
  },
>(event: T): T & { category: EventCategory } {
  const category =
    event.category && EventCategoryEnum.safeParse(event.category).success
      ? event.category
      : categoryFromFlags(event);
  const flags = flagsFromCategory(category);
  const isForKids =
    Boolean(event.isForKids) ||
    category === 'DETSKY_TABOR' ||
    category === 'DETSKY_KRUZOK';
  return {
    ...event,
    category,
    ...flags,
    isForKids,
  };
}
