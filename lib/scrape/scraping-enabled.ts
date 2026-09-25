/**
 * Master kill switch for venue HTML/API scrapers.
 *
 * Default: OFF — venues create listings themselves via /manage.
 * Re-enable only with SCRAPING_ENABLED=1 (or true/yes/on).
 */
export function isScrapingEnabled(): boolean {
  const raw = (process.env.SCRAPING_ENABLED ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}
