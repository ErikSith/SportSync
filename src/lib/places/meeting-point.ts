import { BRATISLAVA_CENTER, type GeoCircle } from './types';
import { getGoogleMapsApiKey } from './client';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.primaryType',
].join(',');

export interface MeetingPointPlace {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  primaryType: string | null;
}

interface PlacesSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    types?: string[];
    primaryType?: string;
  }>;
}

function isInBratislavaArea(lat: number, lng: number, address: string | null): boolean {
  if (/bratislava/i.test(address ?? '')) return true;
  const dLat = lat - BRATISLAVA_CENTER.latitude;
  const dLng = lng - BRATISLAVA_CENTER.longitude;
  const km = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
  return km <= 22;
}

/**
 * Free-text Places search for meeting points (bridges, parks, landmarks).
 * No sports-venue filter — landmarks are allowed.
 */
export async function searchMeetingPoints(
  textQuery: string,
  options: { limit?: number; radiusMeters?: number } = {},
): Promise<MeetingPointPlace[]> {
  const q = textQuery.trim();
  if (q.length < 2) return [];

  const limit = Math.min(8, Math.max(1, options.limit ?? 6));
  const circle: GeoCircle = {
    latitude: BRATISLAVA_CENTER.latitude,
    longitude: BRATISLAVA_CENTER.longitude,
    radiusMeters: options.radiusMeters ?? 18_000,
  };

  const key = getGoogleMapsApiKey();
  const res = await fetch(PLACES_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: q,
      languageCode: 'sk',
      regionCode: 'SK',
      maxResultCount: Math.min(20, limit + 4),
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

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Places meeting-point search HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as PlacesSearchResponse;
  const out: MeetingPointPlace[] = [];
  const seen = new Set<string>();

  for (const place of json.places ?? []) {
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    const name = place.displayName?.text?.trim();
    const id = place.id?.trim();
    if (lat == null || lng == null || !name || !id) continue;
    const address = place.formattedAddress?.trim() || null;
    if (!isInBratislavaArea(lat, lng, address)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id: id.startsWith('places/') ? id : `places/${id}`,
      name: name.slice(0, 160),
      address,
      lat,
      lng,
      primaryType: place.primaryType ?? null,
    });
    if (out.length >= limit) break;
  }

  return out;
}

/** Fetch Google Static Maps PNG for a Bratislava pin (server-side only). */
export async function fetchMeetingPointStaticMap(input: {
  lat: number;
  lng: number;
  width?: number;
  height?: number;
  zoom?: number;
}): Promise<{ bytes: Buffer; contentType: string }> {
  const key = getGoogleMapsApiKey();
  const w = Math.min(640, Math.max(200, input.width ?? 400));
  const h = Math.min(640, Math.max(120, input.height ?? 180));
  const zoom = Math.min(18, Math.max(10, input.zoom ?? 14));
  const marker = `color:0xFF5722|${input.lat},${input.lng}`;
  const url = new URL('https://maps.googleapis.com/maps/api/staticmap');
  url.searchParams.set('center', `${input.lat},${input.lng}`);
  url.searchParams.set('zoom', String(zoom));
  url.searchParams.set('size', `${w}x${h}`);
  url.searchParams.set('scale', '2');
  url.searchParams.set('maptype', 'roadmap');
  url.searchParams.set('markers', marker);
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Static Maps HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const ab = await res.arrayBuffer();
  return {
    bytes: Buffer.from(ab),
    contentType: res.headers.get('content-type') || 'image/png',
  };
}

export interface ReverseGeocodeResult {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
}

interface GeocodeResponse {
  status?: string;
  results?: Array<{
    formatted_address?: string;
    address_components?: Array<{
      long_name?: string;
      short_name?: string;
      types?: string[];
    }>;
    geometry?: { location?: { lat?: number; lng?: number } };
  }>;
  error_message?: string;
}

function pickPlaceLabel(result: NonNullable<GeocodeResponse['results']>[number]): string {
  const components = result.address_components ?? [];
  const byType = (type: string) =>
    components.find((c) => c.types?.includes(type))?.long_name?.trim() || null;

  const landmark =
    byType('point_of_interest') ||
    byType('establishment') ||
    byType('premise') ||
    byType('natural_feature') ||
    byType('park');
  if (landmark) return landmark.slice(0, 160);

  const route = byType('route');
  const streetNumber = byType('street_number');
  if (route && streetNumber) return `${route} ${streetNumber}`.slice(0, 160);
  if (route) return route.slice(0, 160);

  const neighborhood = byType('neighborhood') || byType('sublocality') || byType('locality');
  if (neighborhood) return neighborhood.slice(0, 160);

  const formatted = result.formatted_address?.trim();
  if (formatted) {
    // Drop trailing country for shorter lobby titles.
    return formatted.replace(/,\s*Slovakia\s*$/i, '').replace(/,\s*Slovensko\s*$/i, '').slice(0, 160);
  }
  return 'Miesto na mape';
}

/** Reverse-geocode a Bratislava pin into a short display name + address. */
export async function reverseGeocodeMeetingPoint(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Invalid lat/lng');
  }

  const key = getGoogleMapsApiKey();
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${lat},${lng}`);
  url.searchParams.set('language', 'sk');
  url.searchParams.set('region', 'sk');
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Geocoding HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as GeocodeResponse;
  if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(json.error_message || `Geocoding status ${json.status}`);
  }

  const first = json.results?.[0];
  if (!first) {
    return {
      name: 'Miesto na mape',
      address: null,
      lat,
      lng,
    };
  }

  return {
    name: pickPlaceLabel(first),
    address: first.formatted_address?.trim() || null,
    lat,
    lng,
  };
}
