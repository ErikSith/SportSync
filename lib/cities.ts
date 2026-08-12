/**
 * Bratislava city + borough (mestská časť) anchors for feed location filters.
 * Centroids are approximate public centroids — good enough for ~3–5 km “in this
 * borough” discovery without a geocoding API.
 */

import { distanceKm } from '@/lib/geo';

export interface CityOption {
  name: string;
  latitude: number;
  longitude: number;
}

export interface DistrictOption {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Discovery radius around the district centroid. */
  radiusKm: number;
  /** Address / name keywords used when coords are missing. */
  keywords: string[];
}

/** Manual city fallback when GPS is denied. */
export const SUPPORTED_CITIES: CityOption[] = [
  { name: 'Bratislava', latitude: 48.1486, longitude: 17.1077 },
  { name: 'Košice', latitude: 48.7164, longitude: 21.2611 },
  { name: 'Žilina', latitude: 49.2231, longitude: 18.7394 },
  { name: 'Nitra', latitude: 48.3061, longitude: 18.0764 },
  { name: 'Banská Bystrica', latitude: 48.7395, longitude: 19.1535 },
  { name: 'Trnava', latitude: 48.3774, longitude: 17.5883 },
  { name: 'Prešov', latitude: 48.9986, longitude: 21.2339 },
  { name: 'Senec', latitude: 48.219, longitude: 17.4 },
];

/** Official Bratislava boroughs (mestské časti) used in the area filter. */
export const BRATISLAVA_DISTRICTS: DistrictOption[] = [
  {
    id: 'stare-mesto',
    name: 'Staré Mesto',
    latitude: 48.1439,
    longitude: 17.1097,
    radiusKm: 3.5,
    keywords: [
      'staré mesto',
      'stare mesto',
      'centrum',
      'eurovea',
      'pribinova',
      'hodžovo',
      'hodzovo',
      'grassalkovich',
      'nivy',
      'mlynské nivy',
      'mlynske nivy',
      'gorkého',
      'gorkeho',
      'sky park',
    ],
  },
  {
    id: 'ruzinov',
    name: 'Ružinov',
    latitude: 48.1525,
    longitude: 17.152,
    radiusKm: 4.5,
    keywords: [
      'ružinov',
      'ruzinov',
      'drieňová',
      'drienova',
      'nevädzová',
      'nevadzova',
      'ostredky',
      'štrkovec',
      'strkovec',
      'bajkalská',
      'bajkalska',
      'tomášikova',
      'tomasikova',
      'fitcamp',
    ],
  },
  {
    id: 'nove-mesto',
    name: 'Nové Mesto',
    latitude: 48.1695,
    longitude: 17.1385,
    radiusKm: 4,
    keywords: [
      'nové mesto',
      'nove mesto',
      'trnavská',
      'trnavska',
      'pasienky',
      'junácka',
      'junacka',
      'odbojárov',
      'odbojarov',
      'teheln',
      'tegelhoff',
      'národné tenisové',
      'narodne tenisove',
      'ntc',
      'tipos aréna',
      'tipos arena',
      'gopass aréna',
      'gopass arena',
    ],
  },
  {
    id: 'petrzalka',
    name: 'Petržalka',
    latitude: 48.1255,
    longitude: 17.11,
    radiusKm: 5,
    keywords: [
      'petržalka',
      'petrzalka',
      'farského',
      'farskeho',
      'háje',
      'haje',
      'luitgarda',
      'májová',
      'majova',
      'ašk inter',
      'ask inter',
      'draždiak',
      'drazdiak',
      'ovsište',
      'ovsisste',
      'lúky',
      'luky',
      'wakelake',
      'topliga',
    ],
  },
  {
    id: 'karlova-ves',
    name: 'Karlova Ves',
    latitude: 48.1565,
    longitude: 17.0535,
    radiusKm: 3.5,
    keywords: [
      'karlova ves',
      'dlhé diely',
      'dlhe diely',
      'botanická',
      'botanicka',
      'vodárenská',
      'vodarenska',
    ],
  },
  {
    id: 'dubravka',
    name: 'Dúbravka',
    latitude: 48.1865,
    longitude: 17.0385,
    radiusKm: 3.5,
    keywords: ['dúbravka', 'dubravka', 'pekná cesta', 'pekna cesta'],
  },
  {
    id: 'lamac',
    name: 'Lamač',
    latitude: 48.1955,
    longitude: 17.0485,
    radiusKm: 3,
    keywords: ['lamač', 'lamac', 'karpatyrun', 'runfest'],
  },
  {
    id: 'raca',
    name: 'Rača',
    latitude: 48.2055,
    longitude: 17.1455,
    radiusKm: 4.5,
    keywords: [
      'rača',
      'raca',
      'na pántoch',
      'na pantoch',
      'černockého',
      'cernockeho',
      'tbilisk',
      'račianska',
      'racianska',
      'aurial',
    ],
  },
  {
    id: 'vajnory',
    name: 'Vajnory',
    latitude: 48.205,
    longitude: 17.2,
    radiusKm: 4,
    keywords: ['vajnory', 'hangair', 'zlaté piesky', 'zlate piesky', 'cesta na senec'],
  },
  {
    id: 'devin',
    name: 'Devín',
    latitude: 48.1739,
    longitude: 16.9783,
    radiusKm: 3,
    keywords: ['devín', 'devin', 'devínsky hrad', 'devinsky hrad'],
  },
  {
    id: 'devinska-nova-ves',
    name: 'Devínska Nová Ves',
    latitude: 48.2085,
    longitude: 16.9785,
    radiusKm: 4,
    keywords: ['devínska nová ves', 'devinska nova ves', 'devínska', 'devinska', 'eisberg'],
  },
  {
    id: 'zahorska-bystrica',
    name: 'Záhorská Bystrica',
    latitude: 48.2375,
    longitude: 17.0415,
    radiusKm: 3.5,
    keywords: ['záhorská bystrica', 'zahorska bystrica', 'záhorská', 'zahorska'],
  },
  {
    id: 'podunajske-biskupice',
    name: 'Podunajské Biskupice',
    latitude: 48.1255,
    longitude: 17.2055,
    radiusKm: 3.5,
    keywords: ['podunajské', 'podunajske', 'biskupice'],
  },
  {
    id: 'vrakuna',
    name: 'Vrakuňa',
    latitude: 48.1385,
    longitude: 17.18,
    radiusKm: 3.5,
    keywords: ['vrakuňa', 'vrakuna'],
  },
  {
    id: 'jarovce',
    name: 'Jarovce',
    latitude: 48.0655,
    longitude: 17.1145,
    radiusKm: 3,
    keywords: ['jarovce'],
  },
  {
    id: 'rusovce',
    name: 'Rusovce',
    latitude: 48.0545,
    longitude: 17.1485,
    radiusKm: 3,
    keywords: ['rusovce'],
  },
  {
    id: 'cunovo',
    name: 'Čunovo',
    latitude: 48.0297,
    longitude: 17.1897,
    radiusKm: 3.5,
    keywords: ['čunovo', 'cunovo', 'divoká voda', 'divoka voda'],
  },
];

export const BRATISLAVA_CITY_RADIUS_KM = 16;

export type FeedAreaId = 'near_me' | 'bratislava' | (typeof BRATISLAVA_DISTRICTS)[number]['id'];

export function findCityByName(name: string): CityOption | undefined {
  return SUPPORTED_CITIES.find((city) => city.name.toLowerCase() === name.toLowerCase());
}

export function findDistrictById(id: string): DistrictOption | undefined {
  return BRATISLAVA_DISTRICTS.find((d) => d.id === id);
}

export function isBratislavaCity(city: string | null | undefined): boolean {
  return Boolean(city && city.toLowerCase().includes('bratislav'));
}

export function parseFeedArea(raw: string | null | undefined): FeedAreaId {
  if (!raw) return 'bratislava';
  const key = raw.toLowerCase().trim();
  if (key === 'near_me' || key === 'nearby' || key === 'near-me') return 'near_me';
  if (key === 'bratislava' || key === 'all' || key === 'city') return 'bratislava';
  if (findDistrictById(key)) return key as FeedAreaId;
  return 'bratislava';
}

export function feedAreaLabel(area: FeedAreaId): string {
  if (area === 'near_me') return 'Near me';
  if (area === 'bratislava') return 'Bratislava';
  return findDistrictById(area)?.name ?? 'Bratislava';
}

export interface ResolvedFeedLocation {
  area: FeedAreaId;
  label: string;
  lat: number;
  lng: number;
  radiusKm: number;
  /** Prefer city-wide listing (all Bratislava events) over strict geo radius. */
  useCityFeed: boolean;
  allowExtended: boolean;
}

/**
 * Resolve lat/lng + radius for Events / Venues / Tournaments feeds from the
 * ?area= query param and the signed-in profile.
 */
export function resolveFeedLocation(input: {
  areaRaw?: string | null;
  profileCity?: string | null;
  profileLat?: number | null;
  profileLng?: number | null;
}): ResolvedFeedLocation {
  const area = parseFeedArea(input.areaRaw);
  const ba = findCityByName('Bratislava')!;

  if (area === 'near_me') {
    const hasGps =
      input.profileLat != null &&
      input.profileLng != null &&
      Number.isFinite(input.profileLat) &&
      Number.isFinite(input.profileLng);
    if (hasGps) {
      return {
        area,
        label: 'Near me',
        lat: input.profileLat as number,
        lng: input.profileLng as number,
        radiusKm: 20,
        useCityFeed: false,
        allowExtended: true,
      };
    }
    // No GPS — fall back to whole Bratislava rather than failing.
    return {
      area: 'bratislava',
      label: 'Bratislava',
      lat: ba.latitude,
      lng: ba.longitude,
      radiusKm: BRATISLAVA_CITY_RADIUS_KM,
      useCityFeed: true,
      allowExtended: false,
    };
  }

  if (area !== 'bratislava') {
    const district = findDistrictById(area);
    if (district) {
      return {
        area,
        label: district.name,
        lat: district.latitude,
        lng: district.longitude,
        radiusKm: district.radiusKm,
        useCityFeed: false,
        allowExtended: false,
      };
    }
  }

  return {
    area: 'bratislava',
    label: 'Bratislava',
    lat: ba.latitude,
    lng: ba.longitude,
    radiusKm: BRATISLAVA_CITY_RADIUS_KM,
    useCityFeed: true,
    allowExtended: false,
  };
}

/** Soft address match when a venue/event has no coordinates. */
export function matchesDistrictText(
  districtId: string,
  ...parts: Array<string | null | undefined>
): boolean {
  const district = findDistrictById(districtId);
  if (!district) return true;
  const hay = parts.filter(Boolean).join(' ').toLowerCase();
  if (!hay) return false;
  return district.keywords.some((k) => hay.includes(k));
}

export interface FeedAreaMatchInput {
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  /** Venue name, address, title, etc. */
  textParts?: Array<string | null | undefined>;
}

/**
 * Unified area filter for events / venues / tournaments.
 * Districts match by geo radius OR address/name keywords (coords often missing).
 */
export function matchesFeedArea(
  location: ResolvedFeedLocation,
  item: FeedAreaMatchInput,
): boolean {
  const text = [item.city, ...(item.textParts ?? [])].filter(Boolean).join(' ').toLowerCase();

  if (location.area === 'bratislava') {
    if (isBratislavaCity(item.city) || text.includes('bratislav')) return true;
    if (item.lat != null && item.lng != null) {
      return distanceKm(location.lat, location.lng, item.lat, item.lng) <= BRATISLAVA_CITY_RADIUS_KM;
    }
    // Scraped / official rows often lack GPS — keep them in the city feed.
    return !item.city || item.city.trim() === '';
  }

  if (location.area === 'near_me') {
    if (item.lat != null && item.lng != null) {
      return distanceKm(location.lat, location.lng, item.lat, item.lng) <= location.radiusKm;
    }
    // No coords — keep Bratislava / unknown-city items so scraped events still show.
    return !item.city || item.city.trim() === '' || isBratislavaCity(item.city) || text.includes('bratislav');
  }

  const district = findDistrictById(location.area);
  if (!district) return true;

  const keywordHit = matchesDistrictText(location.area, item.city, ...(item.textParts ?? []));
  if (item.lat != null && item.lng != null) {
    const inRadius =
      distanceKm(district.latitude, district.longitude, item.lat, item.lng) <= district.radiusKm;
    return inRadius || keywordHit;
  }
  return keywordHit;
}
