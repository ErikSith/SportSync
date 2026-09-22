/**
 * Backfill events.source_evidence / source_excerpt (and null start_time when
 * clock is not grounded) for existing aggregated rows — without re-running Gemini.
 *
 * Usage: npx tsx scripts/backfill-source-evidence.ts [--limit N] [--dry-run]
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { createAdminClient } from '../lib/supabase/admin';
import { fetchCleanText, sleep, HOST_DELAY_MS } from '../src/lib/scraper/fetcher';
import {
  buildSourceEvidence,
  type SourceEvidence,
} from '../src/lib/scraper/source-evidence';
import { dateOnlySortInstant } from '../src/lib/scraper/date-only-time';
import type { ScrapedEvent } from '../src/lib/scraper/types';

interface Row {
  id: string;
  title: string;
  starts_at: string;
  start_time: string | null;
  source_url: string;
  description: string | null;
}

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run') || argv.includes('-n');
  const limitIdx = argv.findIndex((a) => a === '--limit' || a === '-l');
  const limitRaw =
    limitIdx >= 0 && argv[limitIdx + 1] ? Number(argv[limitIdx + 1]) : undefined;
  return {
    dryRun,
    limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
  };
}

function randomHostDelay(): number {
  return (
    HOST_DELAY_MS.min +
    Math.floor(Math.random() * (HOST_DELAY_MS.max - HOST_DELAY_MS.min + 1))
  );
}

function asScrapedStub(row: Row): ScrapedEvent {
  return {
    title: row.title,
    sportType: 'OTHER',
    isTournament: false,
    isGroupClass: false,
    isForKids: false,
    isForWomenOnly: false,
    startTime: row.starts_at,
    timeKnown: row.start_time != null && row.start_time !== '',
    originalUrl: row.source_url,
    description: row.description ?? '',
    locationName: '',
    priceText: '',
  };
}

async function main() {
  const { dryRun, limit } = parseArgs(process.argv.slice(2));
  const supabase = createAdminClient();

  let query = supabase
    .from('events')
    .select('id, title, starts_at, start_time, source_url, description')
    .eq('is_aggregated', true)
    .not('source_url', 'is', null)
    .gte('starts_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('starts_at', { ascending: true });

  if (limit != null) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter(
    (r): r is Row => typeof r.source_url === 'string' && r.source_url.length > 0,
  );

  const byUrl = new Map<string, Row[]>();
  for (const row of rows) {
    const list = byUrl.get(row.source_url) ?? [];
    list.push(row);
    byUrl.set(row.source_url, list);
  }

  console.log(
    `[backfill-evidence] ${rows.length} events across ${byUrl.size} URLs${
      dryRun ? ' (dry-run)' : ''
    }`,
  );

  let updated = 0;
  let timeCleared = 0;
  let fetchFailed = 0;
  let skipped = 0;
  let urlIndex = 0;

  for (const [url, group] of byUrl) {
    urlIndex += 1;
    if (urlIndex > 1) await sleep(randomHostDelay());

    let cleanText: string;
    try {
      cleanText = await fetchCleanText(url);
      console.log(
        `[backfill-evidence] (${urlIndex}/${byUrl.size}) ok ${url} → ${group.length} events`,
      );
    } catch (err) {
      fetchFailed += 1;
      console.warn(
        `[backfill-evidence] fetch failed ${url}:`,
        err instanceof Error ? err.message : err,
      );
      continue;
    }

    for (const row of group) {
      const stub = asScrapedStub(row);
      const evidence: SourceEvidence = buildSourceEvidence(cleanText, stub, {
        sourceUrl: url,
      });

      const timeMissing = evidence.fields.time === 'missing';
      const patch: {
        source_excerpt: string | null;
        source_evidence: SourceEvidence;
        start_time?: string | null;
        end_time?: string | null;
        starts_at?: string;
        event_date?: string;
      } = {
        source_excerpt: evidence.excerpt?.slice(0, 500) || null,
        source_evidence: evidence,
      };

      if (timeMissing) {
        const noon = dateOnlySortInstant(row.starts_at);
        if (!Number.isNaN(noon.getTime())) {
          const iso = noon.toISOString();
          patch.start_time = null;
          patch.end_time = null;
          patch.starts_at = iso;
          patch.event_date = iso;
          timeCleared += 1;
        } else {
          patch.start_time = null;
          patch.end_time = null;
          timeCleared += 1;
        }
      }

      if (dryRun) {
        updated += 1;
        console.log(
          `  [dry] ${row.title} title=${evidence.fields.title} date=${evidence.fields.date} time=${evidence.fields.time}`,
        );
        continue;
      }

      const { error: upErr } = await supabase.from('events').update(patch).eq('id', row.id);
      if (upErr) {
        skipped += 1;
        console.warn(`[backfill-evidence] update failed ${row.title}:`, upErr.message);
        continue;
      }
      updated += 1;
    }
  }

  console.log(
    JSON.stringify(
      { urls: byUrl.size, events: rows.length, updated, timeCleared, fetchFailed, skipped, dryRun },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
