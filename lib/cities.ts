/**
 * Bratislava city + borough (mestská časť) anchors for feed location filters.
 * Centroids are approximate public centroids — good enough for ~3–5 km “in this
 * borough” discovery without a geocoding API.
 */

import { distanceKm } from '@/lib/geo';
import { locationKeywordAppearsIn } from '@/lib/scrape/bratislava-location';

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
      'mladá garda',
      'mlada garda',
      'stará ivanská',
      'stara ivanska',
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
    keywords: ['dúbravka', 'dubravka'],
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
      'pekná cesta',
      'pekna cesta',
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

/** Closest Bratislava borough centroid to a GPS fix (Haversine). */
export function nearestBratislavaDistrict(
  latitude: number,
  longitude: number,
): DistrictOption & { distanceKm: number } {
  let best = BRATISLAVA_DISTRICTS[0]!;
  let bestKm = distanceKm(latitude, longitude, best.latitude, best.longitude);
  for (let i = 1; i < BRATISLAVA_DISTRICTS.length; i++) {
    const district = BRATISLAVA_DISTRICTS[i]!;
    const km = distanceKm(latitude, longitude, district.latitude, district.longitude);
    if (km < bestKm) {
      best = district;
      bestKm = km;
    }
  }
  return { ...best, distanceKm: Math.round(bestKm * 10) / 10 };
}

export function isBratislavaCity(city: string | null | undefined): boolean {
  return Boolean(city && city.toLowerCase().includes('bratislav'));
}

/**
 * Other Slovak (and nearby) cities in a listing title.
 * Scrapers often pin those rows to an NTC Bratislava venue — the title is the
 * real location. SportSync feeds are Bratislava-only for now.
 */
const OUTSIDE_BRATISLAVA_PLACE =
  /europa\s*bc|bansk(?:ej|á|ou|a)\s+bystric|slovensk(?:ej|á|ou|a)\s+[ľl]up[čc]|humenn|ko[sš]ic(?:e|iach|iam)?|pre[sš]ov|[žz]ilin|poprad|pie[sš][tť]an|tren[cč][ií]n|star(?:á|ej|ou|a)\s+tur[aá]|zvolen|prievidz|bardejov|michalov|kom[aá]rn|levic(?!\s+bratislav)|pov[aá]žsk(?:ej|á|a)\s+bystric|liptovsk|ru[zž]omberok|v\s+nitre|\bnitre\b|v\s+trnave|\btrnave\b|v\s+martine|dubn[ií]kom|beckov|soblahov/i;

export function titleIsOutsideBratislava(title: string | null | undefined): boolean {
  if (!title) return false;
  const t = title.toLowerCase();
  // Explicit Bratislava wins only when no other city is named in the same string.
  if (/bratislav/.test(t)) {
    const withoutBa = t.replace(/bratislav\w*/gi, ' ');
    return OUTSIDE_BRATISLAVA_PLACE.test(withoutBa);
  }
  return OUTSIDE_BRATISLAVA_PLACE.test(t);
}

/** Join title / city / location / description — reject if any part names another city. */
export function listingIsOutsideBratislava(
  ...parts: Array<string | null | undefined>
): boolean {
  const text = parts.filter(Boolean).join(' · ');
  return titleIsOutsideBratislava(text);
}

/**
 * Look around the event title in page text (date + city often sit on the same line:
 * "365 Grand Prix 2026, 24.-25.10.2026, Košice").
 * Prefer the same line as the title so a prior Košice line does not poison a BA row.
 */
export function pageContextIsOutsideBratislava(
  pageText: string | null | undefined,
  title: string | null | undefined,
): boolean {
  if (!pageText || !title) return false;
  const fold = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  const needle = fold(title).slice(0, 48);
  if (needle.length < 4) return false;

  for (const rawLine of pageText.split(/\r?\n+/)) {
    const line = fold(rawLine);
    if (!line.includes(needle)) continue;
    return titleIsOutsideBratislava(rawLine);
  }

  // Fallback: tight window mostly AFTER the title match.
  const hay = fold(pageText);
  const idx = hay.indexOf(needle);
  if (idx < 0) return false;
  const window = hay.slice(idx, idx + needle.length + 80);
  return titleIsOutsideBratislava(window);
}

export function parseFeedArea(raw: string | null | undefined): FeedAreaId {
  const selection = parseFeedAreaSelection(raw);
  if (selection.mode === 'districts') return selection.districtIds[0] as FeedAreaId;
  return selection.mode;
}

/** Parsed ?area= — supports near_me, bratislava, or one/more mestské časti (comma-separated). */
export type FeedAreaSelection =
  | { mode: 'near_me' }
  | { mode: 'bratislava' }
  | { mode: 'districts'; districtIds: string[] };

export function parseFeedAreaSelection(raw: string | null | undefined): FeedAreaSelection {
  if (!raw) return { mode: 'bratislava' };
  const key = raw.toLowerCase().trim();
  if (!key) return { mode: 'bratislava' };
  if (key === 'near_me' || key === 'nearby' || key === 'near-me') return { mode: 'near_me' };
  if (key === 'bratislava' || key === 'all' || key === 'city') return { mode: 'bratislava' };

  const parts = key
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const districtIds = [
    ...new Set(parts.filter((part) => Boolean(findDistrictById(part)))),
  ];
  if (districtIds.length > 0) return { mode: 'districts', districtIds };
  return { mode: 'bratislava' };
}

/** URL / storage value for an area selection (`null` = whole Bratislava default). */
export function serializeFeedAreaSelection(selection: FeedAreaSelection): string | null {
  if (selection.mode === 'bratislava') return null;
  if (selection.mode === 'near_me') return 'near_me';
  return selection.districtIds.join(',');
}

export function feedAreaLabel(area: FeedAreaId): string {
  if (area === 'near_me') return 'Near me';
  if (area === 'bratislava') return 'Bratislava';
  return findDistrictById(area)?.name ?? 'Bratislava';
}

export function feedAreaSelectionLabel(selection: FeedAreaSelection): string {
  if (selection.mode === 'near_me') return 'Near me';
  if (selection.mode === 'bratislava') return 'Bratislava';
  const names = selection.districtIds
    .map((id) => findDistrictById(id)?.name)
    .filter((name): name is string => Boolean(name));
  if (names.length === 0) return 'Bratislava';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} + ${names[1]}`;
  return `${names[0]} +${names.length - 1}`;
}

export interface ResolvedFeedLocation {
  area: FeedAreaId;
  /** Selected borough ids when filtering by mestské časti (one or more). */
  districtIds: string[];
  label: string;
  lat: number;
  lng: number;
  radiusKm: number;
  /** Prefer city-wide listing (all Bratislava events) over strict geo radius. */
  useCityFeed: boolean;
  allowExtended: boolean;
}

function bratislavaCityLocation(): ResolvedFeedLocation {
  const ba = findCityByName('Bratislava')!;
  return {
    area: 'bratislava',
    districtIds: [],
    label: 'Bratislava',
    lat: ba.latitude,
    lng: ba.longitude,
    radiusKm: BRATISLAVA_CITY_RADIUS_KM,
    useCityFeed: true,
    allowExtended: false,
  };
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
  const selection = parseFeedAreaSelection(input.areaRaw);

  if (selection.mode === 'near_me') {
    const hasGps =
      input.profileLat != null &&
      input.profileLng != null &&
      Number.isFinite(input.profileLat) &&
      Number.isFinite(input.profileLng);
    if (hasGps) {
      return {
        area: 'near_me',
        districtIds: [],
        label: 'Near me',
        lat: input.profileLat as number,
        lng: input.profileLng as number,
        radiusKm: 20,
        useCityFeed: false,
        allowExtended: true,
      };
    }
    // No GPS — fall back to whole Bratislava rather than failing.
    return bratislavaCityLocation();
  }

  if (selection.mode === 'districts') {
    const districts = selection.districtIds
      .map((id) => findDistrictById(id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d));
    if (districts.length === 0) return bratislavaCityLocation();

    const lat = districts.reduce((sum, d) => sum + d.latitude, 0) / districts.length;
    const lng = districts.reduce((sum, d) => sum + d.longitude, 0) / districts.length;
    const radiusKm = Math.max(
      ...districts.map((d) => {
        const centerDist = distanceKm(lat, lng, d.latitude, d.longitude);
        return centerDist + d.radiusKm;
      }),
    );

    return {
      area: districts[0]!.id as FeedAreaId,
      districtIds: districts.map((d) => d.id),
      label: feedAreaSelectionLabel(selection),
      lat,
      lng,
      radiusKm,
      useCityFeed: false,
      allowExtended: false,
    };
  }

  return bratislavaCityLocation();
}

/** Soft address match when a venue/event has no coordinates. */
export function matchesDistrictText(
  districtId: string,
  ...parts: Array<string | null | undefined>
): boolean {
  const district = findDistrictById(districtId);
  if (!district) return true;
  const hay = parts.filter(Boolean).join(' ');
  if (!hay.trim()) return false;
  return district.keywords.some((k) => locationKeywordAppearsIn(hay, k));
}

export interface FeedAreaMatchInput {
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  /** Event/tournament title — used to reject out-of-city listings. */
  title?: string | null;
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

  if (location.area === 'bratislava' && location.districtIds.length === 0) {
    if (titleIsOutsideBratislava(item.title)) return false;
    if (isBratislavaCity(item.city) || text.includes('bratislav')) return true;
    if (item.lat != null && item.lng != null) {
      return distanceKm(location.lat, location.lng, item.lat, item.lng) <= BRATISLAVA_CITY_RADIUS_KM;
    }
    // Scraped / official rows often lack GPS — keep them in the city feed.
    return !item.city || item.city.trim() === '';
  }

  if (location.area === 'near_me') {
    if (titleIsOutsideBratislava(item.title)) return false;
    if (item.lat != null && item.lng != null) {
      return distanceKm(location.lat, location.lng, item.lat, item.lng) <= location.radiusKm;
    }
    // No coords — keep Bratislava / unknown-city items so scraped events still show.
    return !item.city || item.city.trim() === '' || isBratislavaCity(item.city) || text.includes('bratislav');
  }

  const districtIds =
    location.districtIds.length > 0
      ? location.districtIds
      : location.area !== 'near_me' && location.area !== 'bratislava'
        ? [location.area]
        : [];

  if (districtIds.length === 0) return true;

  return districtIds.some((districtId) => {
    const district = findDistrictById(districtId);
    if (!district) return false;
    const keywordHit = matchesDistrictText(districtId, item.city, ...(item.textParts ?? []));
    if (item.lat != null && item.lng != null) {
      const inRadius =
        distanceKm(district.latitude, district.longitude, item.lat, item.lng) <= district.radiusKm;
      return inRadius || keywordHit;
    }
    return keywordHit;
  });
}
