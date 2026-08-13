import type { BratislavaBoroughSlug } from '@/lib/scrape/bratislava-location';

export interface DiscoveredPlace {
  googlePlaceId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  websiteUrl: string | null;
  primaryType: string | null;
  types: string[];
  city: string;
  sports: string[];
  /** Resolved borough slug when filter/tagging succeeds. */
  boroughSlug?: string | null;
}

export interface GeoCircle {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface PlaceDiscoverOptions {
  /** Max text queries to run (each is one Places API call). */
  maxQueries?: number;
  /** Circle radius when using city-wide Bratislava bias (meters). */
  radiusMeters?: number;
  /** Scope discovery to one borough (e.g. ruzinov). */
  borough?: BratislavaBoroughSlug | string;
  dryRun?: boolean;
}

export interface PlaceDiscoverReport {
  queries: number;
  borough: string | null;
  discovered: number;
  upserted: { created: number; updated: number; unchanged: number };
  scrapePages: { created: number; updated: number; unchanged: number };
  withWebsite: number;
  places: DiscoveredPlace[];
  error?: string;
}

/** Bratislava Old Town approximate center. */
export const BRATISLAVA_CENTER = {
  latitude: 48.1486,
  longitude: 17.1077,
} as const;

/**
 * Borough search circles — tighter than city-wide so Places stays local.
 * Ružinov first; other boroughs can be filled the same way later.
 */
export const BOROUGH_SEARCH_CIRCLES: Record<string, GeoCircle> = {
  ruzinov: {
    // Between Bajkalská / Tomášikova / Štrkovec
    latitude: 48.1528,
    longitude: 17.1512,
    radiusMeters: 4500,
  },
};

/** City-wide sport queries (full Bratislava pass). */
export const BRATISLAVA_SPORT_QUERIES = [
  'padel Bratislava',
  'tenis klub Bratislava',
  'futbal ihrisko Bratislava',
  'fitness gym Bratislava',
  'športové centrum Bratislava',
  'bowling Bratislava',
  'lezecká stena Bratislava',
  'joga štúdio Bratislava',
  'plaváreň Bratislava',
  'basketbalová hala Bratislava',
  'hokejová aréna Bratislava',
  'wakeboard Bratislava',
] as const;

/** Dense Ružinov-first query set — covers common venue types + street anchors. */
export const RUZINOV_SPORT_QUERIES = [
  'športovisko Ružinov',
  'športové centrum Ružinov',
  'padel Ružinov',
  'padel Bajkalská Bratislava',
  'tenis Ružinov',
  'tenisový klub Ružinov',
  'futbal Ružinov',
  'futbalové ihrisko Ružinov',
  'fitness Ružinov',
  'gym Ružinov Bratislava',
  'crossfit Ružinov',
  'joga Ružinov',
  'pilates Ružinov',
  'plaváreň Ružinov',
  'bazén Ružinov',
  'bowling Ružinov',
  'lezecká stena Ružinov',
  'climbing Ružinov',
  'squash Ružinov',
  'badminton Ružinov',
  'basketbal Ružinov',
  'volejbal Ružinov',
  'hokej Ružinov',
  'korčuliarska dráha Ružinov',
  'šípky Ružinov',
  'martial arts Ružinov',
  'MMA Ružinov Bratislava',
  'športová hala Nevädzová',
  'šport Tomášikova Bratislava',
  'šport Prievoz Bratislava',
] as const;

export const CANDIDATE_SCRAPE_PATHS = [
  { path: 'turnaje', kind: 'tournaments' },
  { path: 'eventy', kind: 'events' },
  { path: 'events', kind: 'events' },
  { path: 'rozvrh', kind: 'schedule' },
  { path: 'aktuality', kind: 'events' },
] as const;

export function queriesForBorough(borough?: string | null): readonly string[] {
  const key = (borough ?? '').toLowerCase().trim();
  if (key === 'ruzinov') return RUZINOV_SPORT_QUERIES;
  return BRATISLAVA_SPORT_QUERIES;
}
