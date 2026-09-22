/**
 * Bratislava location taxonomy for scrape tagging & area filters.
 * Official hierarchy: 5 okresy (districts) → 17 mestské časti (boroughs).
 */

export type BratislavaDistrict =
  | 'Bratislava I'
  | 'Bratislava II'
  | 'Bratislava III'
  | 'Bratislava IV'
  | 'Bratislava V';

export type BratislavaBorough =
  // Bratislava I
  | 'Staré Mesto'
  // Bratislava II
  | 'Ružinov'
  | 'Vrakuňa'
  | 'Podunajské Biskupice'
  // Bratislava III
  | 'Nové Mesto'
  | 'Rača'
  | 'Vajnory'
  // Bratislava IV
  | 'Karlova Ves'
  | 'Dúbravka'
  | 'Lamač'
  | 'Devín'
  | 'Devínska Nová Ves'
  | 'Záhorská Bystrica'
  // Bratislava V
  | 'Petržalka'
  | 'Jarovce'
  | 'Rusovce'
  | 'Čunovo';

/** Feed / DB slug used on `venues.district` (matches `BRATISLAVA_DISTRICTS` ids). */
export type BratislavaBoroughSlug =
  | 'stare-mesto'
  | 'ruzinov'
  | 'vrakuna'
  | 'podunajske-biskupice'
  | 'nove-mesto'
  | 'raca'
  | 'vajnory'
  | 'karlova-ves'
  | 'dubravka'
  | 'lamac'
  | 'devin'
  | 'devinska-nova-ves'
  | 'zahorska-bystrica'
  | 'petrzalka'
  | 'jarovce'
  | 'rusovce'
  | 'cunovo';

export interface BoroughDefinition {
  borough: BratislavaBorough;
  district: BratislavaDistrict;
  slug: BratislavaBoroughSlug;
  /** Keywords for dynamic aggregator resolution (lowercase, diacritics-insensitive match). */
  keywords: string[];
}

export const BRATISLAVA_BOROUGHS: BoroughDefinition[] = [
  {
    borough: 'Staré Mesto',
    district: 'Bratislava I',
    slug: 'stare-mesto',
    keywords: [
      'stare mesto',
      'staré mesto',
      'historic centre',
      'old town',
      'nivy',
      'mlynske nivy',
      'mlynské nivy',
      'eurovea',
      'pribinova',
      'gorkeho',
      'gorkého',
      'hodzovo',
      'hodžovo',
      'grassalkovich',
      'snp namestie',
      'námestie snp',
      'hviezdoslavovo',
      'venturska',
      'obchodna',
      'obchodná',
      'kollarovo',
      'kollárovo',
      'sky park',
      'skypark',
    ],
  },
  {
    borough: 'Ružinov',
    district: 'Bratislava II',
    slug: 'ruzinov',
    keywords: [
      'ruzinov',
      'ružinov',
      'drienova',
      'drieňová',
      'nevadzova',
      'nevädzová',
      'ostredky',
      'strkovec',
      'štrkovec',
      'bajkalska',
      'bajkalská',
      'tomasikova',
      'tomášikova',
      'prievoz',
      'trnávka',
      'trnavka',
      'pošeň',
      'posen',
      'avl',
      'airport business',
    ],
  },
  {
    borough: 'Vrakuňa',
    district: 'Bratislava II',
    slug: 'vrakuna',
    keywords: ['vrakuna', 'vrakuňa'],
  },
  {
    borough: 'Podunajské Biskupice',
    district: 'Bratislava II',
    slug: 'podunajske-biskupice',
    keywords: ['podunajske', 'podunajské', 'biskupice'],
  },
  {
    borough: 'Nové Mesto',
    district: 'Bratislava III',
    slug: 'nove-mesto',
    keywords: [
      'nove mesto',
      'nové mesto',
      'pasienky',
      'trnavska',
      'trnavská',
      'junacka',
      'junácka',
      'odbojarov',
      'odbojárov',
      'tehelne pole',
      'tehelné pole',
      'tegelhoff',
      'ntc',
      'narodne tenisove',
      'národné tenisové',
      'tipos arena',
      'tipos aréna',
      'gopass arena',
      'gopass aréna',
      'k2 lezecka',
      'lezecka stena',
      'lezecká stena',
      'bnc',
      '3x3',
      'mlada garda',
      'mladá garda',
      'stara ivanska',
      'stará ivanská',
    ],
  },
  {
    borough: 'Rača',
    district: 'Bratislava III',
    slug: 'raca',
    keywords: [
      'raca',
      'rača',
      'na pantoch',
      'na pántoch',
      'cernockeho',
      'černockého',
      'tbilisk',
      'pekna cesta',
      'pekná cesta',
    ],
  },
  {
    borough: 'Vajnory',
    district: 'Bratislava III',
    slug: 'vajnory',
    keywords: [
      'vajnory',
      'hangair',
      'zlate piesky',
      'zlaté piesky',
      'cesta na senec',
    ],
  },
  {
    borough: 'Karlova Ves',
    district: 'Bratislava IV',
    slug: 'karlova-ves',
    keywords: [
      'karlova ves',
      'dlhe diely',
      'dlhé diely',
      'botanicka',
      'botanická',
      'vodarenska',
      'vodárenská',
      'molecova',
      'molecová',
    ],
  },
  {
    borough: 'Dúbravka',
    district: 'Bratislava IV',
    slug: 'dubravka',
    keywords: ['dubravka', 'dúbravka'],
  },
  {
    borough: 'Lamač',
    district: 'Bratislava IV',
    slug: 'lamac',
    keywords: ['lamac', 'lamač', 'karpatyrun', 'runfest'],
  },
  {
    borough: 'Devín',
    district: 'Bratislava IV',
    slug: 'devin',
    keywords: ['devin', 'devín', 'devinsky hrad', 'devínsky hrad'],
  },
  {
    borough: 'Devínska Nová Ves',
    district: 'Bratislava IV',
    slug: 'devinska-nova-ves',
    keywords: ['devinska nova ves', 'devínska nová ves', 'devinska', 'devínska', 'eisberg'],
  },
  {
    borough: 'Záhorská Bystrica',
    district: 'Bratislava IV',
    slug: 'zahorska-bystrica',
    keywords: ['zahorska bystrica', 'záhorská bystrica', 'zahorska', 'záhorská'],
  },
  {
    borough: 'Petržalka',
    district: 'Bratislava V',
    slug: 'petrzalka',
    keywords: [
      'petrzalka',
      'petržalka',
      'drazdiak',
      'draždiak',
      'ovsisste',
      'ovsište',
      'luky',
      'lúky',
      'farskeho',
      'farského',
      'haje',
      'háje',
      'wakelake',
      'topliga',
      'ask inter',
      'ašk inter',
      'luitgarda',
      'majova',
      'májová',
    ],
  },
  {
    borough: 'Jarovce',
    district: 'Bratislava V',
    slug: 'jarovce',
    keywords: ['jarovce'],
  },
  {
    borough: 'Rusovce',
    district: 'Bratislava V',
    slug: 'rusovce',
    keywords: ['rusovce'],
  },
  {
    borough: 'Čunovo',
    district: 'Bratislava V',
    slug: 'cunovo',
    keywords: ['cunovo', 'čunovo', 'divoka voda', 'divoká voda'],
  },
];

export const BOROUGH_BY_NAME: Record<BratislavaBorough, BoroughDefinition> = Object.fromEntries(
  BRATISLAVA_BOROUGHS.map((b) => [b.borough, b]),
) as Record<BratislavaBorough, BoroughDefinition>;

export const BOROUGH_BY_SLUG: Record<BratislavaBoroughSlug, BoroughDefinition> = Object.fromEntries(
  BRATISLAVA_BOROUGHS.map((b) => [b.slug, b]),
) as Record<BratislavaBoroughSlug, BoroughDefinition>;

export function districtForBorough(borough: BratislavaBorough): BratislavaDistrict {
  return BOROUGH_BY_NAME[borough].district;
}

export function boroughToSlug(borough: BratislavaBorough): BratislavaBoroughSlug {
  return BOROUGH_BY_NAME[borough].slug;
}

export function slugToBorough(slug: string): BratislavaBorough | null {
  return BOROUGH_BY_SLUG[slug as BratislavaBoroughSlug]?.borough ?? null;
}

/** Strip diacritics + lowercase for keyword matching. */
export function normalizeLocationText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Keyword hit that does not false-match mid-word (e.g. "centrum" inside "Fitcentrum"),
 * but still allows street prefixes ("tbilisk" → "tbiliska").
 */
export function locationKeywordAppearsIn(haystack: string, keyword: string): boolean {
  const hay = normalizeLocationText(haystack);
  const needle = normalizeLocationText(keyword);
  if (!hay || !needle) return false;

  const escaped = escapeRegExp(needle);
  if (needle.includes(' ')) {
    const phrase = new RegExp(
      `(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`,
      'u',
    );
    return phrase.test(hay);
  }

  // Token must start at a non-letter boundary (not mid-word), then optional letters.
  const token = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}\\p{L}*`, 'u');
  return token.test(hay);
}

export interface ResolvedBorough {
  district: BratislavaDistrict;
  borough: BratislavaBorough;
  slug: BratislavaBoroughSlug;
}

/** Prefer address hits over name/body so venue titles cannot steal the borough. */
const ADDRESS_MATCH_BONUS = 1000;
/** Explicit mestská časť in the address (e.g. Bratislava-Rača) beats street-name collisions. */
const BOROUGH_NAME_BONUS = 5000;

/**
 * Resolve mestská časť from free-text address / listing body (aggregators).
 * Longer / more specific keywords win; address matches beat name/body matches.
 * Explicit borough names in the address beat ambiguous street keywords.
 */
export function resolveBorough(address: string, text: string): ResolvedBorough | null {
  const addressHay = normalizeLocationText(address);
  const textHay = normalizeLocationText(text);
  if (!addressHay && !textHay) return null;

  let best: { def: BoroughDefinition; score: number } | null = null;

  for (const def of BRATISLAVA_BOROUGHS) {
    // Official borough label / slug in the address always wins (Bratislava-Rača, etc.).
    if (addressHay) {
      const slugAsWords = def.slug.replace(/-/g, ' ');
      if (
        locationKeywordAppearsIn(addressHay, def.borough) ||
        locationKeywordAppearsIn(addressHay, slugAsWords) ||
        locationKeywordAppearsIn(addressHay, def.slug)
      ) {
        const score = BOROUGH_NAME_BONUS + def.borough.length;
        if (!best || score > best.score) {
          best = { def, score };
        }
        continue;
      }
    }

    for (const keyword of def.keywords) {
      const needle = normalizeLocationText(keyword);
      if (!needle) continue;

      const inAddress = addressHay ? locationKeywordAppearsIn(addressHay, needle) : false;
      const inText = !inAddress && textHay ? locationKeywordAppearsIn(textHay, needle) : false;
      if (!inAddress && !inText) continue;

      // Prefer longer keyword hits (e.g. "devinska nova ves" over "devin")
      const score = needle.length + (inAddress ? ADDRESS_MATCH_BONUS : 0);
      if (!best || score > best.score) {
        best = { def, score };
      }
    }
  }

  if (!best) return null;
  return {
    district: best.def.district,
    borough: best.def.borough,
    slug: best.def.slug,
  };
}

/** Feed / DB slug for `venues.district` from address (+ optional name). */
export function resolveVenueDistrictSlug(
  address: string | null | undefined,
  name?: string | null,
): BratislavaBoroughSlug | null {
  return resolveBorough(address ?? '', name ?? '')?.slug ?? null;
}

/**
 * Canonical extracted event shape after location tagging.
 * `requiresAiGraphic` is always true — we never persist third-party photos.
 */
export interface ParsedEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  locationName: string;
  address: string;
  district: BratislavaDistrict;
  borough: BratislavaBorough;
  price?: string;
  sourceUrl: string;
  category: string;
  requiresAiGraphic: boolean;
}
