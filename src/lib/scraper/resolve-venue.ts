import { createAdminClient } from '@/lib/supabase/admin';
import { listingHost, listingPath, listingUrlKey } from '@/lib/venues/listing-url';

export interface ResolvedListingVenue {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

interface IndexedPage {
  key: string;
  host: string;
  path: string;
  venue: ResolvedListingVenue;
}

export interface VenueUrlIndex {
  pages: IndexedPage[];
  byHost: Map<string, ResolvedListingVenue[]>;
  venues: ResolvedListingVenue[];
}

function venueFromJoin(
  venueId: string | null | undefined,
  venues: { id: string; name: string; latitude: number | null; longitude: number | null } | { id: string; name: string; latitude: number | null; longitude: number | null }[] | null,
): ResolvedListingVenue | null {
  if (!venueId) return null;
  const row = Array.isArray(venues) ? venues[0] : venues;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

export async function loadVenueUrlIndex(): Promise<VenueUrlIndex> {
  const supabase = createAdminClient();
  const [{ data: pages }, { data: venues }] = await Promise.all([
    supabase
      .from('venue_scrape_pages')
      .select('url, venue_id, venues ( id, name, latitude, longitude )')
      .not('venue_id', 'is', null),
    supabase
      .from('venues')
      .select('id, name, website_url, latitude, longitude'),
  ]);

  const indexedPages: IndexedPage[] = [];
  for (const row of pages ?? []) {
    const venue = venueFromJoin(
      row.venue_id as string,
      row.venues as Parameters<typeof venueFromJoin>[1],
    );
    if (!venue) continue;
    const url = String(row.url ?? '');
    indexedPages.push({
      key: listingUrlKey(url),
      host: listingHost(url),
      path: listingPath(url),
      venue,
    });
  }

  const byHost = new Map<string, ResolvedListingVenue[]>();
  const allVenues: ResolvedListingVenue[] = [];
  const seenVenueIds = new Set<string>();
  const pushHost = (host: string, venue: ResolvedListingVenue) => {
    if (!host) return;
    const list = byHost.get(host) ?? [];
    if (!list.some((item) => item.id === venue.id)) list.push(venue);
    byHost.set(host, list);
  };
  const pushVenue = (venue: ResolvedListingVenue) => {
    if (seenVenueIds.has(venue.id)) return;
    seenVenueIds.add(venue.id);
    allVenues.push(venue);
  };

  for (const page of indexedPages) {
    pushHost(page.host, page.venue);
    pushVenue(page.venue);
  }
  for (const row of venues ?? []) {
    const venue: ResolvedListingVenue = {
      id: String(row.id),
      name: String(row.name),
      latitude: (row.latitude as number | null) ?? null,
      longitude: (row.longitude as number | null) ?? null,
    };
    pushVenue(venue);
    const url = String(row.website_url ?? '');
    if (url) pushHost(listingHost(url), venue);
  }

  return { pages: indexedPages, byHost, venues: allVenues };
}

/**
 * Map a scraped listing URL onto a SportSync venue.
 * Prefers the longest matching scrape-page path on the same host (http/https/www ignored).
 */
export function findVenueInIndex(
  venueId: string,
  index: VenueUrlIndex,
): ResolvedListingVenue | null {
  for (const page of index.pages) {
    if (page.venue.id === venueId) return page.venue;
  }
  const named = index.venues.find((venue) => venue.id === venueId);
  if (named) return named;
  for (const list of index.byHost.values()) {
    const hit = list.find((venue) => venue.id === venueId);
    if (hit) return hit;
  }
  return null;
}

export function resolveVenueFromListingUrl(
  url: string,
  index: VenueUrlIndex,
): ResolvedListingVenue | null {
  const host = listingHost(url);
  const path = listingPath(url);
  const key = listingUrlKey(url);
  if (!host) return null;

  let best: { venue: ResolvedListingVenue; score: number } | null = null;
  for (const page of index.pages) {
    if (page.host !== host) continue;
    let score = 0;
    if (page.key === key) score = 10_000 + page.path.length;
    else if (path && page.path && (path.startsWith(page.path) || page.path.startsWith(path))) {
      score = Math.min(path.length, page.path.length);
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { venue: page.venue, score };
    }
  }
  if (best) return best.venue;

  const hostVenues = index.byHost.get(host) ?? [];
  if (hostVenues.length === 1) return hostVenues[0]!;
  return null;
}

function foldVenueName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Fallback when the listing URL is an aggregator (citylife, predpredaj)
 * but the page names a known SportSync venue.
 */
export function resolveVenueFromLocationName(
  locationName: string | null | undefined,
  index: VenueUrlIndex,
): ResolvedListingVenue | null {
  const needle = foldVenueName(locationName ?? '');
  if (needle.length < 4) return null;

  let best: { venue: ResolvedListingVenue; score: number } | null = null;
  for (const venue of index.venues) {
    const name = foldVenueName(venue.name);
    if (name.length < 4) continue;
    let score = 0;
    if (name === needle) score = 1000 + name.length;
    else if (needle.includes(name) || name.includes(needle)) {
      score = Math.min(name.length, needle.length);
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { venue, score };
    }
  }
  return best?.venue ?? null;
}
