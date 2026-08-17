import type { BratislavaBoroughSlug } from '@/lib/scrape/bratislava-location';

export interface PlaceOpeningHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

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
  openingHours?: PlaceOpeningHours | null;
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
  withHours: number;
  skippedNoise: number;
  places: DiscoveredPlace[];
  error?: string;
}

export interface PlaceSearchJob {
  query: string;
  circle?: GeoCircle;
  borough?: string;
}

/** Bratislava Old Town approximate center. */
export const BRATISLAVA_CENTER = {
  latitude: 48.1486,
  longitude: 17.1077,
} as const;

/**
 * Borough search circles — tighter than city-wide so Places stays local.
 */
export const BOROUGH_SEARCH_CIRCLES: Record<string, GeoCircle> = {
  'stare-mesto': { latitude: 48.1439, longitude: 17.1093, radiusMeters: 2800 },
  ruzinov: { latitude: 48.1528, longitude: 17.1512, radiusMeters: 4500 },
  vrakuna: { latitude: 48.1475, longitude: 17.208, radiusMeters: 2800 },
  'podunajske-biskupice': { latitude: 48.127, longitude: 17.213, radiusMeters: 3200 },
  'nove-mesto': { latitude: 48.1685, longitude: 17.132, radiusMeters: 3500 },
  raca: { latitude: 48.205, longitude: 17.154, radiusMeters: 3500 },
  vajnory: { latitude: 48.2055, longitude: 17.207, radiusMeters: 2800 },
  'karlova-ves': { latitude: 48.161, longitude: 17.06, radiusMeters: 3200 },
  dubravka: { latitude: 48.186, longitude: 17.042, radiusMeters: 3200 },
  lamac: { latitude: 48.194, longitude: 17.045, radiusMeters: 2500 },
  devin: { latitude: 48.174, longitude: 16.983, radiusMeters: 2500 },
  'devinska-nova-ves': { latitude: 48.208, longitude: 16.978, radiusMeters: 3200 },
  'zahorska-bystrica': { latitude: 48.237, longitude: 17.041, radiusMeters: 2800 },
  petrzalka: { latitude: 48.125, longitude: 17.11, radiusMeters: 4500 },
  jarovce: { latitude: 48.066, longitude: 17.115, radiusMeters: 2500 },
  rusovce: { latitude: 48.054, longitude: 17.148, radiusMeters: 2500 },
  cunovo: { latitude: 48.03, longitude: 17.2, radiusMeters: 2800 },
};

export const MAJOR_BOROUGH_SLUGS = [
  'stare-mesto',
  'ruzinov',
  'petrzalka',
  'nove-mesto',
  'karlova-ves',
  'dubravka',
  'raca',
] as const;

const BOROUGH_QUERY_LABEL: Record<string, string> = {
  'stare-mesto': 'Staré Mesto Bratislava',
  ruzinov: 'Ružinov',
  petrzalka: 'Petržalka',
  'nove-mesto': 'Nové Mesto Bratislava',
  'karlova-ves': 'Karlova Ves',
  dubravka: 'Dúbravka',
  raca: 'Rača',
  vrakuna: 'Vrakuňa',
  'podunajske-biskupice': 'Podunajské Biskupice',
  vajnory: 'Vajnory',
  lamac: 'Lamač',
  devin: 'Devín',
  'devinska-nova-ves': 'Devínska Nová Ves',
  'zahorska-bystrica': 'Záhorská Bystrica',
  jarovce: 'Jarovce',
  rusovce: 'Rusovce',
  cunovo: 'Čunovo',
};

/** City-wide sport queries (full Bratislava pass). */
export const BRATISLAVA_SPORT_QUERIES = [
  'športovisko Bratislava',
  'športové centrum Bratislava',
  'športová hala Bratislava',
  'padel Bratislava',
  'tenis klub Bratislava',
  'futbalové ihrisko Bratislava',
  'fitness gym Bratislava',
  'crossfit Bratislava',
  'bowling Bratislava',
  'lezecká stena Bratislava',
  'joga štúdio Bratislava',
  'plaváreň Bratislava',
  'kúpalisko Bratislava',
  'squash Bratislava',
  'badminton Bratislava',
  'basketbalová hala Bratislava',
  'hokejová aréna Bratislava',
  'zimný štadión Bratislava',
  'wakeboard Bratislava',
  'MMA gym Bratislava',
  'stolný tenis Bratislava',
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

const BOROUGH_CORE_TEMPLATES = [
  'športovisko {place}',
  'športová hala {place}',
  'fitness {place}',
  'tenis {place}',
  'futbal {place}',
  'plaváreň {place}',
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
  const label = BOROUGH_QUERY_LABEL[key];
  if (label) {
    return BOROUGH_CORE_TEMPLATES.map((template) => template.replace('{place}', label));
  }
  return BRATISLAVA_SPORT_QUERIES;
}

/** Full Bratislava pass: city-wide sports + dense queries in major boroughs. */
export function buildBratislavaDiscoverJobs(): PlaceSearchJob[] {
  const jobs: PlaceSearchJob[] = BRATISLAVA_SPORT_QUERIES.map((query) => ({ query }));
  for (const slug of MAJOR_BOROUGH_SLUGS) {
    const circle = BOROUGH_SEARCH_CIRCLES[slug];
    const label = BOROUGH_QUERY_LABEL[slug] ?? slug;
    for (const template of BOROUGH_CORE_TEMPLATES) {
      jobs.push({
        query: template.replace('{place}', label),
        circle,
        borough: slug,
      });
    }
  }
  return jobs;
}
