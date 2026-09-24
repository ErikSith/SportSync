import type { EventCardData } from '@/lib/data/events';
import { displayVenueName } from '@/lib/venues/listing-url';
import type { ProgramsFeedTab } from '@/lib/programs/classify';

export type ProgramGroupKind = 'venue' | 'camp_series';

export type GroupedVenuePrograms = {
  key: string;
  kind: ProgramGroupKind;
  venueId: string | null;
  venueName: string;
  /** Header title — camp name for series, venue name otherwise. */
  title: string;
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

function campSeriesId(event: EventCardData): string | null {
  const raw = event.themeConfig?.campSeriesId;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

/**
 * Group program listings for the feed.
 * Camp turnusy sharing theme_config.campSeriesId collapse into one card;
 * everything else groups by venue (same pattern as skupinové cvičenia).
 */
export function groupProgramsByVenue(
  events: EventCardData[],
): GroupedVenuePrograms[] {
  const seriesMap = new Map<string, GroupedVenuePrograms>();
  const leftovers: EventCardData[] = [];

  for (const event of events) {
    const series = campSeriesId(event);
    if (!series) {
      leftovers.push(event);
      continue;
    }
    const key = `series:${series}`;
    const existing = seriesMap.get(key);
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
      if (!existing.venueId && event.venueId) existing.venueId = event.venueId;
      continue;
    }
    seriesMap.set(key, {
      key,
      kind: 'camp_series',
      venueId: event.venueId,
      venueName: venueGroupLabel(event),
      title: event.title.trim() || venueGroupLabel(event),
      city: event.city?.trim() || null,
      distanceKm: Number.isFinite(event.distanceKm) ? event.distanceKm : -1,
      events: [event],
    });
  }

  const venueMap = new Map<string, GroupedVenuePrograms>();
  for (const event of leftovers) {
    const key = venueGroupKey(event);
    const existing = venueMap.get(key);
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
    const label = venueGroupLabel(event);
    venueMap.set(key, {
      key,
      kind: 'venue',
      venueId: event.venueId,
      venueName: label,
      title: label,
      city: event.city?.trim() || null,
      distanceKm: Number.isFinite(event.distanceKm) ? event.distanceKm : -1,
      events: [event],
    });
  }

  const groups = [...seriesMap.values(), ...venueMap.values()];
  for (const g of groups) {
    g.events.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }

  groups.sort((a, b) => {
    const da = a.distanceKm >= 0 ? a.distanceKm : Number.POSITIVE_INFINITY;
    const db = b.distanceKm >= 0 ? b.distanceKm : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.title.localeCompare(b.title, 'sk');
  });

  return groups;
}

/** Slovak plural for program counts in venue headers. */
export function slovakProgramCountLabel(
  count: number,
  tab: ProgramsFeedTab,
  kind: ProgramGroupKind = 'venue',
): string {
  const n = Math.max(0, Math.floor(count));
  if (kind === 'camp_series' || tab === 'camps') {
    if (kind === 'camp_series') {
      if (n === 1) return '1 turnus';
      if (n >= 2 && n <= 4) return `${n} turnusy`;
      return `${n} turnusov`;
    }
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
