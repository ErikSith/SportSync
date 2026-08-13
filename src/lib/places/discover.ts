import { resolveBorough, slugToBorough } from '@/lib/scrape/bratislava-location';
import { distanceKm } from '@/lib/geo';
import { sleep } from '../scraper/fetcher';
import { searchPlacesText } from './client';
import {
  exportScrapePagesJson,
  upsertDiscoveredVenues,
  upsertScrapePagesForPlaces,
} from './store';
import {
  BOROUGH_SEARCH_CIRCLES,
  queriesForBorough,
  type DiscoveredPlace,
  type PlaceDiscoverOptions,
  type PlaceDiscoverReport,
} from './types';

/** 3–5s between Places API calls — never burst third-party APIs. */
const PLACES_DELAY_MS = { min: 3000, max: 5000 } as const;

function randomDelay(): number {
  return (
    PLACES_DELAY_MS.min +
    Math.floor(Math.random() * (PLACES_DELAY_MS.max - PLACES_DELAY_MS.min + 1))
  );
}

function dedupePlaces(places: DiscoveredPlace[]): DiscoveredPlace[] {
  const byId = new Map<string, DiscoveredPlace>();
  for (const place of places) {
    const prev = byId.get(place.googlePlaceId);
    if (!prev) {
      byId.set(place.googlePlaceId, place);
      continue;
    }
    if (!prev.websiteUrl && place.websiteUrl) {
      byId.set(place.googlePlaceId, place);
    }
  }
  return [...byId.values()];
}

function filterToBorough(
  places: DiscoveredPlace[],
  boroughSlug: string,
): DiscoveredPlace[] {
  const circle = BOROUGH_SEARCH_CIRCLES[boroughSlug];
  const boroughName = slugToBorough(boroughSlug);

  return places
    .map((place) => {
      const resolved = resolveBorough(place.address ?? '', place.name);
      const slug = resolved?.slug ?? null;
      return { ...place, boroughSlug: slug } as DiscoveredPlace;
    })
    .filter((place) => {
      if (place.boroughSlug === boroughSlug) return true;
      if (circle) {
        const km = distanceKm(
          circle.latitude,
          circle.longitude,
          place.latitude,
          place.longitude,
        );
        const maxKm = circle.radiusMeters / 1000;
        if (km <= maxKm) {
          place.boroughSlug = boroughSlug;
          return true;
        }
      }
      if (boroughName) {
        const blob = `${place.name} ${place.address ?? ''}`.toLowerCase();
        if (
          blob.includes(boroughName.toLowerCase()) ||
          blob.includes(boroughSlug)
        ) {
          place.boroughSlug = boroughSlug;
          return true;
        }
      }
      return false;
    });
}

/**
 * Discover sports venues via Google Places Text Search,
 * upsert GPS + websiteUrl into `venues`, and fill `venue_scrape_pages`.
 */
export async function discoverBratislavaVenues(
  options: PlaceDiscoverOptions = {},
): Promise<PlaceDiscoverReport> {
  const boroughSlug = options.borough?.toLowerCase().trim() || null;
  const queriesAll = queriesForBorough(boroughSlug);
  const maxQueries = options.maxQueries ?? queriesAll.length;
  const queries = queriesAll.slice(0, Math.max(1, maxQueries));
  const dryRun = options.dryRun ?? false;
  const circle = boroughSlug ? BOROUGH_SEARCH_CIRCLES[boroughSlug] : undefined;

  const collected: DiscoveredPlace[] = [];
  let queryErrors = 0;

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i]!;
    try {
      console.log(`[places] (${i + 1}/${queries.length}) search "${q}"`);
      const batch = await searchPlacesText(q, {
        radiusMeters: options.radiusMeters ?? 22_000,
        circle,
        hardRestrict: Boolean(circle),
      });
      console.log(`[places] → ${batch.length} place(s)`);
      collected.push(...batch);
    } catch (err) {
      queryErrors += 1;
      console.warn(
        `[places] query failed "${q}":`,
        err instanceof Error ? err.message : err,
      );
    }

    if (i < queries.length - 1) {
      await sleep(randomDelay());
    }
  }

  let places = dedupePlaces(collected);
  if (boroughSlug) {
    const before = places.length;
    places = filterToBorough(places, boroughSlug);
    console.log(
      `[places] borough filter ${boroughSlug}: ${before} → ${places.length}`,
    );
  }

  const withWebsite = places.filter((p) => p.websiteUrl).length;

  // Always export JSON registry for the scrape DB (even on dry-run)
  let jsonPath: string | null = null;
  if (places.length > 0 && boroughSlug) {
    jsonPath = await exportScrapePagesJson(places, boroughSlug);
    console.log(`[places] scrape registry JSON → ${jsonPath}`);
  } else if (places.length > 0) {
    jsonPath = await exportScrapePagesJson(places, 'bratislava');
    console.log(`[places] scrape registry JSON → ${jsonPath}`);
  }

  let upserted = { created: 0, updated: 0, unchanged: 0 };
  let scrapePages = { created: 0, updated: 0, unchanged: 0 };

  if (!dryRun && places.length > 0) {
    try {
      const venueResult = await upsertDiscoveredVenues(places, boroughSlug);
      upserted = {
        created: venueResult.created,
        updated: venueResult.updated,
        unchanged: venueResult.unchanged,
      };
      console.log('[places] venues upsert', upserted);

      scrapePages = await upsertScrapePagesForPlaces(
        places,
        venueResult.venueIds,
        boroughSlug,
      );
      console.log('[places] scrape pages upsert', scrapePages);
    } catch (err) {
      console.warn(
        '[places] DB upsert failed (JSON registry still written):',
        err instanceof Error ? err.message : err,
      );
    }
  } else if (dryRun) {
    console.log(
      `[places] dry-run — ${places.length} venue(s), ${withWebsite} with website — no DB writes`,
    );
  }

  return {
    queries: queries.length,
    borough: boroughSlug,
    discovered: places.length,
    upserted,
    scrapePages,
    withWebsite,
    places,
    error:
      queryErrors === queries.length && places.length === 0
        ? 'All Places queries failed — check GOOGLE_PLACES_API_KEY and Places API (New) enablement.'
        : undefined,
  };
}
