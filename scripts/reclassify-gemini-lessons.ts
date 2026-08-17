/**
 * Relabel repeating venue group lessons as class-* slots and tag descriptions.
 * Usage: npx tsx scripts/reclassify-gemini-lessons.ts
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { createAdminClient } from '../lib/supabase/admin';
import { toAppDateKey } from '../lib/datetime/bratislava';
import {
  looksLikeGroupClassListing,
  recurringSeriesLessonIds,
} from '../lib/feed/group-class';

type VenueJoin = { name: string | null } | { name: string | null }[] | null;

interface EventRow {
  id: string;
  title: string;
  external_id: string | null;
  source_url: string | null;
  ticket_url: string | null;
  description: string | null;
  starts_at: string;
  venue_id: string | null;
  source: string | null;
  city: string | null;
  type: string | null;
  participation_mode: string | null;
  is_aggregated: boolean | null;
  venues: VenueJoin;
}

function venueNameFromJoin(venues: VenueJoin): string | null {
  if (!venues) return null;
  if (Array.isArray(venues)) return venues[0]?.name ?? null;
  return venues.name ?? null;
}

async function main() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, title, external_id, source_url, ticket_url, description, starts_at, venue_id, source, city, type, participation_mode, is_aggregated, venues ( name )',
    )
    .eq('is_aggregated', true)
    .eq('participation_mode', 'participate')
    .neq('type', 'community')
    .gte('starts_at', new Date().toISOString());

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as EventRow[];
  const seriesIds = recurringSeriesLessonIds(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      startsAt: row.starts_at,
      venueId: row.venue_id,
      venueName: venueNameFromJoin(row.venues),
      city: row.city,
      source: row.source,
    })),
    (startsAt) => toAppDateKey(startsAt instanceof Date ? startsAt : new Date(startsAt)),
  );

  let updated = 0;
  for (const row of rows) {
    const isClass =
      seriesIds.has(row.id) ||
      looksLikeGroupClassListing({
        title: row.title,
        description: row.description,
        sourceUrl: row.source_url,
        ticketUrl: row.ticket_url,
        externalId: row.external_id,
      });

    if (!isClass) continue;

    const externalId = String(row.external_id ?? '');
    const nextExternal = externalId.startsWith('class-')
      ? externalId
      : `class-${externalId || row.id}`;
    const desc = String(row.description ?? '');
    const nextDesc = desc.includes('Skupinové cvičenie')
      ? desc
      : `Skupinové cvičenie na športovisku. ${desc}`.slice(0, 600);

    if (nextExternal === externalId && nextDesc === desc) continue;

    const { error: updateError } = await supabase
      .from('events')
      .update({
        external_id: nextExternal,
        description: nextDesc,
      })
      .eq('id', row.id);

    if (updateError) {
      console.warn('[reclassify] skip', row.title, updateError.message);
      continue;
    }
    updated += 1;
    console.log('[reclassify]', row.title, '→', nextExternal.slice(0, 28));
  }

  console.log(JSON.stringify({ scanned: rows.length, updated, series: seriesIds.size }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
