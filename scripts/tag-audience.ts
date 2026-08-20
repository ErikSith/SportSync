/**
 * Tag events/tournaments with exclusive audience flags and backfill venue_id
 * from listing URLs / location names.
 *
 * Usage: npx tsx scripts/tag-audience.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/tag-audience.ts
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { classifyListingAudience } from '../lib/events/audience';
import { createAdminClient } from '../lib/supabase/admin';
import {
  loadVenueUrlIndex,
  resolveVenueFromListingUrl,
  resolveVenueFromLocationName,
} from '../src/lib/scraper/resolve-venue';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const PAGE_SIZE = 1000;

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  source_name: string | null;
  venue_id: string | null;
  for_kids: boolean | null;
  for_women: boolean | null;
}

interface TournamentRow {
  id: string;
  name: string;
  description: string | null;
  source_url: string | null;
  venue_id: string | null;
  for_kids: boolean | null;
  for_women: boolean | null;
}

async function fetchPaged<T>(
  table: 'events' | 'tournaments',
  columns: string,
): Promise<T[]> {
  const supabase = createAdminClient();
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchVenueNames(
  ids: string[],
): Promise<Map<string, string>> {
  const supabase = createAdminClient();
  const names = new Map<string, string>();
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const chunk = ids.slice(i, i + PAGE_SIZE);
    if (chunk.length === 0) continue;
    const { data, error } = await supabase.from('venues').select('id, name').in('id', chunk);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as Array<{ id: string; name: string | null }>) {
      if (row.name) names.set(row.id, row.name);
    }
  }
  return names;
}

async function main() {
  const supabase = createAdminClient();
  const venueIndex = await loadVenueUrlIndex();
  const events = await fetchPaged<EventRow>(
    'events',
    'id, title, description, source_url, source_name, venue_id, for_kids, for_women',
  );
  const tournaments = await fetchPaged<TournamentRow>(
    'tournaments',
    'id, name, description, source_url, venue_id, for_kids, for_women',
  );
  const venueIds = [
    ...new Set(
      [...events.map((e) => e.venue_id), ...tournaments.map((t) => t.venue_id)].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
  const venueNames = await fetchVenueNames(venueIds);

  let eventAudience = 0;
  let eventVenues = 0;
  let tournamentAudience = 0;
  let tournamentVenues = 0;

  for (const row of events) {
    const venueName = row.venue_id ? venueNames.get(row.venue_id) ?? null : null;
    const { forKids, forWomen } = classifyListingAudience({
      title: row.title,
      description: row.description,
      sourceUrl: row.source_url,
      sourceName: row.source_name,
      venueName,
    });
    const resolved =
      (!row.venue_id && row.source_url
        ? resolveVenueFromListingUrl(row.source_url, venueIndex)
        : null) ??
      (!row.venue_id ? resolveVenueFromLocationName(row.title, venueIndex) : null);

    const patch: Record<string, unknown> = {};
    if (Boolean(row.for_kids) !== forKids) patch.for_kids = forKids;
    if (Boolean(row.for_women) !== forWomen) patch.for_women = forWomen;
    if (!row.venue_id && resolved) {
      patch.venue_id = resolved.id;
      if (resolved.latitude != null) patch.latitude = resolved.latitude;
      if (resolved.longitude != null) patch.longitude = resolved.longitude;
    }

    if (Object.keys(patch).length === 0) continue;
    if (patch.for_kids != null || patch.for_women != null) eventAudience += 1;
    if (patch.venue_id) eventVenues += 1;

    if (DRY_RUN) {
      console.log(`EVENT ${row.title}`, patch);
      continue;
    }

    const { error } = await supabase.from('events').update(patch).eq('id', row.id);
    if (error) console.warn('[tag-audience] event skip', row.title, error.message);
  }

  for (const row of tournaments) {
    const venueName = row.venue_id ? venueNames.get(row.venue_id) ?? null : null;
    const { forKids, forWomen } = classifyListingAudience({
      title: row.name,
      description: row.description,
      sourceUrl: row.source_url,
      venueName,
    });
    const resolved =
      (!row.venue_id && row.source_url
        ? resolveVenueFromListingUrl(row.source_url, venueIndex)
        : null) ??
      (!row.venue_id ? resolveVenueFromLocationName(row.name, venueIndex) : null);

    const patch: Record<string, unknown> = {};
    if (Boolean(row.for_kids) !== forKids) patch.for_kids = forKids;
    if (Boolean(row.for_women) !== forWomen) patch.for_women = forWomen;
    if (!row.venue_id && resolved) {
      patch.venue_id = resolved.id;
      if (resolved.latitude != null) patch.latitude = resolved.latitude;
      if (resolved.longitude != null) patch.longitude = resolved.longitude;
    }

    if (Object.keys(patch).length === 0) continue;
    if (patch.for_kids != null || patch.for_women != null) tournamentAudience += 1;
    if (patch.venue_id) tournamentVenues += 1;

    if (DRY_RUN) {
      console.log(`CUP ${row.name}`, patch);
      continue;
    }

    const { error } = await supabase.from('tournaments').update(patch).eq('id', row.id);
    if (error) console.warn('[tag-audience] tournament skip', row.name, error.message);
  }

  console.log(
    `[tag-audience] ${DRY_RUN ? 'dry-run ' : ''}events audience=${eventAudience} venues=${eventVenues} scanned=${events.length}; tournaments audience=${tournamentAudience} venues=${tournamentVenues} scanned=${tournaments.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
