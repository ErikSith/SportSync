/**
 * Ružinov scrape queue hygiene:
 * 1) Disable noise / dead guessed pages (ok:0, 403, shops, soft-404 paths)
 * 2) Upsert verified high-yield URLs with correct kind + venue_id
 *
 * Usage:
 *   npx tsx scripts/curate-ruzinov-scrape-pages.ts
 *   npx tsx scripts/curate-ruzinov-scrape-pages.ts --dry-run
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { createAdminClient } from '../lib/supabase/admin';

const DRY = process.argv.includes('--dry-run') || process.argv.includes('-n');

/** Pages that consistently produce listings — keep enabled even if recently empty. */
const KEEP_URL_SUBSTR = [
  'fitcamp.formfactory.sk/calendar',
  'formfactory.sk/eventy',
  'aurialpadel.sk/turnaje',
  'arenapadel.sk',
  'fitworld.sk/rozvrh',
  'crazyfit.sk/rozvrh',
  'treningovaakademia.sk/rozvrh',
  'nolimitsgym.sk/rozvrh',
  'spartans.sk',
  'loksaboxing.com/rozvrh',
  'rgabratislava.sk',
  'jiujitsuacademy.sk/rozvrh',
  'retrosport.sk/rozvrh',
  'fighting.sk/rozvrh',
  'force8.sk/rozvrh',
  'bowlingpbc.sk',
  'bnc.sk',
];

type GoodPage = {
  url: string;
  kind: 'schedule' | 'events' | 'tournaments';
  /** Match venues by name (ilike) + district ruzinov when possible */
  venueName: string;
  appWrites: string;
  why: string;
};

/** Curated worth-scraping pages for Ružinov (+ nearby bowling that users expect). */
const GOOD_PAGES: GoodPage[] = [
  {
    url: 'https://fitcamp.formfactory.sk/calendar',
    kind: 'schedule',
    venueName: 'Form Factory FitCamp',
    appWrites: 'events (group_class) → tab Skupinové lekcie · venue FitCamp',
    why: 'Cheerio form-factory calendar — weekly class grid',
  },
  {
    url: 'https://www.formfactory.sk/eventy/',
    kind: 'events',
    venueName: 'Form Factory FitCamp',
    appWrites: 'events / tournaments (HYROX) · venueKey per club heuristic',
    why: 'Cheerio form-factory marketing eventy',
  },
  {
    url: 'https://aurialpadel.sk/turnaje',
    kind: 'tournaments',
    venueName: 'Aurial Padel Bratislava',
    appWrites: 'tournaments · for_women/for_kids from title · Hrať',
    why: 'Cheerio aurial-padel — dated tournament cards',
  },
  {
    url: 'https://www.aurialpadel.sk/turnaje',
    kind: 'tournaments',
    venueName: 'Aurial Padel Bratislava',
    appWrites: 'tournaments (www alias)',
    why: 'Same listing as aurialpadel.sk',
  },
  {
    url: 'https://arenapadel.sk/turnaje/',
    kind: 'tournaments',
    venueName: 'Arena Padel Bratislava',
    appWrites: 'tournaments via padel-ba adapter',
    why: 'Cheerio padel-ba / arenapadel',
  },
  {
    url: 'https://arenapadel.sk/category/arena-padel-bratislava/',
    kind: 'events',
    venueName: 'Arena Padel Bratislava',
    appWrites: 'events/tournaments text listings',
    why: 'Category feed for Arena Padel BA',
  },
  {
    url: 'http://www.fitworld.sk/rozvrh',
    kind: 'schedule',
    venueName: 'FitWorld',
    appWrites: 'events (group_class) · Skupinové lekcie',
    why: 'Gemini schedule — Pilates/TRX already hit',
  },
  {
    url: 'https://www.crazyfit.sk/rozvrh',
    kind: 'schedule',
    venueName: 'CrazyFit',
    appWrites: 'events (group_class)',
    why: 'Proven Gemini schedule hits',
  },
  {
    url: 'http://www.treningovaakademia.sk/rozvrh',
    kind: 'schedule',
    venueName: 'Tréningová akadémia Miletička',
    appWrites: 'events (group_class) · for_kids on deti classes',
    why: 'Proven kids + mix schedule',
  },
  {
    url: 'http://www.nolimitsgym.sk/rozvrh',
    kind: 'schedule',
    venueName: 'The Nø Limits Gym',
    appWrites: 'events (group_class)',
    why: 'Pole / gym schedule hits',
  },
  {
    url: 'https://www.spartans.sk/sk/rozvrh',
    kind: 'schedule',
    venueName: 'Spartans',
    appWrites: 'events (group_class) · for_kids Muay Thai pre deti',
    why: 'Curated schedule hits',
  },
  {
    url: 'https://www.loksaboxing.com/rozvrh',
    kind: 'schedule',
    venueName: 'Lokša',
    appWrites: 'events (group_class)',
    why: 'Boxing schedule',
  },
  {
    url: 'http://rgabratislava.sk/rozvrh',
    kind: 'schedule',
    venueName: 'RGA Bratislava BJJ',
    appWrites: 'events (group_class) · for_kids Gi Deti',
    why: 'BJJ schedule (prefer over /turnaje for classes)',
  },
  {
    url: 'http://www.bowlingpbc.sk/',
    kind: 'tournaments',
    venueName: 'PBC Bowling',
    appWrites: 'tournaments · source pbc-bowling · district petrzalka',
    why: 'Cheerio pbc-bowling (nearest BA bowling with live listings)',
  },
  {
    url: 'https://www.bowlingpbc.sk/',
    kind: 'tournaments',
    venueName: 'PBC Bowling',
    appWrites: 'tournaments (https alias)',
    why: 'Same PBC site',
  },
];

function shouldKeep(url: string): boolean {
  const u = url.toLowerCase();
  return KEEP_URL_SUBSTR.some((s) => u.includes(s.toLowerCase()));
}

function isNoiseUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes('sportisimo.sk')) return true;
  if (u.includes('sporthockey.sk/kategoria-produktu')) return true;
  if (u.includes('latinky.sk')) return true;
  if (u.includes('retroshopping.sk')) return true;
  if (u.includes('scansisslovakia.sk')) return true;
  // Product PDP noise mis-tagged as events
  if (u.includes('thestreets.sk/tenisky')) return true;
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (/\/(tenisky|obuv|produkty?|eshop|cart|kosik|product)(-|\/|$)/.test(path)) {
      return true;
    }
  } catch {
    /* ignore bad URL */
  }
  return false;
}

async function resolveVenueId(
  supabase: ReturnType<typeof createAdminClient>,
  name: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('venues')
    .select('id, name, district')
    .ilike('name', `%${name}%`)
    .order('created_at', { ascending: true })
    .limit(5);
  if (!data?.length) return null;
  const ruzinov = data.find((v) => (v.district ?? '').toLowerCase().includes('ru'));
  return (ruzinov ?? data[0])!.id as string;
}

async function main() {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // --- 1) Load enabled Ružinov pages ---
  const { data: pages, error } = await supabase
    .from('venue_scrape_pages')
    .select('id, url, kind, enabled, last_status, venue_id')
    .eq('borough', 'ruzinov')
    .eq('enabled', true)
    .limit(2000);
  if (error) throw new Error(error.message);

  const toDisable: Array<{ id: string; url: string; reason: string }> = [];
  for (const p of pages ?? []) {
    const url = String(p.url);
    if (shouldKeep(url)) continue;

    const status = (p.last_status as string | null) ?? '';
    let reason: string | null = null;
    if (isNoiseUrl(url)) reason = 'noise-shop';
    else if (status === 'ok:0') reason = 'empty-ok:0';
    else if (/^error:(HTTP 403|HTTP 404|fetch failed|Insufficient text)/i.test(status)) {
      reason = 'hard-error';
    } else if (/^error:.*429|quota/i.test(status) && /sporthockey|produkt/i.test(url)) {
      reason = 'shop-gemini-noise';
    }

    if (reason) toDisable.push({ id: p.id as string, url, reason });
  }

  console.log(`[curate] disable candidates: ${toDisable.length}`);
  if (!DRY && toDisable.length) {
    const byReason = new Map<string, string[]>();
    for (const row of toDisable) {
      const list = byReason.get(row.reason) ?? [];
      list.push(row.id);
      byReason.set(row.reason, list);
    }
    for (const [reason, ids] of byReason) {
      for (let i = 0; i < ids.length; i += 80) {
        const chunk = ids.slice(i, i + 80);
        const { error: upErr } = await supabase
          .from('venue_scrape_pages')
          .update({
            enabled: false,
            last_status: `curate:disabled:${reason}`.slice(0, 180),
            updated_at: now,
          })
          .in('id', chunk);
        if (upErr) throw new Error(upErr.message);
      }
    }
  }

  // --- 2) Upsert good pages ---
  const upserted: Array<{
    url: string;
    kind: string;
    venueId: string | null;
    appWrites: string;
    why: string;
    action: string;
  }> = [];

  for (const good of GOOD_PAGES) {
    const venueId = await resolveVenueId(supabase, good.venueName);
    const { data: existing } = await supabase
      .from('venue_scrape_pages')
      .select('id, enabled')
      .eq('url', good.url)
      .maybeSingle();

    if (DRY) {
      upserted.push({
        url: good.url,
        kind: good.kind,
        venueId,
        appWrites: good.appWrites,
        why: good.why,
        action: existing ? 'would-enable' : 'would-insert',
      });
      continue;
    }

    if (existing?.id) {
      const { error: upErr } = await supabase
        .from('venue_scrape_pages')
        .update({
          enabled: true,
          kind: good.kind,
          borough: 'ruzinov',
          venue_id: venueId,
          last_status: 'curate:verified',
          updated_at: now,
        })
        .eq('id', existing.id);
      if (upErr) throw new Error(upErr.message);
      upserted.push({
        url: good.url,
        kind: good.kind,
        venueId,
        appWrites: good.appWrites,
        why: good.why,
        action: 'enabled',
      });
    } else {
      const { error: insErr } = await supabase.from('venue_scrape_pages').insert({
        url: good.url,
        kind: good.kind,
        borough: good.url.includes('bowlingpbc') ? 'petrzalka' : 'ruzinov',
        enabled: true,
        venue_id: venueId,
        source: 'manual-curate',
        last_status: 'curate:verified',
      });
      if (insErr) throw new Error(`${good.url}: ${insErr.message}`);
      upserted.push({
        url: good.url,
        kind: good.kind,
        venueId,
        appWrites: good.appWrites,
        why: good.why,
        action: 'inserted',
      });
    }
  }

  // PBC pages should not be forced to ruzinov borough
  if (!DRY) {
    await supabase
      .from('venue_scrape_pages')
      .update({ borough: 'petrzalka', updated_at: now })
      .ilike('url', '%bowlingpbc.sk%');
  }

  console.log(
    JSON.stringify(
      {
        dryRun: DRY,
        disabled: toDisable.length,
        disableSample: toDisable.slice(0, 15).map((d) => ({ url: d.url, reason: d.reason })),
        verifiedPages: upserted,
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
