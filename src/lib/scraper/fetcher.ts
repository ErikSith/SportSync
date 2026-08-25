import * as cheerio from 'cheerio';

/** Polite SportSync bot identity — venues can block this UA if they wish. */
export const SCRAPER_USER_AGENT =
  'Mozilla/5.0 (compatible; SportSyncBot/1.0; +https://sportsync.app; event-aggregator)';

/** Randomized gap between venue fetches (ms). Midnight cron: 3–5s, never burst. */
export const HOST_DELAY_MS = { min: 3000, max: 5000 } as const;

/** Hard cap on HTML bytes passed to Cheerio — prevents CPU blow-ups on huge pages. */
export const MAX_HTML_BYTES = 500_000;

/** Wall-clock limit for fetch + parse + extract of a single URL (cron safety). */
export const URL_PROCESS_TIMEOUT_MS = 10_000;

const FETCH_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;
const MAX_LOOP_ITERATIONS = 500;

const hostLastRequestAt = new Map<string, number>();

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return 'unknown';
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class UrlProcessingTimeoutError extends Error {
  readonly url: string;

  constructor(url: string, ms = URL_PROCESS_TIMEOUT_MS) {
    super(`URL processing timed out after ${ms}ms: ${url}`);
    this.name = 'UrlProcessingTimeoutError';
    this.url = url;
  }
}

/** Abort waiting after `ms`; does not cancel in-flight sync CPU work (Cheerio). */
export function withUrlProcessingTimeout<T>(
  url: string,
  fn: () => Promise<T>,
  ms = URL_PROCESS_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new UrlProcessingTimeoutError(url, ms));
    }, ms);
    fn()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function truncateHtml(rawHtml: string): string {
  if (rawHtml.length <= MAX_HTML_BYTES) return rawHtml;
  console.warn(
    `[scraper.fetcher] truncating HTML from ${rawHtml.length} to ${MAX_HTML_BYTES} bytes`,
  );
  return rawHtml.slice(0, MAX_HTML_BYTES);
}

function randomDelayMs(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

async function waitForHostSlot(host: string): Promise<void> {
  const last = hostLastRequestAt.get(host) ?? 0;
  const gap = randomDelayMs(HOST_DELAY_MS.min, HOST_DELAY_MS.max);
  const wait = last + gap - Date.now();
  if (wait > 0) await sleep(wait);
  hostLastRequestAt.set(host, Date.now());
}

/** Prefer these regions so Gemini never sees nav/footer chrome as location/time. */
const MAIN_CONTENT_SELECTORS = [
  'main',
  '[role="main"]',
  'article',
  '#content',
  '#main',
  '#main-content',
  '.main-content',
  '.entry-content',
  '.post-content',
  '.page-content',
] as const;

const MIN_MAIN_TEXT_CHARS = 40;

/**
 * Strip non-content + chrome nodes and return whitespace-normalized plain text
 * from the main content region only. Never follows images / assets.
 */
export function htmlToCleanText(html: string): string {
  const truncatedHtml = truncateHtml(html);
  const $ = cheerio.load(truncatedHtml);
  $(
    [
      'script',
      'style',
      'noscript',
      'svg',
      'iframe',
      'canvas',
      'link',
      'meta',
      'img',
      'picture',
      'source',
      'video',
      'audio',
      // Page chrome — strip before reading so body fallback stays clean
      'header',
      'footer',
      'nav',
      'aside',
      '[role="navigation"]',
      '[role="banner"]',
      '[role="contentinfo"]',
      '[role="complementary"]',
      '[role="search"]',
    ].join(', '),
  ).remove();

  let text = '';
  let selectorPasses = 0;
  for (const sel of MAIN_CONTENT_SELECTORS) {
    if (++selectorPasses > MAX_LOOP_ITERATIONS) {
      console.warn('[scraper.fetcher] selector loop safety break');
      break;
    }
    const nodes = $(sel);
    if (!nodes.length) continue;
    const candidate = nodes.first().text();
    if (candidate.trim().length >= MIN_MAIN_TEXT_CHARS) {
      text = candidate;
      break;
    }
  }

  if (!text.trim()) {
    if ($('body').length) text = $('body').text();
    else text = $.root().text();
  }

  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchHtmlOnce(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': SCRAPER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (res.status === 429 || res.status === 503) {
      const err = new Error(`HTTP ${res.status} for ${url}`) as Error & {
        retryable?: boolean;
      };
      err.retryable = true;
      throw err;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType && !/html|text|xml/i.test(contentType)) {
      throw new Error(`Unsupported content-type ${contentType} for ${url}`);
    }

    const rawHtml = await res.text();
    return truncateHtml(rawHtml);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Rate-limited HTML fetch with exponential backoff on 429 / 503 / timeouts.
 */
export async function fetchHtml(url: string): Promise<string> {
  const host = hostFromUrl(url);
  let lastError: unknown;

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    if (++attempt > MAX_LOOP_ITERATIONS) {
      console.warn(`[scraper.fetcher] fetch retry loop safety break for ${host}`);
      break;
    }
    await waitForHostSlot(host);
    try {
      return await fetchHtmlOnce(url);
    } catch (err) {
      lastError = err;
      const retryable =
        (err instanceof Error && (err as Error & { retryable?: boolean }).retryable) ||
        (err instanceof Error &&
          (err.name === 'AbortError' || /timeout|network|fetch failed/i.test(err.message)));

      if (!retryable || attempt >= MAX_RETRIES) break;

      const backoff = Math.min(30_000, 2_000 * 2 ** attempt) + randomDelayMs(0, 500);
      console.warn(
        `[scraper.fetcher] retry ${attempt}/${MAX_RETRIES} for ${host} in ${backoff}ms`,
      );
      await sleep(backoff);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Fetch a URL and return clean page text (no HTML chrome, no media).
 */
export async function fetchCleanText(url: string): Promise<string> {
  const html = await fetchHtml(url);
  const text = htmlToCleanText(html);
  if (!text || text.length < 40) {
    throw new Error(`Insufficient text content from ${url} (${text.length} chars)`);
  }
  // Cap payload size for free Gemini tier / cost control
  return text.slice(0, 48_000);
}
