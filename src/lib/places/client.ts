import {
  BRATISLAVA_CENTER,
  type DiscoveredPlace,
  type GeoCircle,
  type PlaceOpeningHours,
} from './types';
import { detectEventSport } from '@/lib/constants/sports';
import { toVenueHomepageUrl } from '@/lib/venues/homepage-url';
import { sleep } from '../scraper/fetcher';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
/** Text + hours + GPS only — never request photos. */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.websiteUri',
  'places.types',
  'places.primaryType',
  'places.regularOpeningHours',
  'nextPageToken',
].join(',');

const NOISE_TYPES = new Set([
  'restaurant',
  'cafe',
  'bar',
  'meal_takeaway',
  'meal_delivery',
  'lodging',
  'hotel',
  'clothing_store',
  'shoe_store',
  'electronics_store',
  'supermarket',
  'grocery_store',
  'pharmacy',
  'beauty_salon',
  'hair_care',
  'car_repair',
  'real_estate_agency',
  'travel_agency',
  'church',
  'bank',
  'atm',
  'gas_station',
]);

const SPORT_PLACE_TYPES = new Set([
  'gym',
  'stadium',
  'sports_club',
  'sports_complex',
  'athletic_field',
  'swimming_pool',
  'bowling_alley',
  'golf_course',
  'ice_skating_rink',
  'fitness_center',
  'sports_activity_location',
]);

const NOISE_NAME_RE =
  /\b(restaurant|reštaurácia|restauracia|kaviareň|kaviaren|cafe|hotel|obchod|eshop|shop|sauna\.sk|bazénov|bazenov)\b/i;

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

interface RegularOpeningHours {
  weekdayDescriptions?: string[];
  periods?: Array<{
    open?: { day?: number; hour?: number; minute?: number };
    close?: { day?: number; hour?: number; minute?: number };
  }>;
}

interface PlacesSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    websiteUri?: string;
    types?: string[];
    primaryType?: string;
    regularOpeningHours?: RegularOpeningHours;
  }>;
  nextPageToken?: string;
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

function padTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseOpeningHours(hours: RegularOpeningHours | undefined): PlaceOpeningHours | null {
  if (!hours) return null;
  const out: PlaceOpeningHours = {};

  for (const period of hours.periods ?? []) {
    const openDay = period.open?.day;
    if (openDay == null || period.open?.hour == null) continue;
    const key = DAY_KEYS[openDay];
    if (!key) continue;
    const open = padTime(period.open.hour, period.open.minute ?? 0);
    const close =
      period.close?.hour != null
        ? padTime(period.close.hour, period.close.minute ?? 0)
        : '24:00';
    const slot = `${open}-${close}`;
    const prev = out[key];
    out[key] = prev ? `${prev}, ${slot}` : slot;
  }

  if (Object.keys(out).length > 0) return out;

  const descriptions = hours.weekdayDescriptions ?? [];
  if (descriptions.length === 0) return null;

  const dayMap: Array<[RegExp, keyof PlaceOpeningHours]> = [
    [/pondelok|monday/i, 'monday'],
    [/utorok|tuesday/i, 'tuesday'],
    [/streda|wednesday/i, 'wednesday'],
    [/štvrtok|stvrtok|thursday/i, 'thursday'],
    [/piatok|friday/i, 'friday'],
    [/sobota|saturday/i, 'saturday'],
    [/nedeľa|nedela|sunday/i, 'sunday'],
  ];
  for (const line of descriptions) {
    const match = dayMap.find(([re]) => re.test(line));
    if (!match) continue;
    const hoursPart = line.split(/:\s*/).slice(1).join(':').trim();
    if (hoursPart) out[match[1]] = hoursPart.replace(/\s+/g, ' ');
  }
  return Object.keys(out).length > 0 ? out : null;
}

const TYPE_SPORT: Record<string, string> = {
  gym: 'FITNESS',
  fitness_center: 'FITNESS',
  swimming_pool: 'SWIMMING',
  bowling_alley: 'BOWLING',
  golf_course: 'GOLF',
  ice_skating_rink: 'HOCKEY',
  athletic_field: 'FOOTBALL',
};

function inferSports(name: string, types: string[], primaryType: string | null): string[] {
  const blob = `${name} ${primaryType ?? ''} ${types.join(' ')}`;
  const sports = new Set<string>();
  const fromName = detectEventSport(blob);
  if (fromName !== 'OTHER') sports.add(fromName);

  const typeKey = primaryType ?? types[0] ?? '';
  const fromType = TYPE_SPORT[typeKey];
  if (fromType) sports.add(fromType);

  if (/lezen|climb|bould/i.test(blob)) sports.add('CLIMBING');
  if (/badminton|bedminton/i.test(blob)) sports.add('OTHER');
  if (/bowling/i.test(blob)) sports.add('BOWLING');
  if (/yoga|joga/i.test(blob)) sports.add('YOGA');
  if (/crossfit/i.test(blob)) sports.add('FITNESS');
  if (/aikido|karate|judo|kickbox|zápas|zapas/i.test(blob)) sports.add('COMBAT');

  return [...sports];
}

function isSportsVenue(name: string, types: string[], primaryType: string | null): boolean {
  if (NOISE_NAME_RE.test(name)) return false;
  const allTypes = new Set([primaryType, ...types].filter(Boolean) as string[]);
  if ([...allTypes].some((t) => NOISE_TYPES.has(t)) && ![...allTypes].some((t) => SPORT_PLACE_TYPES.has(t))) {
    return false;
  }
  if ([...allTypes].some((t) => SPORT_PLACE_TYPES.has(t))) return true;
  return inferSports(name, types, primaryType).length > 0 || /šport|sport|ihrisko|aréna|arena|hala|gym|klub/i.test(name);
}

function isInBratislavaArea(lat: number, lng: number, address: string | null): boolean {
  if (/bratislava/i.test(address ?? '')) return true;
  const dLat = lat - BRATISLAVA_CENTER.latitude;
  const dLng = lng - BRATISLAVA_CENTER.longitude;
  const km = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
  return km <= 22;
}

function normalizePlaceId(id: string): string {
  return id.startsWith('places/') ? id : `places/${id}`;
}

async function fetchSearchText(
  textQuery: string,
  circle: GeoCircle,
  pageToken?: string,
): Promise<Response> {
  const key = getPlacesApiKey();
  const body: Record<string, unknown> = {
    textQuery,
    languageCode: 'sk',
    regionCode: 'SK',
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: {
          latitude: circle.latitude,
          longitude: circle.longitude,
        },
        radius: circle.radiusMeters,
      },
    },
  };
  if (pageToken) body.pageToken = pageToken;

  return fetch(PLACES_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
}

function mapPlace(
  place: NonNullable<PlacesSearchResponse['places']>[number],
): DiscoveredPlace | null {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const name = place.displayName?.text?.trim();
  if (lat == null || lng == null || !name || !place.id) return null;

  const types = place.types ?? [];
  const primaryType = place.primaryType ?? null;
  if (!isSportsVenue(name, types, primaryType)) return null;

  const address = place.formattedAddress?.trim() || null;
  if (!isInBratislavaArea(lat, lng, address)) return null;

  return {
    googlePlaceId: normalizePlaceId(place.id),
    name: name.slice(0, 160),
    address,
    latitude: lat,
    longitude: lng,
    websiteUrl: toVenueHomepageUrl(place.websiteUri),
    primaryType,
    types,
    city: 'Bratislava',
    sports: inferSports(name, types, primaryType),
    openingHours: parseOpeningHours(place.regularOpeningHours),
  };
}

/**
 * Google Places API (New) Text Search.
 * Uses locationBias circle; borough scoping is refined by post-filter.
 * Retries on 429 / 503 with backoff. Polite: caller spaces queries 3–5s.
 * Never requests photos.
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

  const collected: DiscoveredPlace[] = [];
  let pageToken: string | undefined;
  let lastError: Error | null = null;

  for (let page = 0; page < 2; page++) {
    if (page > 0 && pageToken) {
      await sleep(2000);
    }

    let pageOk = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetchSearchText(textQuery, circle, pageToken);
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
      for (const place of json.places ?? []) {
        const mapped = mapPlace(place);
        if (mapped) collected.push(mapped);
      }
      pageToken = json.nextPageToken?.trim() || undefined;
      pageOk = true;
      lastError = null;
      break;
    }

    if (!pageOk) {
      throw lastError ?? new Error(`Places searchText failed for "${textQuery}"`);
    }
    if (!pageToken) break;
  }

  return collected;
}
