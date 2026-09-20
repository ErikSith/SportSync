export { ScrapedEventSchema, ScrapedEventListSchema, GEMINI_SCRAPER_SOURCE } from './types';
export type {
  ScrapedEvent,
  ScrapedEventList,
  ScraperRunReport,
  ScraperUpsertStats,
  ScraperUrlResult,
  MidnightPurgeStats,
  MidnightSyncReport,
} from './types';

export {
  fetchCleanText,
  fetchHtml,
  htmlToCleanText,
  pageHasEventSignal,
  EVENT_SIGNAL_KEYWORDS,
  SCRAPER_USER_AGENT,
  HOST_DELAY_MS,
  URL_PAUSE_MS,
  MAX_HTML_BYTES,
  URL_PROCESS_TIMEOUT_MS,
  CLI_URL_PROCESS_TIMEOUT_MS,
  UrlProcessingTimeoutError,
  withUrlProcessingTimeout,
  sleep,
} from './fetcher';

export { extractEventsFromText } from './extractor';
export {
  upsertScrapedEvents,
  saveEventsForVenue,
  buildExternalId,
  canonicalizeSourceUrl,
} from './db-service';
export type { UpsertScrapedOptions } from './db-service';
export {
  runGeminiScraper,
  runMidnightSync,
  loadVenueWebsiteTargets,
  type RunScraperOptions,
  type VenueScrapeTarget,
} from './run';
export { runScraper, runScraperCli, parseScraperCliArgs, URL_GAP_MS } from './runner';
export { purgePastListings } from './purge';
export {
  resolveRegistrationTarget,
  resolveBookingUrl,
  isAggregatedListing,
  externalRegistrationPayload,
} from './registration-router';
export type {
  RegistrationListing,
  RegistrationTarget,
  ExternalRegistrationResponse,
} from './registration-router';
