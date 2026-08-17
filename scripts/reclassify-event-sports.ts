/**
 * Reclassify events.sport from titles (Yoga / Combat / Fitness / …).
 * Usage: npx tsx scripts/reclassify-event-sports.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/reclassify-event-sports.ts
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { resolveSportType } from '../lib/ai/theme-config';
import {
  detectEventSport,
  isEventSport,
  type EventSport,
} from '../lib/constants/sports';
import { createAdminClient } from '../lib/supabase/admin';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const PAGE_SIZE = 1000;

interface EventRow {
  id: string;
  title: string;
  sport: string;
  sport_type: string | null;
}

interface VenueRow {
  id: string;
  name: string;
  sports: string[] | null;
}

function classifyFromTitle(title: string, current: string): EventSport {
  const fallback: EventSport = isEventSport(current) ? current : 'OTHER';
  if (/\b(gi|nogi|no-gi)\b/i.test(title) && !/pilates|yoga|joga/i.test(title)) {
    return 'COMBAT';
  }
  return detectEventSport(title, fallback);
}

function remapVenueSports(name: string, sports: string[]): string[] {
  const next = new Set(sports.map((s) => s.toUpperCase()).filter(Boolean));
  const detected = detectEventSport(name, 'OTHER');
  if (detected === 'YOGA') next.add('YOGA');
  if (detected === 'COMBAT') next.add('COMBAT');
  if (detected === 'CLIMBING') {
    next.add('CLIMBING');
    next.delete('OTHER');
  }
  if (detected === 'BOWLING') {
    next.add('BOWLING');
    next.delete('OTHER');
  }
  return [...next];
}

async function fetchAllEvents(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<EventRow[]> {
  const rows: EventRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, sport, sport_type')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as EventRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchAllVenues(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<VenueRow[]> {
  const rows: VenueRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('venues')
      .select('id, name, sports')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as VenueRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  const supabase = createAdminClient();
  const events = await fetchAllEvents(supabase);
  const counts: Record<string, number> = {};
  let eventUpdated = 0;

  for (const row of events) {
    const nextSport = classifyFromTitle(row.title, row.sport);
    const nextType = resolveSportType(nextSport);
    if (row.sport === nextSport && (row.sport_type ?? 'OTHER') === nextType) continue;

    counts[`${row.sport}→${nextSport}`] = (counts[`${row.sport}→${nextSport}`] ?? 0) + 1;
    if (DRY_RUN) {
      eventUpdated += 1;
      continue;
    }

    const { error } = await supabase
      .from('events')
      .update({ sport: nextSport, sport_type: nextType })
      .eq('id', row.id);
    if (error) {
      console.warn('[reclassify-event-sports] event skip', row.title, error.message);
      continue;
    }
    eventUpdated += 1;
  }

  const venues = await fetchAllVenues(supabase);
  let venueUpdated = 0;
  for (const row of venues) {
    const current = row.sports ?? [];
    const next = remapVenueSports(row.name, current);
    const same =
      [...current].map((s) => s.toUpperCase()).sort().join(',') ===
      [...next].map((s) => s.toUpperCase()).sort().join(',');
    if (same) continue;
    if (DRY_RUN) {
      venueUpdated += 1;
      continue;
    }
    const { error } = await supabase.from('venues').update({ sports: next }).eq('id', row.id);
    if (error) {
      console.warn('[reclassify-event-sports] venue skip', row.name, error.message);
      continue;
    }
    venueUpdated += 1;
  }

  console.log(
    JSON.stringify({
      dryRun: DRY_RUN,
      eventsScanned: events.length,
      eventsUpdated: eventUpdated,
      venuesScanned: venues.length,
      venuesUpdated: venueUpdated,
      transitions: counts,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
