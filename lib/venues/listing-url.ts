/** Normalize listing URLs so http/https and www do not split the same venue page. */

export function listingHost(url: string): string {
  try {
    return new URL(url.trim()).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

export function listingPath(url: string): string {
  try {
    return (new URL(url.trim()).pathname.replace(/\/+$/, '') || '').toLowerCase();
  } catch {
    return '';
  }
}

/** Host + path without protocol/www/trailing slash. */
export function listingUrlKey(url: string): string {
  const host = listingHost(url);
  const path = listingPath(url);
  if (!host) {
    return url
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');
  }
  return path ? `${host}${path}` : host;
}

const GENERIC_SCRAPER_LABEL =
  /^(web\s*\(gemini\)|oficiálny web športoviska|fitness|športovisko)$/i;

export function isGenericScraperLabel(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return true;
  return GENERIC_SCRAPER_LABEL.test(trimmed);
}

/** Venue headline for feed cards — never a scraper brand like "Web (Gemini)". */
export function displayVenueName(
  venueName: string | null | undefined,
  fallback = 'Športovisko',
): string {
  const trimmed = venueName?.trim() ?? '';
  if (trimmed && !isGenericScraperLabel(trimmed)) return trimmed;
  return fallback;
}
