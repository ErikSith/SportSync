/**
 * Tag events.for_kids from explicit kids copy / kids venues.
 * Usage: npx tsx scripts/tag-for-kids.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/tag-for-kids.ts
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { detectExplicitKidsAudience } from '../lib/events/for-kids';
import { createAdminClient } from '../lib/supabase/admin';

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
}

async function fetchAllEvents(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<EventRow[]> {
  const rows: EventRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, description, source_url, source_name, venue_id, for_kids')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as EventRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchVenueNames(
  supabase: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<Map<string, string>> {
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
  const events = await fetchAllEvents(supabase);
  const venueIds = [...new Set(events.map((e) => e.venue_id).filter((id): id is string => Boolean(id)))];
  const venueNames = await fetchVenueNames(supabase, venueIds);

  let tagged = 0;

  for (const row of events) {
    const next = detectExplicitKidsAudience({
      title: row.title,
      description: row.description,
      sourceUrl: row.source_url,
      sourceName: row.source_name,
      venueName: row.venue_id ? venueNames.get(row.venue_id) ?? null : null,
    });
    if (Boolean(row.for_kids) || !next) continue;

    tagged += 1;

    if (DRY_RUN) {
      console.log(`TAG  ${row.title}`);
      continue;
    }

    const { error } = await supabase.from('events').update({ for_kids: true }).eq('id', row.id);
    if (error) {
      console.warn('[tag-for-kids] skip', row.title, error.message);
    }
  }

  console.log(
    `[tag-for-kids] ${DRY_RUN ? 'dry-run ' : ''}tagged=${tagged} scanned=${events.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
