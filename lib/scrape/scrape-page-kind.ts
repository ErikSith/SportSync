/**
 * Venue scrape-page `kind` helpers.
 *
 * One URL stays one DB row (`@@unique([url])`), but `kind` may list multiple
 * content roles as a comma-separated string, e.g. `schedule,events,tournaments`.
 * Gemini then classifies each listing (lesson vs event vs tournament).
 */

export const SCRAPE_PAGE_KINDS = [
  'website',
  'schedule',
  'availability',
  'events',
  'tournaments',
  'kids_clubs',
  'kids_camps',
  'workshops',
  'other',
] as const;

export type ScrapePageKind = (typeof SCRAPE_PAGE_KINDS)[number];

/** Canonical display / serialize order. */
const KIND_ORDER: readonly ScrapePageKind[] = SCRAPE_PAGE_KINDS;

const ALLOWED = new Set<string>(SCRAPE_PAGE_KINDS);

/** Content roles you can combine on one URL (not availability-only booking). */
export const COMBINABLE_CONTENT_KINDS = [
  'schedule',
  'events',
  'tournaments',
  'kids_clubs',
  'kids_camps',
  'workshops',
] as const;

export function parseScrapePageKinds(kind: string | null | undefined): ScrapePageKind[] {
  const raw = (kind ?? '')
    .toLowerCase()
    .split(/[,+|/\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const aliases: Record<string, ScrapePageKind> = {
    rozvrh: 'schedule',
    classes: 'schedule',
    lekcie: 'schedule',
    akcie: 'events',
    event: 'events',
    turnaje: 'tournaments',
    tournament: 'tournaments',
    kružky: 'kids_clubs',
    kruzky: 'kids_clubs',
    'kids-clubs': 'kids_clubs',
    'kids_classes': 'kids_clubs',
    'detskie-kruzky': 'kids_clubs',
    'detske-kruzky': 'kids_clubs',
    camps: 'kids_camps',
    'detsky-tabor': 'kids_camps',
    'detskie-tabory': 'kids_camps',
    workshop: 'workshops',
    workshopy: 'workshops',
    workshops: 'workshops',
    mixed: 'events', // legacy soft label → treat as multi via callers
  };

  const out: ScrapePageKind[] = [];
  const seen = new Set<string>();
  for (const token of raw) {
    const mapped = (aliases[token] ?? token) as string;
    if (!ALLOWED.has(mapped) || seen.has(mapped)) continue;
    seen.add(mapped);
    out.push(mapped as ScrapePageKind);
  }

  out.sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b));
  return out;
}

export function serializeScrapePageKinds(kinds: readonly string[]): string {
  const parsed = parseScrapePageKinds(kinds.join(','));
  return parsed.length > 0 ? parsed.join(',') : 'other';
}

/** Validate API input; returns canonical kind string or null if invalid. */
export function normalizeScrapePageKindInput(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === 'mixed') {
    return serializeScrapePageKinds(['schedule', 'events', 'tournaments']);
  }
  const kinds = parseScrapePageKinds(trimmed);
  if (kinds.length === 0) return null;
  return serializeScrapePageKinds(kinds);
}

export function scrapePageHasKind(
  kind: string | null | undefined,
  needle: string,
): boolean {
  const n = needle.toLowerCase().trim();
  return parseScrapePageKinds(kind).includes(n as ScrapePageKind);
}

/** More than one content role → AI must split per item; do not force one bucket. */
export function isMixedScrapePageKind(kind: string | null | undefined): boolean {
  const kinds = parseScrapePageKinds(kind);
  const content = kinds.filter((k) =>
    (COMBINABLE_CONTENT_KINDS as readonly string[]).includes(k),
  );
  return content.length > 1;
}

export function shouldSkipEventExtractForKind(
  kind: string | null | undefined,
): boolean {
  const kinds = parseScrapePageKinds(kind);
  return kinds.length === 1 && kinds[0] === 'availability';
}

export function shouldForceForKidsFromScrapePage(
  kind: string | null | undefined,
): boolean {
  return (
    scrapePageHasKind(kind, 'kids_camps') || scrapePageHasKind(kind, 'kids_clubs')
  );
}

export function scrapePageKindLabel(kind: string): string {
  const kinds = parseScrapePageKinds(kind);
  if (kinds.length === 0) return kind || 'other';
  if (kinds.length === 1) return kinds[0]!;
  return kinds.join(' + ');
}
