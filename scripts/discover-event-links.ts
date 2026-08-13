/**
 * From enabled venue website pages, discover same-origin links that look like
 * events / tournaments / schedules and register them as enabled scrape targets.
 *
 * Usage:
 *   npx tsx scripts/discover-event-links.ts --borough ruzinov --limit 40
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import * as cheerio from 'cheerio';
import { createAdminClient } from '../lib/supabase/admin';
import {
  SCRAPER_USER_AGENT,
  sleep,
  HOST_DELAY_MS,
} from '../src/lib/scraper/fetcher';

const EVENT_HREF_RE =
  /(^|\/)(eventy?|events?|turnaje?|tournaments?|rozvrh|schedule|calendar|kalendar|podujatia?|aktuality?|novinky?|treningy?|tréningy?|lekcie?|classes?|workshops?)(\/|$|\?|-)/i;

const PRODUCT_NOISE_RE =
  /\/(tenisky|obuv|produkty?|eshop|shop|cart|kosik|product)\b/i;

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run') || argv.includes('-n');
  const boroughIdx = argv.findIndex((a) => a === '--borough' || a === '-b');
  const limitIdx = argv.findIndex((a) => a === '--limit' || a === '-l');
  const borough =
    boroughIdx >= 0 && argv[boroughIdx + 1]
      ? argv[boroughIdx + 1]!.toLowerCase()
      : 'ruzinov';
  const limit =
    limitIdx >= 0 && argv[limitIdx + 1]
      ? Number(argv[limitIdx + 1])
      : 40;
  return {
    dryRun,
    borough,
    limit: Number.isFinite(limit) ? Math.max(1, limit) : 40,
  };
}

function pauseMs(): number {
  return (
    HOST_DELAY_MS.min +
    Math.floor(Math.random() * (HOST_DELAY_MS.max - HOST_DELAY_MS.min + 1))
  );
}

function classifyKind(url: string): 'tournaments' | 'schedule' | 'events' {
  const u = url.toLowerCase();
  if (/turnaj|tournament/.test(u)) return 'tournaments';
  if (/rozvrh|schedule|calendar|kalendar|trening|tréning|lekci|class/.test(u)) {
    return 'schedule';
  }
  return 'events';
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': SCRAPER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractCandidateLinks(pageUrl: string, html: string): string[] {
  const $ = cheerio.load(html);
  let origin: string;
  let basePath: string;
  try {
    const base = new URL(pageUrl);
    origin = base.origin;
    basePath = base.pathname.replace(/\/+$/, '') || '/';
  } catch {
    return [];
  }

  const found = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }
    let absolute: URL;
    try {
      absolute = new URL(href, pageUrl);
    } catch {
      return;
    }
    if (absolute.origin !== origin) return;
    if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') return;

    const path = absolute.pathname.replace(/\/+$/, '') || '/';
    if (path === '/' || path === basePath) return;
    if (PRODUCT_NOISE_RE.test(path)) return;

    const haystack = `${absolute.pathname} ${absolute.search} ${$(el).text()}`;
    if (!EVENT_HREF_RE.test(haystack) && !EVENT_HREF_RE.test(absolute.pathname)) {
      return;
    }

    absolute.hash = '';
    found.add(absolute.toString());
  });

  return [...found].slice(0, 12);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('venue_scrape_pages')
    .select('id, url, venue_id, borough, venues ( name )')
    .eq('enabled', true)
    .eq('kind', 'website')
    .eq('borough', opts.borough)
    .order('updated_at', { ascending: false })
    .limit(opts.limit);

  if (error) throw new Error(error.message);
  const sites = data ?? [];

  console.log(
    `[discover-links] scanning ${sites.length} website(s) [${opts.borough}]${
      opts.dryRun ? ' (dry-run)' : ''
    }…`,
  );

  let linksFound = 0;
  let pagesCreated = 0;
  let pagesUpdated = 0;
  const sample: Array<{ venue: string; url: string; kind: string }> = [];

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i]!;
    const venue = Array.isArray(site.venues) ? site.venues[0] : site.venues;
    const venueName = venue?.name ?? site.url;
    try {
      console.log(
        `[discover-links] (${i + 1}/${sites.length}) ${venueName} → ${site.url}`,
      );
      const html = await fetchHtml(site.url);
      const links = extractCandidateLinks(site.url, html);
      console.log(`[discover-links] → ${links.length} candidate link(s)`);
      linksFound += links.length;

      for (const link of links) {
        const kind = classifyKind(link);
        sample.push({ venue: venueName, url: link, kind });
        if (opts.dryRun) continue;

        const { data: existing } = await supabase
          .from('venue_scrape_pages')
          .select('id, enabled')
          .eq('url', link)
          .maybeSingle();

        if (!existing) {
          const { error: insertError } = await supabase.from('venue_scrape_pages').insert({
            venue_id: site.venue_id,
            url: link,
            kind,
            borough: site.borough,
            enabled: true,
            source: 'homepage-link',
            last_status: 'discovered:link',
          });
          if (insertError) {
            console.warn('[discover-links] insert failed', link, insertError.message);
          } else {
            pagesCreated += 1;
          }
        } else {
          const { error: updateError } = await supabase
            .from('venue_scrape_pages')
            .update({
              enabled: true,
              kind,
              source: 'homepage-link',
              last_status: 'discovered:link',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          if (updateError) {
            console.warn('[discover-links] update failed', link, updateError.message);
          } else {
            pagesUpdated += 1;
          }
        }
      }
    } catch (err) {
      console.warn(
        `[discover-links] skip ${venueName}:`,
        err instanceof Error ? err.message : err,
      );
    }

    if (i < sites.length - 1) await sleep(pauseMs());
  }

  console.log(
    JSON.stringify(
      {
        dryRun: opts.dryRun,
        borough: opts.borough,
        websites: sites.length,
        linksFound,
        pagesCreated,
        pagesUpdated,
        sample: sample.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
