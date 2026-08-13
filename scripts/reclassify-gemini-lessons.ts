/**
 * Relabel gemini-web studio slots as class-* lessons and tag descriptions.
 * Usage: npx tsx scripts/reclassify-gemini-lessons.ts
 */
import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });

import { createAdminClient } from '../lib/supabase/admin';

const SCHEDULE_URL =
  /\/(rozvrh|schedule|calendar|kalendar|treningy?|tréningy?|lekcie?|classes?)(\/|$|\?)/i;

const GROUP_TITLE =
  /\b(pilates|hiit|yoga|joga|tabata|spinning|power\s*plate|bungee|kickbox|k1|muay\s*thai|box|boxing|tréning|trening|lekcia|visionbody)\b/i;

async function main() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, title, external_id, source_url, description')
    .eq('source', 'gemini-web')
    .eq('is_aggregated', true);

  if (error) throw new Error(error.message);

  let updated = 0;
  for (const row of data ?? []) {
    const externalId = String(row.external_id ?? '');
    const sourceUrl = String(row.source_url ?? '');
    const title = String(row.title ?? '');
    const isClass =
      SCHEDULE_URL.test(sourceUrl) ||
      GROUP_TITLE.test(title) ||
      externalId.startsWith('class-');

    if (!isClass) continue;

    const nextExternal = externalId.startsWith('class-')
      ? externalId
      : `class-${externalId}`;
    const desc = String(row.description ?? '');
    const nextDesc = desc.includes('Skupinové cvičenie')
      ? desc
      : `Skupinové cvičenie na športovisku. ${desc}`.slice(0, 600);

    const { error: updateError } = await supabase
      .from('events')
      .update({
        external_id: nextExternal,
        description: nextDesc,
      })
      .eq('id', row.id);

    if (updateError) {
      console.warn('[reclassify] skip', title, updateError.message);
      continue;
    }
    updated += 1;
    console.log('[reclassify]', title, '→', nextExternal.slice(0, 24));
  }

  console.log(JSON.stringify({ scanned: data?.length ?? 0, updated }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
