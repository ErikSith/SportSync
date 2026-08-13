import {
  BRATISLAVA_CENTER,
  type DiscoveredPlace,
  type GeoCircle,
} from './types';
import { detectEventSport } from '@/lib/constants/sports';
import { sleep } from '../scraper/fetcher';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.websiteUri',
  'places.types',
  'places.primaryType',
].join(',');

interface PlacesSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    websiteUri?: string;
    types?: string[];
    primaryType?: string;
  }>;
}

function getPlacesApiKey(): string {
  const key =
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    '';
  if (!key) {
    throw new Error(
      'Missing GOOGLE_PLACES_API_KEY (or GOOGLE_MAPS_API_KEY). Enable Places API (New) in Google Cloud Console.',
    );
  }
  return key;
}

function inferSports(name: string, types: string[], primaryType: string | null): string[] {
  const blob = `${name} ${primaryType ?? ''} ${types.join(' ')}`;
  const sport = detectEventSport(blob);
  return sport === 'OTHER' ? [] : [sport];
}

function normalizePlaceId(id: string): string {
  return id.startsWith('places/') ? id : `places/${id}`;
}

async function fetchSearchText(
  textQuery: string,
  circle: GeoCircle,
): Promise<Response> {
  const key = getPlacesApiKey();

  return fetch(PLACES_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      languageCode: 'sk',
      regionCode: 'SK',
      maxResultCount: 20,
      // Text Search supports circle only on locationBias (not locationRestriction).
      locationBias: {
        circle: {
          center: {
            latitude: circle.latitude,
            longitude: circle.longitude,
          },
          radius: circle.radiusMeters,
        },
      },
    }),
  });
}

/**
 * Google Places API (New) Text Search.
 * Uses locationBias circle; borough scoping is refined by post-filter.
 * Retries on 429 / 503 with backoff. Polite: caller spaces queries 3–5s.
 */
export async function searchPlacesText(
  textQuery: string,
  options: {
    radiusMeters?: number;
    circle?: GeoCircle;
    /** @deprecated Text Search ignores hardRestrict; kept for call-site compat. */
    hardRestrict?: boolean;
  } = {},
): Promise<DiscoveredPlace[]> {
  const circle: GeoCircle = options.circle ?? {
    latitude: BRATISLAVA_CENTER.latitude,
    longitude: BRATISLAVA_CENTER.longitude,
    radiusMeters: options.radiusMeters ?? 22_000,
  };

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetchSearchText(textQuery, circle);
    if (res.status === 429 || res.status === 503) {
      const body = await res.text().catch(() => '');
      lastError = new Error(`Places searchText HTTP ${res.status}: ${body.slice(0, 200)}`);
      await sleep(2_000 * 2 ** attempt + Math.floor(Math.random() * 500));
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Places searchText HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as PlacesSearchResponse;
    const out: DiscoveredPlace[] = [];

    for (const place of json.places ?? []) {
      const lat = place.location?.latitude;
      const lng = place.location?.longitude;
      const name = place.displayName?.text?.trim();
      if (lat == null || lng == null || !name || !place.id) continue;

      const types = place.types ?? [];
      const primaryType = place.primaryType ?? null;
      out.push({
        googlePlaceId: normalizePlaceId(place.id),
        name,
        address: place.formattedAddress?.trim() || null,
        latitude: lat,
        longitude: lng,
        websiteUrl: place.websiteUri?.trim() || null,
        primaryType,
        types,
        city: 'Bratislava',
        sports: inferSports(name, types, primaryType),
      });
    }

    return out;
  }

  throw lastError ?? new Error(`Places searchText failed for "${textQuery}"`);
}
