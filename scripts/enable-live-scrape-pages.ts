/**
 * Probe guessed venue_scrape_pages (events / tournaments / schedule) and
 * enable URLs that respond with HTTP 2xx. Polite delays; no Gemini calls.
 *
 * Usage:
 *   npx tsx scripts/enable-live-scrape-pages.ts --borough ruzinov --limit 120
 *   npx tsx scripts/enable-live-scrape-pages.ts --borough ruzinov --dry-run --limit 40
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { createAdminClient } from '../lib/supabase/admin';
import { SCRAPER_USER_AGENT, sleep } from '../src/lib/scraper/fetcher';

const DEFAULT_KINDS = ['events', 'tournaments', 'schedule'] as const;
const DELAY_MS = { min: 1500, max: 3500 } as const;

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run') || argv.includes('-n');
  const boroughIdx = argv.findIndex((a) => a === '--borough' || a === '-b');
  const limitIdx = argv.findIndex((a) => a === '--limit' || a === '-l');
  const kindsIdx = argv.findIndex((a) => a === '--kinds');
  const borough =
    boroughIdx >= 0 && argv[boroughIdx + 1]
      ? argv[boroughIdx + 1]!.toLowerCase()
      : 'ruzinov';
  const limit =
    limitIdx >= 0 && argv[limitIdx + 1]
      ? Number(argv[limitIdx + 1])
      : 100;
  const kinds =
    kindsIdx >= 0 && argv[kindsIdx + 1]
      ? argv[kindsIdx + 1]!.split(',').map((k) => k.trim()).filter(Boolean)
      : [...DEFAULT_KINDS];
  return {
    dryRun,
    borough,
    kinds,
    limit: Number.isFinite(limit) ? Math.max(1, limit) : 100,
  };
}

function pauseMs(): number {
  return (
    DELAY_MS.min +
    Math.floor(Math.random() * (DELAY_MS.max - DELAY_MS.min + 1))
  );
}

async function probe(url: string): Promise<{ ok: boolean; status: number; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': SCRAPER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,en;q=0.8',
      },
    });
    const finalUrl = res.url || url;
    // Soft-404: guessed path redirected back to site root / same as homepage
    let soft404 = false;
    try {
      const requested = new URL(url);
      const landed = new URL(finalUrl);
      const reqPath = requested.pathname.replace(/\/+$/, '') || '/';
      const landPath = landed.pathname.replace(/\/+$/, '') || '/';
      if (res.ok && reqPath !== '/' && (landPath === '/' || landPath === '')) {
        soft404 = true;
      }
    } catch {
      // ignore URL parse issues
    }
    return {
      ok: res.ok && !soft404,
      status: soft404 ? 404 : res.status,
      finalUrl,
    };
  } catch {
    return { ok: false, status: 0, finalUrl: url };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const supabase = createAdminClient();

  let q = supabase
    .from('venue_scrape_pages')
    .select('id, url, kind, borough, enabled')
    .eq('enabled', false)
    .in('kind', opts.kinds)
    .order('kind', { ascending: true })
    .limit(opts.limit);

  if (opts.borough) q = q.eq('borough', opts.borough);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const pages = data ?? [];
  console.log(
    `[enable-live] probing ${pages.length} disabled page(s)${
      opts.borough ? ` [${opts.borough}]` : ''
    }${opts.dryRun ? ' (dry-run)' : ''}…`,
  );

  let live = 0;
  let dead = 0;
  const enabledIds: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const result = await probe(page.url);
    const mark = result.ok ? 'LIVE' : 'dead';
    console.log(
      `[enable-live] (${i + 1}/${pages.length}) ${mark} ${result.status} ${page.kind} ${page.url}`,
    );

    if (result.ok) {
      live += 1;
      enabledIds.push(page.id);
      if (!opts.dryRun) {
        await supabase
          .from('venue_scrape_pages')
          .update({
            enabled: true,
            last_status: `probe:live:${result.status}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', page.id);
      }
    } else {
      dead += 1;
      if (!opts.dryRun) {
        await supabase
          .from('venue_scrape_pages')
          .update({
            last_status: `probe:dead:${result.status}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', page.id);
      }
    }

    if (i < pages.length - 1) await sleep(pauseMs());
  }

  console.log(
    JSON.stringify(
      {
        dryRun: opts.dryRun,
        borough: opts.borough,
        probed: pages.length,
        live,
        dead,
        enabled: opts.dryRun ? 0 : enabledIds.length,
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
