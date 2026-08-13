/**
 * Import data/scrape-pages/<borough>.json into venues + venue_scrape_pages
 * via Supabase service-role REST (no Prisma/DATABASE_URL).
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { readFile } from 'fs/promises';
import path from 'path';
import { createAdminClient } from '../lib/supabase/admin';

interface RegistryPage {
  venueName: string;
  googlePlaceId: string;
  address: string | null;
  latitude: number;
  longitude: number;
  sports: string[];
  url: string;
  kind: string;
  enabled: boolean;
  borough: string;
}

interface RegistryFile {
  borough: string;
  pages: RegistryPage[];
}

async function main() {
  const borough = process.argv[2] || 'ruzinov';
  const file = path.join(process.cwd(), 'data', 'scrape-pages', `${borough}.json`);
  const raw = JSON.parse(await readFile(file, 'utf8')) as RegistryFile;
  const supabase = createAdminClient();

  const byPlace = new Map<string, RegistryPage>();
  for (const page of raw.pages) {
    if (!byPlace.has(page.googlePlaceId) || page.kind === 'website') {
      byPlace.set(page.googlePlaceId, page);
    }
  }

  let venuesCreated = 0;
  let venuesUpdated = 0;
  let pagesCreated = 0;
  let pagesSkipped = 0;
  const venueIds = new Map<string, string>();

  for (const place of byPlace.values()) {
    const { data: existing } = await supabase
      .from('venues')
      .select('id')
      .eq('google_place_id', place.googlePlaceId)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('venues')
        .update({
          website_url: place.url.startsWith('http') && place.kind === 'website' ? place.url : undefined,
          latitude: place.latitude,
          longitude: place.longitude,
          address: place.address,
          district: place.borough,
          sports: place.sports,
        })
        .eq('id', existing.id);
      venueIds.set(place.googlePlaceId, existing.id);
      venuesUpdated += 1;
    } else {
      const homepage =
        raw.pages.find(
          (p) => p.googlePlaceId === place.googlePlaceId && p.kind === 'website' && p.enabled,
        )?.url ?? null;

      const { data: created, error } = await supabase
        .from('venues')
        .insert({
          name: place.venueName,
          address: place.address,
          city: 'Bratislava',
          district: place.borough,
          latitude: place.latitude,
          longitude: place.longitude,
          website_url: homepage,
          google_place_id: place.googlePlaceId,
          sports: place.sports,
          verified: false,
          description: 'Objavené cez Google Places.',
        })
        .select('id')
        .single();

      if (error || !created) {
        console.warn('venue fail', place.venueName, error?.message);
        continue;
      }
      venueIds.set(place.googlePlaceId, created.id);
      venuesCreated += 1;
    }
  }

  for (const page of raw.pages) {
    const venueId = venueIds.get(page.googlePlaceId) ?? null;
    const { data: existing } = await supabase
      .from('venue_scrape_pages')
      .select('id')
      .eq('url', page.url)
      .maybeSingle();

    if (existing?.id) {
      pagesSkipped += 1;
      continue;
    }

    const { error } = await supabase.from('venue_scrape_pages').insert({
      url: page.url,
      kind: page.kind,
      borough: page.borough,
      enabled: page.enabled,
      source: 'google-places',
      venue_id: venueId,
    });
    if (error) {
      console.warn('page fail', page.url, error.message);
      continue;
    }
    pagesCreated += 1;
  }

  console.log(
    JSON.stringify(
      {
        borough,
        venuesCreated,
        venuesUpdated,
        pagesCreated,
        pagesSkipped,
        totalPagesInFile: raw.pages.length,
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
