/**
 * Scrape ATA Tennis 2026 — Bratislava tournaments only.
 * Follows detail articles for Miesto (full address), level stays from listing.
 *
 * Run:
 *   npx tsx scripts/scrape-ata-tennis-ba.ts
 *   npx tsx scripts/scrape-ata-tennis-ba.ts --apply
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import {
  fetchHtml,
  htmlToCleanText,
  sleep,
  HOST_DELAY_MS,
} from '../src/lib/scraper/fetcher';
import { GEMINI_SCRAPER_SOURCE } from '../src/lib/scraper/types';
import { resolveVenueDistrictSlug } from '../lib/scrape/bratislava-location';
import { toAppDateKey } from '../lib/datetime/bratislava';

const LISTING_URL = 'https://www.atatennis.sk/?p=turnaje&rok=2026';
const PAGE_ID = 'a25f78bc-3f34-4e36-95a7-312366d57b8d';
const ATA_CLUB_VENUE_ID = '20b8be65-8713-43ec-89e0-d9d06fae3ea1';

/** Known BA host venues for ATA circuit (street → venue). */
const VENUE_BY_STREET: Array<{
  match: RegExp;
  venueId: string;
  venueName: string;
  address: string;
  district: string;
}> = [
  {
    match: /pr[ií]kopov/i,
    venueId: 'eaf4c3bf-67f1-41e3-a656-f1e226119e85',
    venueName: 'Vachy Sport NTC',
    address: 'Príkopova 3255/6, 831 03 Bratislava-Nové Mesto',
    district: 'nove-mesto',
  },
  {
    match: /odboj[aá]rov\s*3\b/i,
    venueId: 'a244eccb-0e66-4e87-91b4-d6baa7b32c16',
    venueName: 'TK Slovan Bratislava',
    address: 'Odbojárov 3, 831 04 Bratislava-Nové Mesto',
    district: 'nove-mesto',
  },
  {
    match: /m[aá]jov[aá]\s*21/i,
    venueId: '414ebd16-a914-447f-ad5f-492c72224d0e',
    venueName: 'TK Slávia STU Bratislava',
    address: 'Májová 21, 851 01 Bratislava-Petržalka',
    district: 'petrzalka',
  },
  {
    match: /trnavsk[aá]\s+cesta\s*33/i,
    venueId: 'f05a9249-0d7b-44f4-be55-d078cb830e53',
    venueName: 'Tenisový klub Inter Bratislava',
    address: 'Trnavská cesta 33, 821 08 Bratislava-Nové Mesto',
    district: 'nove-mesto',
  },
];

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(file, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (!m || !m[1] || !m[2]) continue;
        const k = m[1].trim();
        let v = m[2].trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        if (!process.env[k]) process.env[k] = v;
      }
    } catch {
      /* optional */
    }
  }
}

function delayMs() {
  return (
    HOST_DELAY_MS.min +
    Math.floor(Math.random() * (HOST_DELAY_MS.max - HOST_DELAY_MS.min + 1))
  );
}

type ListingRow = {
  dateText: string;
  title: string;
  format: string;
  level: string;
  surface: string;
  detailUrl: string | null;
};

type DetailData = {
  url: string;
  miestoRaw: string | null;
  address: string | null;
  surface: string | null;
  categories: string | null;
  courts: string | null;
  participants: string | null;
  balls: string | null;
  livestream: string | null;
  programUrl: string | null;
};

function normalizeTitle(raw: string): string {
  return raw
    .replace(/([a-záäčďéíľĺňóôŕšťúýž])Bratislava/gi, '$1 Bratislava')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDateRange2026(dateText: string): { start: Date; end: Date } | null {
  const t = dateText.replace(/\s+/g, ' ').trim();
  const range = t.match(
    /^(\d{1,2})\.\s*(\d{1,2})\.\s*-\s*(\d{1,2})\.\s*(\d{1,2})\.?$/,
  );
  if (range) {
    const start = new Date(2026, Number(range[2]) - 1, Number(range[1]), 9, 0, 0);
    const end = new Date(2026, Number(range[4]) - 1, Number(range[3]), 18, 0, 0);
    return { start, end };
  }
  const single = t.match(/^(\d{1,2})\.\s*(\d{1,2})\.?$/);
  if (single) {
    const start = new Date(2026, Number(single[2]) - 1, Number(single[1]), 9, 0, 0);
    const end = new Date(2026, Number(single[2]) - 1, Number(single[1]), 18, 0, 0);
    return { start, end };
  }
  return null;
}

/** Keep only tournaments that have not ended yet (vs today, Bratislava calendar day). */
function isUpcomingOrOngoing(end: Date, now = new Date()): boolean {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  return end.getTime() >= todayStart.getTime();
}

function cellText($: cheerio.CheerioAPI, el: Parameters<typeof $>[0]): string {
  return $(el).text().replace(/\s+/g, ' ').trim();
}

function parseListing(html: string): ListingRow[] {
  const $ = cheerio.load(html);
  const rows: ListingRow[] = [];
  $('tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 5) return;
    const title = normalizeTitle(cellText($, tds.get(1)!));
    if (!/bratislava/i.test(title)) return;
    const dateText = cellText($, tds.get(0)!);
    const format = cellText($, tds.get(2)!);
    const level = cellText($, tds.get(3)!);
    const surface = cellText($, tds.get(4)!);
    const link = $(tr).find('a[href]').first().attr('href') ?? null;
    let detailUrl: string | null = null;
    if (link) {
      try {
        detailUrl = new URL(link, LISTING_URL).toString();
      } catch {
        detailUrl = null;
      }
    }
    rows.push({ dateText, title, format, level, surface, detailUrl });
  });
  return rows;
}

function extractDetail(url: string, html: string): DetailData {
  const text = htmlToCleanText(html).replace(/\s+/g, ' ').trim();

  const miestoMatch = text.match(
    /Miesto:\s*(.+?)\s*(?=Povrch:|Kategórie:|Hrací|$)/i,
  );
  const miestoRaw = miestoMatch?.[1]?.trim() ?? null;
  const surface =
    text.match(/Povrch:\s*(.+?)\s*(?=Kategórie:|Hrací|$)/i)?.[1]?.trim() ?? null;
  const categories =
    text.match(/Kategórie:\s*(.+?)\s*(?=Hrací|Lopty|Počet|$)/i)?.[1]?.trim() ??
    null;
  const courts =
    text.match(/Počet kurtov:\s*([^\s]+)/i)?.[1]?.trim() ?? null;
  const participants =
    text.match(/Počet účastníkov:\s*(.+?)\s*(?=Počet kurtov:|Livestream:|$)/i)?.[1]
      ?.trim() ?? null;
  const balls =
    text.match(/Lopty:\s*(.+?)\s*(?=Počet|$)/i)?.[1]?.trim() ?? null;
  const livestream =
    text.match(/Livestream:\s*(.+?)\s*(?=Livescore:|$)/i)?.[1]?.trim() ?? null;
  const programUrl =
    text.match(/Livescore,\s*program:\s*(tenipo\.com)/i)?.[1] ?? null;

  let address = miestoRaw;
  if (address && !/bratislav/i.test(address)) {
    address = `${address}, Bratislava`;
  }

  return {
    url,
    miestoRaw,
    address,
    surface,
    categories,
    courts,
    participants,
    balls,
    livestream,
    programUrl: programUrl ? `https://${programUrl}` : null,
  };
}

function resolveHost(address: string | null): (typeof VENUE_BY_STREET)[number] | null {
  if (!address) return null;
  for (const v of VENUE_BY_STREET) {
    if (v.match.test(address)) return v;
  }
  return null;
}

function externalIdFor(row: ListingRow, start: Date): string {
  const key = `${row.detailUrl ?? LISTING_URL}|${toAppDateKey(start)}|${row.level}|${row.format}`;
  return `ata-${createHash('sha1').update(key).digest('hex').slice(0, 24)}`;
}

async function upsertTournament(
  sb: SupabaseClient,
  row: ListingRow,
  detail: DetailData | null,
): Promise<'created' | 'updated' | 'unchanged' | 'skipped'> {
  const dates = parseDateRange2026(row.dateText);
  if (!dates) return 'skipped';
  // Never write past tournaments — scrape is forward-looking from today.
  if (!isUpcomingOrOngoing(dates.end)) return 'skipped';

  const host = resolveHost(detail?.address ?? null);
  const address =
    host?.address ??
    detail?.address ??
    'Rázusovo nábrežie 52, 811 02 Bratislava-Staré Mesto';
  const venueId = host?.venueId ?? ATA_CLUB_VENUE_ID;
  const venueName = host?.venueName ?? 'ŠPORTOVÝ KLUB ATA';
  const district =
    host?.district ??
    resolveVenueDistrictSlug(address, venueName) ??
    'stare-mesto';

  const name = `${row.title} — ${row.level} (${row.format})`.slice(0, 200);
  const description = [
    `ATA Tennis okruh 2026`,
    `Úroveň: ${row.level}`,
    `Formát: ${row.format}`,
    `Povrch: ${detail?.surface ?? row.surface}`,
    detail?.categories ? `Kategórie na turnaji: ${detail.categories}` : null,
    detail?.participants ? `Účastníci: ${detail.participants}` : null,
    detail?.courts ? `Kurty: ${detail.courts}` : null,
    detail?.balls ? `Lopty: ${detail.balls}` : null,
    detail?.livestream ? `Livestream: ${detail.livestream}` : null,
    `Miesto: ${venueName}`,
    `Adresa: ${address}`,
    `Okres/časť: ${district}`,
    detail?.programUrl ? `Program/livescore: ${detail.programUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const now = Date.now();
  const status =
    dates.start.getTime() <= now ? 'IN_PROGRESS' : 'REGISTRATION_OPEN';

  const externalId = externalIdFor(row, dates.start);
  const sourceUrl = row.detailUrl ?? LISTING_URL;

  const shared = {
    name,
    description,
    sport: 'TENNIS',
    status,
    format: 'SINGLE_ELIMINATION',
    entry_fee: 0,
    max_participants: 64,
    city: 'Bratislava',
    starts_at: dates.start.toISOString(),
    ends_at: dates.end.toISOString(),
    registration_deadline: dates.start.toISOString(),
    source: GEMINI_SCRAPER_SOURCE,
    external_id: externalId,
    source_url: sourceUrl,
    ticket_url: sourceUrl,
    scraped_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    venue_id: venueId,
    for_kids: false,
    for_women: false,
  };

  const { data: existing } = await sb
    .from('tournaments')
    .select('id, name, status, venue_id')
    .eq('source', GEMINI_SCRAPER_SOURCE)
    .eq('external_id', externalId)
    .maybeSingle();

  if (existing) {
    const { error } = await sb.from('tournaments').update(shared).eq('id', existing.id);
    if (error) {
      console.warn('update failed', name, error.message);
      return 'skipped';
    }
    return 'updated';
  }

  const { error } = await sb.from('tournaments').insert(shared);
  if (error) {
    console.warn('insert failed', name, error.message);
    return 'skipped';
  }
  return 'created';
}

async function main() {
  loadEnv();
  const apply = process.argv.includes('--apply');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing Supabase env');
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log('fetch listing…');
  const listingHtml = await fetchHtml(LISTING_URL);
  const allBaRows = parseListing(listingHtml);
  const baRows = allBaRows.filter((row) => {
    const dates = parseDateRange2026(row.dateText);
    return dates ? isUpcomingOrOngoing(dates.end) : false;
  });
  const pastSkipped = allBaRows.length - baRows.length;
  console.log(
    `Bratislava rows: ${allBaRows.length} upcoming=${baRows.length} pastSkipped=${pastSkipped}`,
  );

  if (baRows.length === 0) {
    console.log('No upcoming Bratislava ATA tournaments vs today — nothing to scrape.');
    if (apply) {
      await sb
        .from('venue_scrape_pages')
        .update({
          enabled: true,
          kind: 'tournaments',
          last_scraped_at: new Date().toISOString(),
          last_status: `ok:ata-ba:upcoming=0;pastSkipped=${pastSkipped}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', PAGE_ID);
    }
    return;
  }

  const detailCache = new Map<string, DetailData>();
  const enriched: Array<ListingRow & { detail: DetailData | null }> = [];

  for (const row of baRows) {
    console.log(
      `- ${row.dateText} | ${row.title} | ${row.level} | ${row.format} | ${row.surface}`,
    );
    if (!row.detailUrl) {
      enriched.push({ ...row, detail: null });
      continue;
    }
    if (!detailCache.has(row.detailUrl)) {
      await sleep(delayMs());
      console.log('  detail →', row.detailUrl);
      try {
        const html = await fetchHtml(row.detailUrl);
        detailCache.set(row.detailUrl, extractDetail(row.detailUrl, html));
      } catch (err) {
        console.warn('  failed', err instanceof Error ? err.message : err);
      }
    }
    const detail = detailCache.get(row.detailUrl) ?? null;
    if (detail) {
      const host = resolveHost(detail.address);
      console.log(
        `  miesto=${detail.address} → ${host?.venueName ?? 'ATA fallback'} (${host?.district ?? 'stare-mesto'})`,
      );
    }
    enriched.push({ ...row, detail });
  }

  mkdirSync('.firecrawl', { recursive: true });
  writeFileSync(
    '.firecrawl/ata-tennis-ba-2026.json',
    JSON.stringify(enriched, null, 2),
    'utf8',
  );

  if (!apply) {
    console.log('Dry-run OK. Re-run with --apply to write tournaments.');
    return;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const row of enriched) {
    const result = await upsertTournament(sb, row, row.detail);
    if (result === 'created') created += 1;
    else if (result === 'updated') updated += 1;
    else skipped += 1;
  }

  await sb
    .from('venue_scrape_pages')
    .update({
      enabled: true,
      kind: 'tournaments',
      borough: 'stare-mesto',
      last_scraped_at: new Date().toISOString(),
      last_status: `ok:ata-ba:rows=${enriched.length};+${created}/~${updated}/skip=${skipped}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', PAGE_ID);

  // Keep ATA club page bound; venues for hosts already exist.
  await sb
    .from('venues')
    .update({
      sports: ['TENNIS'],
      website_url: 'https://www.atatennis.sk/',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ATA_CLUB_VENUE_ID);

  console.log({ created, updated, skipped });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
