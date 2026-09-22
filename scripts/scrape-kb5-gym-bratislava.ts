/**
 * Scrape KB5 Gym Bratislava schedule page into events for the bound venue.
 * Run: npx tsx scripts/scrape-kb5-gym-bratislava.ts
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { scrapeVenuePage } from '../src/lib/scraper/scrape-venue-page';
import { saveEventsForVenue } from '../src/lib/scraper/db-service';
import { shouldForceGroupClassFromScrapePage } from '../lib/feed/group-class';
import { resolveVenueDistrictSlug } from '../lib/scrape/bratislava-location';

const PAGE_ID = 'eafb1fa9-16f5-432a-8de8-91cb0c371afe';
const PAGE_URL = 'https://www.kb5.sk/kde-trenovat/kb5-gym-bratislava/';
const VENUE_ID = '551eee33-a718-4778-8ab1-c2182b65697a';

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

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing Supabase env');
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const address = 'Zámocká 36, 811 01 Bratislava-Staré Mesto';
  const district = resolveVenueDistrictSlug(address, 'KB5 Gym Bratislava') ?? 'stare-mesto';

  const { error: venueErr } = await sb
    .from('venues')
    .update({
      name: 'KB5 Gym Bratislava',
      address,
      city: 'Bratislava',
      district,
      sports: ['FITNESS'],
      website_url: 'https://www.kb5.sk/',
      description:
        'Malý KB5 gym v Starom Meste — silový a kondičný tréning (zmiešané skupiny a lekcie pre dámy).',
      updated_at: new Date().toISOString(),
    })
    .eq('id', VENUE_ID);
  if (venueErr) {
    console.error('venue update failed', venueErr.message);
    process.exit(1);
  }
  console.log('venue ok', { address, district });

  const { error: pageErr } = await sb
    .from('venue_scrape_pages')
    .update({
      url: PAGE_URL,
      kind: 'schedule',
      enabled: true,
      borough: district,
      venue_id: VENUE_ID,
      updated_at: new Date().toISOString(),
    })
    .eq('id', PAGE_ID);
  if (pageErr) {
    console.error('page update failed', pageErr.message);
    process.exit(1);
  }

  console.log('scraping…');
  const scraped = await scrapeVenuePage({
    url: PAGE_URL,
    venueName: 'KB5 Gym Bratislava',
  });
  console.log({
    path: scraped.path,
    textLen: scraped.text.length,
    eventCount: scraped.events.length,
    skippedGemini: scraped.skippedGemini,
    message: scraped.message,
    sample: scraped.events.slice(0, 5).map((e) => ({
      title: e.title,
      start: e.startTime,
      timeKnown: e.timeKnown,
    })),
  });

  if (scraped.events.length === 0) {
    await sb
      .from('venue_scrape_pages')
      .update({
        last_scraped_at: new Date().toISOString(),
        last_status: scraped.skippedGemini
          ? 'ok:no-event-signal'
          : `ok:events=0:${scraped.path}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', PAGE_ID);
    console.error('No events extracted — check Gemini / page signal');
    process.exit(2);
  }

  const { data: venue } = await sb
    .from('venues')
    .select('latitude, longitude')
    .eq('id', VENUE_ID)
    .maybeSingle();

  const upsert = await saveEventsForVenue(scraped.events, VENUE_ID, {
    latitude: venue?.latitude ?? null,
    longitude: venue?.longitude ?? null,
    scrapePageUrl: PAGE_URL,
    forceGroupClass: shouldForceGroupClassFromScrapePage('schedule', PAGE_URL),
  });

  await sb
    .from('venue_scrape_pages')
    .update({
      last_scraped_at: new Date().toISOString(),
      last_status: `ok:${scraped.path}:events=${scraped.events.length};+${upsert.created}/~${upsert.updated}`,
      enabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', PAGE_ID);

  console.log('upsert', upsert);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
