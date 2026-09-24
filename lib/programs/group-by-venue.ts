import type { EventCardData } from '@/lib/data/events';
import { displayVenueName } from '@/lib/venues/listing-url';
import type { ProgramsFeedTab } from '@/lib/programs/classify';

export type GroupedVenuePrograms = {
  key: string;
  venueId: string | null;
  venueName: string;
  city: string | null;
  distanceKm: number;
  events: EventCardData[];
};

function foldKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function venueGroupKey(event: EventCardData): string {
  if (event.venueId?.trim()) return `id:${event.venueId.trim()}`;
  const name = displayVenueName(event.venueName, '').trim();
  if (name) return `name:${foldKey(name)}`;
  const city = event.city?.trim();
  if (city) return `city:${foldKey(city)}`;
  return 'orphan';
}

function venueGroupLabel(event: EventCardData): string {
  return displayVenueName(event.venueName, event.city?.trim() || 'Športovisko');
}

/**
 * Group program listings by venue (same pattern as skupinové cvičenia).
 * Preserves earliest-start order within each group; groups sorted by
 * nearest distance then name.
 */
export function groupProgramsByVenue(
  events: EventCardData[],
): GroupedVenuePrograms[] {
  const map = new Map<string, GroupedVenuePrograms>();

  for (const event of events) {
    const key = venueGroupKey(event);
    const existing = map.get(key);
    if (existing) {
      existing.events.push(event);
      if (
        Number.isFinite(event.distanceKm) &&
        (existing.distanceKm < 0 || event.distanceKm < existing.distanceKm)
      ) {
        existing.distanceKm = event.distanceKm;
      }
      if (!existing.city && event.city?.trim()) {
        existing.city = event.city.trim();
      }
      continue;
    }
    map.set(key, {
      key,
      venueId: event.venueId,
      venueName: venueGroupLabel(event),
      city: event.city?.trim() || null,
      distanceKm: Number.isFinite(event.distanceKm) ? event.distanceKm : -1,
      events: [event],
    });
  }

  const groups = [...map.values()];
  for (const g of groups) {
    g.events.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }

  groups.sort((a, b) => {
    const da = a.distanceKm >= 0 ? a.distanceKm : Number.POSITIVE_INFINITY;
    const db = b.distanceKm >= 0 ? b.distanceKm : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.venueName.localeCompare(b.venueName, 'sk');
  });

  return groups;
}

/** Slovak plural for program counts in venue headers. */
export function slovakProgramCountLabel(
  count: number,
  tab: ProgramsFeedTab,
): string {
  const n = Math.max(0, Math.floor(count));
  if (tab === 'camps') {
    if (n === 1) return '1 tábor';
    if (n >= 2 && n <= 4) return `${n} tábory`;
    return `${n} táborov`;
  }
  if (tab === 'workshops') {
    if (n === 1) return '1 workshop';
    if (n >= 2 && n <= 4) return `${n} workshopy`;
    return `${n} workshopov`;
  }
  // courses (krúžky)
  if (n === 1) return '1 krúžok';
  if (n >= 2 && n <= 4) return `${n} krúžky`;
  return `${n} krúžkov`;
}
