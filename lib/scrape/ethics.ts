/**
 * Ethical aggregator policy for Bratislava venue scrapers.
 *
 * SportSync is a discovery redirector — we never sell tickets for scraped events,
 * never copy venue photography, and always send users to the organizer's site.
 */
export const SCRAPE_ETHICS = {
  /** Identify ourselves; venues can block this UA if they wish. */
  userAgent:
    'Mozilla/5.0 (compatible; SportSyncBot/1.0; +https://sportsync.app; event-aggregator)',
  /** Min/max pause between requests to the same host (ms). */
  hostDelayMs: { min: 2200, max: 3000 } as const,
  /** Never persist third-party img / og:image / logos. */
  allowThirdPartyMedia: false,
  /**
   * Aggregated rows are listing + deep-link only.
   * In-app registration must refuse and return source_url / ticket_url.
   */
  isAggregatedRedirector: true,
  /** Attribution shown on event pages. */
  attributionPrefix: 'Zdroj',
} as const;

/** Short SK blurb appended to scraped descriptions (factual listing notice). */
export function aggregatorNotice(sourceName: string, sourceUrl?: string | null): string {
  const link = sourceUrl?.trim() ? ` ${sourceUrl.trim()}` : '';
  return (
    `SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora` +
    ` (${sourceName}).${link}`
  );
}

/**
 * Covers we may keep on scraped rows: SportSync Cover Factory storage or
 * our Unsplash sport plates. Never keep venue CDN / og:image / Predpredaj media.
 */
export function isAllowedScrapedCoverUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const value = url.trim().toLowerCase();
  if (value.includes('/storage/v1/object/public/event-covers/')) return true;
  if (value.includes('images.unsplash.com/')) return true;
  return false;
}
