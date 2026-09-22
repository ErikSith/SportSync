/**
 * One-off: realign venues.district from address via resolveVenueDistrictSlug.
 * Run: npx tsx scripts/fix-venue-districts-from-address.ts
 * Dry-run default; pass --apply to write.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { resolveVenueDistrictSlug } from '../lib/scrape/bratislava-location';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(file, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (!m) continue;
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
  const apply = process.argv.includes('--apply');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from('venues')
    .select('id, name, address, district, city')
    .eq('city', 'Bratislava');
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const fixes: Array<{
    id: string;
    name: string;
    from: string | null;
    to: string;
    address: string | null;
  }> = [];

  for (const v of data ?? []) {
    const resolved = resolveVenueDistrictSlug(v.address, v.name);
    if (!resolved) continue;
    if ((v.district ?? null) === resolved) continue;
    fixes.push({
      id: v.id,
      name: v.name,
      from: v.district,
      to: resolved,
      address: v.address,
    });
  }

  console.log(`venues=${data?.length ?? 0} mismatches=${fixes.length} apply=${apply}`);
  for (const f of fixes.slice(0, 40)) {
    console.log(`- ${f.name}: ${f.from} → ${f.to} | ${f.address}`);
  }
  if (fixes.length > 40) console.log(`… +${fixes.length - 40} more`);

  if (!apply) {
    console.log('Dry-run only. Re-run with --apply to update.');
    return;
  }

  let updated = 0;
  for (const f of fixes) {
    const { error: upErr } = await sb
      .from('venues')
      .update({ district: f.to, updated_at: new Date().toISOString() })
      .eq('id', f.id);
    if (upErr) {
      console.warn('failed', f.name, upErr.message);
      continue;
    }
    updated += 1;
  }
  console.log(`updated=${updated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
