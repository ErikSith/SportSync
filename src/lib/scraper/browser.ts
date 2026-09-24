/**
 * Visual click-through crawler (Playwright): listing → detail pages.
 *
 * 1. Open venue/community listing URL
 * 2. Collect cards / images / buttons that link to event details
 * 3. Visit each detail (in-browser or secondary HTTP fetch)
 * 4. Clean rendered HTML via Cheerio (strip nav/footer/script)
 * 5. Attach the exact detailUrl to the cleaned text
 *
 * Opt-in / graceful: if Playwright is missing or SCRAPER_USE_BROWSER=0,
 * falls back to HTTP fetch of discovered hrefs from static HTML.
 */

import * as cheerio from 'cheerio';
import {
  fetchHtml,
  htmlToCleanText,
  HOST_DELAY_MS,
  SCRAPER_USER_AGENT,
  sleep,
} from './fetcher';

/** Max detail pages followed per listing (rate-limit safety). */
export const MAX_BROWSER_DETAILS = 15;

const DETAIL_PATH =
  /\/(?:e-\d+|event|events|podujati|podujatia|announcements?|aktualit|aktualita|turnaj|tournament|listky|vstupenk|kruzky|kr[uú][zž]ky|kurzy?|tabory|t[aá]bory|camps?|clubs?|workshop)/i;

const DETAIL_NOISE_PATH =
  /\/(?:cart|kosik|kontakty?|contact|o-nas|about|oou|gdpr|vpm|zverejovanie|login|prihlasenie|eshop|shop|produkt|cookie)(?:\/|$)/i;

export type BrowserDetailPage = {
  /** Absolute URL of the detail page the crawler opened. */
  detailUrl: string;
  /** Cheerio-cleaned main text from the detail page. */
  cleanText: string;
  /** Raw HTML (truncated) from the detail page. */
  html: string;
  /** Anchor / card label from the listing. */
  anchorText: string;
};

export type CrawlListingOptions = {
  maxDetails?: number;
  /**
   * `click` — navigate in Playwright to each detail.
   * `http` — discover links in browser (or static HTML), fetch via HTTP.
   * `auto` — Playwright when available, else HTTP (default).
   */
  mode?: 'click' | 'http' | 'auto';
  /** Optional pre-fetched listing HTML (skips re-fetch when browser unavailable). */
  listingHtml?: string | null;
};

export type DiscoveredListingLink = {
  url: string;
  anchorText: string;
};

function browserEnabled(): boolean {
  const v = (process.env.SCRAPER_USE_BROWSER ?? '1').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off';
}

function randomDelayMs(): number {
  return (
    HOST_DELAY_MS.min +
    Math.floor(Math.random() * (HOST_DELAY_MS.max - HOST_DELAY_MS.min + 1))
  );
}

function sameHost(a: string, b: string): boolean {
  try {
    return (
      new URL(a).host.replace(/^www\./, '') ===
      new URL(b).host.replace(/^www\./, '')
    );
  } catch {
    return false;
  }
}

function absoluteUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString().split('#')[0]!.replace(/\/$/, '') || u.toString();
  } catch {
    return null;
  }
}

function listingPathOf(url: string): string {
  try {
    return new URL(url).pathname.replace(/\/+$/, '') || '/';
  } catch {
    return '/';
  }
}

function looksLikeDetailUrl(abs: string, listingUrl: string): boolean {
  let path: string;
  try {
    path = new URL(abs).pathname.replace(/\/+$/, '') || '/';
  } catch {
    return false;
  }
  if (DETAIL_NOISE_PATH.test(path)) return false;
  const listingPath = listingPathOf(listingUrl);
  if (path === listingPath || path === '/') return false;
  if (listingPath.length > 1 && path.startsWith(`${listingPath}/`)) return true;
  if (DETAIL_PATH.test(path)) return true;
  // Soft: long slug child paths
  return /\/[a-z0-9-]{12,}/i.test(path);
}

/**
 * Discover same-host detail candidates from HTML (Cheerio) — used by HTTP
 * fallback and to merge with Playwright DOM discoveries.
 */
export function discoverDetailLinksFromHtml(
  html: string,
  listingUrl: string,
): DiscoveredListingLink[] {
  const $ = cheerio.load(html);
  const out: DiscoveredListingLink[] = [];
  const seen = new Set<string>();

  const push = (href: string | undefined, anchorText: string) => {
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }
    const abs = absoluteUrl(href, listingUrl);
    if (!abs || !sameHost(abs, listingUrl)) return;
    if (!looksLikeDetailUrl(abs, listingUrl)) return;
    const key = abs.replace(/\/$/, '');
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      url: key,
      anchorText: anchorText.replace(/\s+/g, ' ').trim().slice(0, 160),
    });
  };

  // Classic anchors (incl. image cards wrapped in <a>)
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    let text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text) {
      text =
        $(el).find('img[alt]').first().attr('alt')?.trim() ||
        $(el).attr('aria-label')?.trim() ||
        $(el).attr('title')?.trim() ||
        '';
    }
    push(href, text);
  });

  // Clickable cards / banners with data-href / data-url
  $('[data-href], [data-url], [data-link]').each((_, el) => {
    const href =
      $(el).attr('data-href') ||
      $(el).attr('data-url') ||
      $(el).attr('data-link');
    const text =
      $(el).text().replace(/\s+/g, ' ').trim() ||
      $(el).find('img[alt]').first().attr('alt')?.trim() ||
      '';
    push(href, text);
  });

  // Images that are the only child of a link are already covered; orphan
  // banners with onclick location=… are rare — skip (no eval).
  return out;
}

async function loadPlaywright(): Promise<typeof import('playwright') | null> {
  if (!browserEnabled()) return null;
  try {
    return await import('playwright');
  } catch (err) {
    console.warn(
      '[scraper.browser] Playwright not installed — HTTP fallback:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Collect detail hrefs from a live Playwright page (JS-rendered cards).
 * Uses a string script so tsx/esbuild `__name` helpers are not injected into
 * the browser context (avoids `ReferenceError: __name is not defined`).
 */
async function discoverLinksInPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  listingUrl: string,
): Promise<DiscoveredListingLink[]> {
  const raw = (await page.evaluate(`(() => {
    const results = [];
    const seen = new Set();

    const add = (href, text) => {
      if (!href) return;
      const trimmed = String(href).trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('mailto:')) return;
      if (seen.has(trimmed)) return;
      seen.add(trimmed);
      results.push({ href: trimmed, text: String(text || '').slice(0, 160) });
    };

    document.querySelectorAll('a[href]').forEach((el) => {
      const img = el.querySelector('img[alt]');
      const imgAlt = img ? img.getAttribute('alt') || '' : '';
      add(
        el.getAttribute('href'),
        (el.innerText || el.getAttribute('aria-label') || el.title || imgAlt || '').trim(),
      );
    });

    document.querySelectorAll('[data-href], [data-url], [data-link]').forEach((el) => {
      const href =
        el.getAttribute('data-href') ||
        el.getAttribute('data-url') ||
        el.getAttribute('data-link');
      add(href, (el.textContent || '').trim());
    });

    document.querySelectorAll('[role="link"], button, .card, .event-card, article').forEach((el) => {
      const href =
        el.getAttribute('href') ||
        el.getAttribute('data-href') ||
        el.getAttribute('data-url') ||
        null;
      if (href) add(href, (el.textContent || '').trim());
    });

    return results;
  })()`)) as { href: string; text: string }[];

  const out: DiscoveredListingLink[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const abs = absoluteUrl(item.href, listingUrl);
    if (!abs || !sameHost(abs, listingUrl)) continue;
    if (!looksLikeDetailUrl(abs, listingUrl)) continue;
    const key = abs.replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ url: key, anchorText: item.text.replace(/\s+/g, ' ').trim() });
  }
  return out;
}

async function fetchDetailPage(
  detailUrl: string,
  anchorText: string,
): Promise<BrowserDetailPage | null> {
  try {
    const html = await fetchHtml(detailUrl);
    const cleanText = htmlToCleanText(html).slice(0, 48_000);
    if (cleanText.length < 40) return null;
    return { detailUrl, cleanText, html, anchorText };
  } catch (err) {
    console.warn(
      `[scraper.browser] HTTP detail failed ${detailUrl}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

async function crawlDetailsHttp(
  links: DiscoveredListingLink[],
  maxDetails: number,
): Promise<BrowserDetailPage[]> {
  const out: BrowserDetailPage[] = [];
  for (const link of links) {
    if (out.length >= maxDetails) break;
    await sleep(randomDelayMs());
    const page = await fetchDetailPage(link.url, link.anchorText);
    if (page) out.push(page);
  }
  return out;
}

async function crawlDetailsWithPlaywright(
  listingUrl: string,
  maxDetails: number,
  mode: 'click' | 'http',
): Promise<BrowserDetailPage[] | null> {
  const pw = await loadPlaywright();
  if (!pw) return null;

  const browser = await pw.chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });

  try {
    const context = await browser.newContext({
      userAgent: SCRAPER_USER_AGENT,
      locale: 'sk-SK',
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);

    await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    // Soft wait for lazy cards / hydration
    await page.waitForTimeout(1_200).catch(() => undefined);

    const links = await discoverLinksInPage(page, listingUrl);
    if (links.length === 0) {
      const html = await page.content();
      const fromHtml = discoverDetailLinksFromHtml(html, listingUrl);
      links.push(...fromHtml);
    }

    const capped = links.slice(0, maxDetails);
    const out: BrowserDetailPage[] = [];

    for (const link of capped) {
      await sleep(randomDelayMs());
      try {
        if (mode === 'http') {
          const fetched = await fetchDetailPage(link.url, link.anchorText);
          if (fetched) out.push(fetched);
          continue;
        }

        // In-browser navigation (renders JS-only detail pages)
        await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
        await page.waitForTimeout(600).catch(() => undefined);
        const html = await page.content();
        const cleanText = htmlToCleanText(html).slice(0, 48_000);
        if (cleanText.length < 40) continue;
        out.push({
          detailUrl: link.url,
          cleanText,
          html,
          anchorText: link.anchorText,
        });
      } catch (err) {
        console.warn(
          `[scraper.browser] detail navigate failed ${link.url}:`,
          err instanceof Error ? err.message : err,
        );
        // One HTTP retry for transient navigation failures
        const fetched = await fetchDetailPage(link.url, link.anchorText);
        if (fetched) out.push(fetched);
      }
    }

    await context.close();
    return out;
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/**
 * Open a listing URL, discover event detail links (cards / banners / images),
 * crawl each detail, and return Cheerio-cleaned text bound to detailUrl.
 */
export async function crawlListingDetails(
  listingUrl: string,
  options?: CrawlListingOptions,
): Promise<BrowserDetailPage[]> {
  const maxDetails = options?.maxDetails ?? MAX_BROWSER_DETAILS;
  const mode = options?.mode ?? 'auto';

  const usePlaywright = mode !== 'http' && browserEnabled();
  if (usePlaywright) {
    try {
      const viaBrowser = await crawlDetailsWithPlaywright(
        listingUrl,
        maxDetails,
        'click',
      );
      if (viaBrowser && viaBrowser.length > 0) return viaBrowser;
      // Strict click mode: do not fall through to static HTTP if browser ran cleanly
      if (viaBrowser && mode === 'click') return viaBrowser;
    } catch (err) {
      console.warn(
        '[scraper.browser] Playwright crawl failed — HTTP fallback:',
        err instanceof Error ? err.message : err,
      );
      if (mode === 'click') return [];
    }
  }

  // HTTP fallback: static listing HTML → detail fetches
  let listingHtml = options?.listingHtml ?? null;
  if (!listingHtml) {
    try {
      listingHtml = await fetchHtml(listingUrl);
    } catch (err) {
      console.warn(
        '[scraper.browser] listing fetch failed:',
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }

  const links = discoverDetailLinksFromHtml(listingHtml, listingUrl);
  return crawlDetailsHttp(links, maxDetails);
}

/**
 * Build a single Gemini-ready text blob from crawled detail pages.
 * Each block is tagged with its detailUrl so the extractor can bind originalUrl.
 */
export function formatCrawledDetailsForExtract(
  pages: BrowserDetailPage[],
): string {
  return pages
    .map(
      (p, i) =>
        `=== DETAIL ${i + 1} ===\nURL: ${p.detailUrl}\nNADPIS KARTY: ${p.anchorText || '—'}\n---\n${p.cleanText.slice(0, 12_000)}`,
    )
    .join('\n\n');
}
