/**
 * Backfill events.participation_mode from title heuristics (Hrať vs Sledovať).
 * Usage: npx tsx scripts/backfill-participation-mode.ts
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { createAdminClient } from '../lib/supabase/admin';
import { listingParticipationMode } from '../lib/participation/fixture-match';

const PAGE = 1000;

async function main() {
  const supabase = createAdminClient();
  let updated = 0;
  let scanned = 0;
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, participation_mode')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      const next = listingParticipationMode(row.title, row.participation_mode);
      const prev = row.participation_mode === 'spectator' ? 'spectator' : 'participate';
      if (next === prev) continue;
      const { error: upErr } = await supabase
        .from('events')
        .update({ participation_mode: next })
        .eq('id', row.id);
      if (upErr) {
        console.warn('[backfill] skip', row.title, upErr.message);
        continue;
      }
      updated += 1;
      console.log(`[backfill] ${prev} → ${next}: ${row.title}`);
    }

    if (rows.length < PAGE) break;
    from += PAGE;
  }

  console.log(JSON.stringify({ scanned, updated }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
