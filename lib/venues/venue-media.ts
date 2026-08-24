/**
 * Venue media: facility / architecture photos + brand logos.
 * Prefer empty courts, stadium exteriors, and club marks — not athlete portraits.
 */

/** Empty courts / stadium architecture (no people focus). */
const FACILITY_BY_SPORT: Record<string, string> = {
  TENNIS:
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=80', // outdoor tennis courts
  PADEL:
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=900&q=80', // padel court glass
  FOOTBALL:
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&q=80', // stadium stands
  BASKETBALL:
    'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=900&q=80', // empty indoor court
  HOCKEY:
    'https://images.unsplash.com/photo-1515704075292-ae9452303047?w=900&q=80', // ice rink empty
  FITNESS:
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80', // empty gym floor
  RUNNING:
    'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=900&q=80', // athletic track
  SWIMMING:
    'https://images.unsplash.com/photo-1576610616656-d3aa5d1f4531?w=900&q=80', // empty pool lanes
  HANDBALL:
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80', // indoor arena
  VOLLEYBALL:
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=900&q=80', // indoor court
  SQUASH:
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=80',
  GOLF:
    'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=900&q=80', // course landscape
  CYCLING:
    'https://images.unsplash.com/photo-1517649763962-0c62306601b7?w=900&q=80',
  OTHER:
    'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=80', // modern building
};

const DEFAULT_FACILITY =
  'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&q=80';

/** Named Slovak venues → facility exterior / court photos. */
const VENUE_COVER_BY_NAME: Array<{ match: RegExp; cover: string }> = [
  {
    match: /teheln|n[aá]rodn[yý]\s+futbal/i,
    cover: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&q=80',
  },
  {
    match: /tipos|nepel|zimn/i,
    cover: 'https://images.unsplash.com/photo-1515704075292-ae9452303047?w=900&q=80',
  },
  {
    match: /gopass|go\s*pass/i,
    cover: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=900&q=80',
  },
  {
    match: /form\s*factory|fitcamp/i,
    cover: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80',
  },
  {
    match: /aurial|arena\s*padel|padel/i,
    cover: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=900&q=80',
  },
  {
    match: /ntc|n[aá]rodn[eé]\s+tenis|stz/i,
    cover: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=80',
  },
  {
    match: /eurovea|dunaj/i,
    cover: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=900&q=80', // waterfront plaza
  },
  {
    match: /grassalkovich/i,
    cover: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=900&q=80', // garden grounds
  },
  {
    match: /plav[aá]re[nň]|pasienky/i,
    cover: 'https://images.unsplash.com/photo-1576610616656-d3aa5d1f4531?w=900&q=80',
  },
  {
    match: /apex\s*elite/i,
    cover: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=900&q=80', // sports club interior
  },
  {
    match: /subdeck/i,
    cover: 'https://images.unsplash.com/photo-1566417713940-ae1153c1c0c2?w=900&q=80', // club venue exterior vibe
  },
];

/** Brand mark by website host or venue name. */
const LOGO_BY_HOST: Record<string, string> = {
  'aurialpadel.sk': 'https://www.google.com/s2/favicons?domain=aurialpadel.sk&sz=128',
  'arenapadel.sk': 'https://www.google.com/s2/favicons?domain=arenapadel.sk&sz=128',
  'gopassarena.sk': 'https://www.google.com/s2/favicons?domain=gopassarena.sk&sz=128',
  'stz.sk': 'https://www.google.com/s2/favicons?domain=stz.sk&sz=128',
  'skslovan.com': 'https://www.google.com/s2/favicons?domain=skslovan.com&sz=128',
  'hcslovan.sk': 'https://www.google.com/s2/favicons?domain=hcslovan.sk&sz=128',
  'citylife.sk': 'https://www.google.com/s2/favicons?domain=citylife.sk&sz=128',
  'subdeck.sk': 'https://www.google.com/s2/favicons?domain=subdeck.sk&sz=128',
  'predpredaj.zoznam.sk': 'https://www.google.com/s2/favicons?domain=predpredaj.zoznam.sk&sz=128',
};

function hostFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function resolveVenueCover(input: {
  name: string;
  sports?: string[];
  coverUrl?: string | null;
}): string {
  const stored =
    input.coverUrl && /formfactory|form-factory|form\s*factory/i.test(input.coverUrl)
      ? null
      : input.coverUrl;
  if (stored) return stored;
  for (const entry of VENUE_COVER_BY_NAME) {
    if (entry.match.test(input.name)) return entry.cover;
  }
  const primary = input.sports?.[0]?.toUpperCase();
  if (primary && FACILITY_BY_SPORT[primary]) return FACILITY_BY_SPORT[primary];
  return DEFAULT_FACILITY;
}

/** Atmosphere tabs: prefer event cover, else a sport-readable facility photo. */
export function resolveSportAtmosphereCover(
  sport: string | null | undefined,
  coverUrl?: string | null,
): string {
  if (coverUrl) return coverUrl;
  const key = sport?.toUpperCase();
  if (key && FACILITY_BY_SPORT[key]) return FACILITY_BY_SPORT[key];
  return FACILITY_BY_SPORT.OTHER ?? DEFAULT_FACILITY;
}

export function resolveVenueLogo(input: {
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
}): string | null {
  if (input.logoUrl && /formfactory|form-factory/i.test(input.logoUrl)) {
    return null;
  }
  if (input.logoUrl) return input.logoUrl;
  const host = hostFromUrl(input.websiteUrl);
  if (host && /formfactory/i.test(host)) return null;
  if (host && LOGO_BY_HOST[host]) return LOGO_BY_HOST[host];
  if (host) return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  // Name-based fallbacks when website missing
  if (/form\s*factory|fitcamp/i.test(input.name)) return null;
  if (/aurial|arena\s*padel/i.test(input.name)) return LOGO_BY_HOST['aurialpadel.sk'] ?? null;
  if (/gopass/i.test(input.name)) return LOGO_BY_HOST['gopassarena.sk'] ?? null;
  if (/stz|ntc|n[aá]rodn[eé]\s+tenis/i.test(input.name)) return LOGO_BY_HOST['stz.sk'] ?? null;
  if (/tipos|hc\s*slovan/i.test(input.name)) return LOGO_BY_HOST['hcslovan.sk'] ?? null;
  if (/teheln|sk\s*slovan/i.test(input.name)) return LOGO_BY_HOST['skslovan.com'] ?? null;
  if (/citylife|eurovea|grassalkovich/i.test(input.name)) return LOGO_BY_HOST['citylife.sk'] ?? null;
  return null;
}
