import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveBorough } from '@/lib/scrape/bratislava-location';
import { toVenueHomepageUrl } from '@/lib/venues/homepage-url';
import {
  CANDIDATE_SCRAPE_PATHS,
  type DiscoveredPlace,
} from './types';

export type VenueUpsertStats = {
  created: number;
  updated: number;
  unchanged: number;
};

export type ScrapePageUpsertStats = {
  created: number;
  updated: number;
  unchanged: number;
};

function normalizeWebsiteUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (!/^https?:$/i.test(u.protocol)) return null;
    if (
      /(^|\.)(instagram|facebook|fb|tiktok|youtube|linktr\.ee)\.com$/i.test(u.hostname) ||
      /maps\.google|goo\.gl/i.test(u.hostname)
    ) {
      return null;
    }
    u.hash = '';
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    return u.toString();
  } catch {
    return null;
  }
}

function joinCandidate(base: string, pathSeg: string): string | null {
  try {
    const root = base.endsWith('/') ? base : `${base}/`;
    return new URL(pathSeg.replace(/^\//, ''), root).toString();
  } catch {
    return null;
  }
}

function tagBorough(place: DiscoveredPlace, preferredSlug?: string | null): string | null {
  if (preferredSlug) return preferredSlug;
  if (place.boroughSlug) return place.boroughSlug;
  const resolved = resolveBorough(place.address ?? '', place.name);
  return resolved?.slug ?? null;
}

type VenueRow = {
  id: string;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  address: string | null;
  district: string | null;
  sports: string[] | null;
  opening_hours?: Record<string, string> | null;
};

/**
 * Upsert venues via Supabase service-role REST (same path as existing scrapers).
 * Avoids Prisma/DATABASE_URL — direct db.* host often fails on IPv6-only networks.
 */
export async function upsertDiscoveredVenues(
  places: DiscoveredPlace[],
  preferredBoroughSlug?: string | null,
): Promise<VenueUpsertStats & { venueIds: Map<string, string> }> {
  const supabase = createAdminClient();
  const stats: VenueUpsertStats = { created: 0, updated: 0, unchanged: 0 };
  const venueIds = new Map<string, string>();

  for (const place of places) {
    try {
      const boroughSlug = tagBorough(place, preferredBoroughSlug);

      const byPlace = await supabase
        .from('venues')
        .select(
          'id, google_place_id, latitude, longitude, website_url, address, district, sports, opening_hours',
        )
        .eq('google_place_id', place.googlePlaceId)
        .maybeSingle();

      let existing = (byPlace.data as VenueRow | null) ?? null;

      if (!existing) {
        const byName = await supabase
          .from('venues')
          .select(
            'id, google_place_id, latitude, longitude, website_url, address, district, sports, opening_hours',
          )
          .eq('city', place.city)
          .ilike('name', place.name)
          .maybeSingle();
        existing = (byName.data as VenueRow | null) ?? null;
      }

      const websiteUrl = toVenueHomepageUrl(place.websiteUrl);
      const openingHours =
        place.openingHours && Object.keys(place.openingHours).length > 0
          ? place.openingHours
          : null;

      const sports = [...new Set([...(place.sports ?? []), ...(existing?.sports ?? [])])];

      if (!existing) {
        const { data: created, error } = await supabase
          .from('venues')
          .insert({
            name: place.name,
            address: place.address,
            city: place.city,
            district: boroughSlug,
            latitude: place.latitude,
            longitude: place.longitude,
            website_url: websiteUrl,
            google_place_id: place.googlePlaceId,
            sports,
            opening_hours: openingHours ?? {},
            verified: false,
            description: place.primaryType
              ? `Objavené cez Google Places (${place.primaryType}).`
              : 'Objavené cez Google Places.',
          })
          .select('id')
          .single();

        if (error || !created) {
          console.warn('[places.store] venue create failed', place.name, error?.message);
          continue;
        }
        venueIds.set(place.googlePlaceId, created.id);
        stats.created += 1;
        continue;
      }

      venueIds.set(place.googlePlaceId, existing.id);

      const nextWebsite = websiteUrl ?? existing.website_url;
      const nextHours = openingHours ?? existing.opening_hours ?? {};
      const same =
        existing.google_place_id === place.googlePlaceId &&
        existing.latitude === place.latitude &&
        existing.longitude === place.longitude &&
        (existing.website_url ?? null) === (nextWebsite ?? null) &&
        (existing.address ?? null) === (place.address ?? null) &&
        (existing.district ?? null) === (boroughSlug ?? existing.district ?? null);

      if (same && !openingHours) {
        stats.unchanged += 1;
        continue;
      }

      const { error } = await supabase
        .from('venues')
        .update({
          name: place.name,
          google_place_id: place.googlePlaceId,
          latitude: place.latitude,
          longitude: place.longitude,
          website_url: nextWebsite,
          address: place.address ?? existing.address,
          district: boroughSlug ?? existing.district,
          sports: sports.length ? sports : existing.sports,
          opening_hours: nextHours,
        })
        .eq('id', existing.id);

      if (error) {
        console.warn('[places.store] venue update failed', place.name, error.message);
        continue;
      }
      stats.updated += 1;
    } catch (err) {
      console.warn(
        '[places.store] upsert failed',
        place.name,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return { ...stats, venueIds };
}

export function buildScrapePageCandidates(
  websiteUrl: string,
): Array<{ url: string; kind: string }> {
  const base = normalizeWebsiteUrl(websiteUrl);
  if (!base) return [];

  const out: Array<{ url: string; kind: string }> = [{ url: base, kind: 'website' }];
  const seen = new Set([base]);

  for (const cand of CANDIDATE_SCRAPE_PATHS) {
    const url = joinCandidate(base, cand.path);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, kind: cand.kind });
  }
  return out;
}

export async function upsertScrapePagesForPlaces(
  places: DiscoveredPlace[],
  venueIds: Map<string, string>,
  preferredBoroughSlug?: string | null,
): Promise<ScrapePageUpsertStats> {
  const supabase = createAdminClient();
  const stats: ScrapePageUpsertStats = { created: 0, updated: 0, unchanged: 0 };

  for (const place of places) {
    if (!place.websiteUrl) continue;
    const venueId = venueIds.get(place.googlePlaceId) ?? null;
    const borough = tagBorough(place, preferredBoroughSlug);
    const candidates = buildScrapePageCandidates(place.websiteUrl);

    for (const page of candidates) {
      try {
        const { data: existing } = await supabase
          .from('venue_scrape_pages')
          .select('id, venue_id, borough, kind, enabled, source')
          .eq('url', page.url)
          .maybeSingle();

        const enabled = page.kind === 'website';
        if (!existing) {
          const { error } = await supabase.from('venue_scrape_pages').insert({
            url: page.url,
            kind: page.kind,
            borough,
            enabled,
            source: 'google-places',
            venue_id: venueId,
          });
          if (error) {
            console.warn('[places.store] scrape page create failed', page.url, error.message);
            continue;
          }
          stats.created += 1;
          continue;
        }

        const same =
          (existing.venue_id ?? null) === (venueId ?? existing.venue_id ?? null) &&
          (existing.borough ?? null) === (borough ?? existing.borough ?? null) &&
          existing.kind === page.kind;

        if (same) {
          stats.unchanged += 1;
          continue;
        }

        const { error } = await supabase
          .from('venue_scrape_pages')
          .update({
            venue_id: venueId ?? existing.venue_id,
            borough: borough ?? existing.borough,
            kind: page.kind,
            enabled: Boolean(existing.enabled) || enabled,
            source: existing.source || 'google-places',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          console.warn('[places.store] scrape page update failed', page.url, error.message);
          continue;
        }
        stats.updated += 1;
      } catch (err) {
        console.warn(
          '[places.store] scrape page upsert failed',
          page.url,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  return stats;
}

export async function exportScrapePagesJson(
  places: DiscoveredPlace[],
  boroughSlug: string,
  fileName?: string,
): Promise<string> {
  const pages: Array<{
    venueName: string;
    googlePlaceId: string;
    address: string | null;
    latitude: number;
    longitude: number;
    sports: string[];
    url: string;
    kind: string;
    enabled: boolean;
    borough: string;
  }> = [];

  for (const place of places) {
    if (!place.websiteUrl) continue;
    for (const page of buildScrapePageCandidates(place.websiteUrl)) {
      pages.push({
        venueName: place.name,
        googlePlaceId: place.googlePlaceId,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        sports: place.sports,
        url: page.url,
        kind: page.kind,
        enabled: page.kind === 'website',
        borough: boroughSlug,
      });
    }
  }

  const byUrl = new Map<string, (typeof pages)[number]>();
  for (const p of pages) byUrl.set(p.url, p);

  const payload = {
    generatedAt: new Date().toISOString(),
    borough: boroughSlug,
    venueCount: places.length,
    withWebsite: places.filter((p) => p.websiteUrl).length,
    pageCount: byUrl.size,
    fingerprint: createHash('sha1')
      .update([...byUrl.keys()].sort().join('\n'))
      .digest('hex')
      .slice(0, 12),
    pages: [...byUrl.values()].sort((a, b) => a.venueName.localeCompare(b.venueName)),
  };

  const dir = path.join(process.cwd(), 'data', 'scrape-pages');
  await mkdir(dir, { recursive: true });
  const outPath = path.join(dir, fileName ?? `${boroughSlug}.json`);
  await writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
  return outPath;
}

export async function listVenuesWithWebsites(limit = 40): Promise<
  Array<{
    id: string;
    name: string;
    websiteUrl: string;
    latitude: number | null;
    longitude: number | null;
  }>
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, website_url, latitude, longitude')
    .not('website_url', 'is', null)
    .ilike('city', '%Bratislava%')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((r) => Boolean(r.website_url?.trim()))
    .map((r) => ({
      id: r.id,
      name: r.name,
      websiteUrl: String(r.website_url).trim(),
      latitude: r.latitude,
      longitude: r.longitude,
    }));
}

const LISTING_KIND_ORDER = ['tournaments', 'events', 'schedule'] as const;

export async function listEnabledScrapePages(opts: {
  borough?: string;
  boroughs?: string[];
  limit?: number;
  kinds?: string[];
  /** Skip pages scraped at/after this instant (ISO). */
  skipScrapedAfter?: string;
  neverScrapedOnly?: boolean;
} = {}): Promise<
  Array<{
    id: string;
    url: string;
    kind: string;
    borough: string | null;
    venueId: string | null;
    venueName: string | null;
    latitude: number | null;
    longitude: number | null;
  }>
> {
  const supabase = createAdminClient();
  const fetchLimit = Math.min(800, Math.max(opts.limit ?? 250, 400));
  let q = supabase
    .from('venue_scrape_pages')
    .select(
      'id, url, kind, borough, venue_id, last_scraped_at, venues ( id, name, latitude, longitude )',
    )
    .eq('enabled', true)
    .order('last_scraped_at', { ascending: true, nullsFirst: true })
    .limit(fetchLimit);

  const boroughs = [
    ...new Set(
      [opts.borough, ...(opts.boroughs ?? [])]
        .filter((b): b is string => Boolean(b?.trim()))
        .map((b) => b.trim().toLowerCase()),
    ),
  ];
  if (boroughs.length === 1) q = q.eq('borough', boroughs[0]!);
  else if (boroughs.length > 1) q = q.in('borough', boroughs);
  if (opts.kinds?.length) q = q.in('kind', opts.kinds);
  if (opts.neverScrapedOnly) q = q.is('last_scraped_at', null);
  else if (opts.skipScrapedAfter) {
    q = q.or(`last_scraped_at.is.null,last_scraped_at.lt.${opts.skipScrapedAfter}`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((r) => {
    const venue = Array.isArray(r.venues) ? r.venues[0] : r.venues;
    return {
      id: r.id as string,
      url: r.url as string,
      kind: String(r.kind ?? 'website'),
      borough: (r.borough as string | null) ?? null,
      venueId: (r.venue_id as string | null) ?? null,
      venueName: venue?.name ?? null,
      latitude: (venue?.latitude as number | null) ?? null,
      longitude: (venue?.longitude as number | null) ?? null,
    };
  });

  const kindRank = (kind: string) => {
    const i = LISTING_KIND_ORDER.indexOf(kind as (typeof LISTING_KIND_ORDER)[number]);
    return i === -1 ? LISTING_KIND_ORDER.length : i;
  };
  rows.sort((a, b) => kindRank(a.kind) - kindRank(b.kind));

  return rows.slice(0, opts.limit ?? 250);
}
