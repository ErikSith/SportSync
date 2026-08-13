import * as cheerio from 'cheerio';

/** Polite SportSync bot identity — venues can block this UA if they wish. */
export const SCRAPER_USER_AGENT =
  'Mozilla/5.0 (compatible; SportSyncBot/1.0; +https://sportsync.app; event-aggregator)';

/** Randomized gap between requests to the same host (ms). Never burst. */
export const HOST_DELAY_MS = { min: 1500, max: 3500 } as const;

const FETCH_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 3;

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

/**
 * Strip non-content nodes and return whitespace-normalized plain text.
 * Never follows images / assets — text only for Gemini extraction.
 */
export function htmlToCleanText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, iframe, canvas, link, meta, img, picture, source, video, audio').remove();

  let text = '';
  if ($('main').length) text = $('main').text();
  else if ($('article').length) text = $('article').text();
  else if ($('body').length) text = $('body').text();
  else text = $.root().text();

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

    return await res.text();
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

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await waitForHostSlot(host);
    try {
      return await fetchHtmlOnce(url);
    } catch (err) {
      lastError = err;
      const retryable =
        (err instanceof Error && (err as Error & { retryable?: boolean }).retryable) ||
        (err instanceof Error &&
          (err.name === 'AbortError' || /timeout|network|fetch failed/i.test(err.message)));

      if (!retryable || attempt === MAX_RETRIES - 1) break;

      const backoff = Math.min(30_000, 2_000 * 2 ** attempt) + randomDelayMs(0, 500);
      console.warn(
        `[scraper.fetcher] retry ${attempt + 1}/${MAX_RETRIES} for ${host} in ${backoff}ms`,
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
