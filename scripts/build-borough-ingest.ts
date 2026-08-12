/**
 * Tag scrape JSON with boroughs + emit venue/event SQL for Supabase MCP ingest.
 * Usage: npx tsx scripts/build-borough-ingest.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { boroughToSlug } from '../lib/scrape/bratislava-location';
import { tagScrapedEventLocation } from '../lib/scrape/tag-location';
import { VENUE_SEEDS, type NormalizedScrapedEvent } from '../lib/scrape/types';
import { SOURCE_DISPLAY_NAMES } from '../lib/constants/event-sources';

const COVERS: Record<string, string> = {
  PADEL: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
  TENNIS: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
  FITNESS: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  FOOTBALL: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  RUNNING: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
  SWIMMING: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=800&q=80',
  COMBAT: 'https://images.unsplash.com/photo-1549719386-90efe2c3b85e?w=800&q=80',
  OTHER: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
};

type JsonEvent = Omit<NormalizedScrapedEvent, 'startsAt'> & { startsAt: string };

function esc(s: string | null | undefined): string {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sportType(st: string): string {
  const allowed = new Set(['PADEL', 'TENNIS', 'FOOTBALL', 'BASKETBALL', 'ATLETIKA', 'OTHER']);
  return `'${allowed.has(st) ? st : 'OTHER'}'::"SportType"`;
}

function venueIdExpr(key: string): string {
  const seed = VENUE_SEEDS.find((v) => v.key === key);
  const name = seed?.name ?? key;
  return `(SELECT id FROM venues WHERE name ILIKE ${esc(name)} ORDER BY created_at NULLS LAST LIMIT 1)`;
}

function seedLat(key: string): number {
  return VENUE_SEEDS.find((v) => v.key === key)?.latitude ?? 48.1486;
}

function seedLng(key: string): number {
  return VENUE_SEEDS.find((v) => v.key === key)?.longitude ?? 17.1077;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const data = JSON.parse(readFileSync(join(process.cwd(), 'tmp-scrape-result.json'), 'utf8'));
const tagged = (data.events as JsonEvent[]).map((e) =>
  tagScrapedEventLocation({
    ...e,
    startsAt: new Date(e.startsAt),
  }),
);

const boroughCounts: Record<string, number> = {};
for (const e of tagged) {
  const key = e.borough ?? 'UNRESOLVED';
  boroughCounts[key] = (boroughCounts[key] ?? 0) + 1;
}

const outDir = join(process.cwd(), 'tmp-sql-mcp');
mkdirSync(outDir, { recursive: true });

// 1) Upsert / patch Bratislava venues with district slugs
const patchValues = VENUE_SEEDS.filter((v) => v.city === 'Bratislava' && v.district)
  .map(
    (v) =>
      `(${esc(v.name)}, ${esc(v.district!)}, ${esc(v.address)}, ${v.latitude}, ${v.longitude}, ${esc(v.websiteUrl)}, ARRAY[${v.sports.map((s) => esc(s)).join(',')}]::text[])`,
  )
  .join(',\n');

const insertMissing = VENUE_SEEDS.filter((v) => v.city === 'Bratislava')
  .map(
    (v) => `
INSERT INTO venues (name, address, city, district, sports, latitude, longitude, website_url, verified)
SELECT ${esc(v.name)}, ${esc(v.address)}, ${esc(v.city)}, ${esc(v.district ?? null)}, ARRAY[${v.sports.map((s) => esc(s)).join(',')}]::text[], ${v.latitude}, ${v.longitude}, ${esc(v.websiteUrl)}, true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name ILIKE ${esc(v.name)});`,
  )
  .join('\n');

const venuesSql = `
-- Insert missing scrape venues
${insertMissing}

-- Patch districts by exact name for existing rows
UPDATE venues AS v
SET
  district = s.district,
  address = COALESCE(NULLIF(v.address, ''), s.address),
  latitude = COALESCE(v.latitude, s.latitude),
  longitude = COALESCE(v.longitude, s.longitude),
  website_url = COALESCE(v.website_url, s.website_url)
FROM (VALUES
${patchValues}
) AS s(name, district, address, latitude, longitude, website_url, sports)
WHERE v.name = s.name;

-- Known corrections
UPDATE venues SET district = 'ruzinov' WHERE name ILIKE 'Aurial Padel Bratislava';
UPDATE venues SET district = 'stare-mesto' WHERE name ILIKE 'Form Factory OC Nivy';
UPDATE venues SET district = 'ruzinov' WHERE name ILIKE 'Form Factory BBC';
UPDATE venues SET district = 'ruzinov' WHERE name ILIKE 'FitCamp%';
`;

writeFileSync(join(outDir, '00-venues-districts.sql'), venuesSql);

const tournaments = tagged.filter((e) => e.category === 'tournament');
const events = tagged.filter((e) => e.category !== 'tournament');

function notice(source: string, url?: string | null): string {
  const name =
    SOURCE_DISPLAY_NAMES[source as keyof typeof SOURCE_DISPLAY_NAMES] ??
    'Oficiálny web športoviska';
  return `SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (${name}).${url ? ` ${url}` : ''}`;
}

function descOf(e: NormalizedScrapedEvent): string {
  const boroughLine =
    e.borough && e.district
      ? `Lokalita: ${e.borough} (${e.district}).`
      : '';
  return [e.description, boroughLine, notice(e.source, e.sourceUrl)]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 600);
}

if (tournaments.length) {
  const tSql = tournaments
    .map((e) => {
      const price = (e.priceCents ?? 0) / 100;
      const maxP = e.capacity && e.capacity > 0 ? e.capacity : 8;
      const starts = e.startsAt.toISOString();
      return `(${esc(e.title)}, ${esc(descOf(e))}, ${esc(e.sport)}, 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', ${price}, ${maxP}, ${e.registeredCount ?? 0}, ${esc(COVERS[e.sport] ?? COVERS.OTHER)}, ${esc(e.city)}, ${seedLat(e.venueKey)}, ${seedLng(e.venueKey)}, ${esc(starts)}::timestamptz, ${esc(starts)}::timestamptz, ${venueIdExpr(e.venueKey)}, ${esc(e.source)}, ${esc(e.externalId)}, ${esc(e.sourceUrl ?? null)}, ${esc(e.ticketUrl ?? null)}, now(), now())`;
    })
    .join(',\n');

  writeFileSync(
    join(outDir, '01-tournaments.sql'),
    `INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES
${tSql}
ON CONFLICT (source, external_id) WHERE source IS NOT NULL AND external_id IS NOT NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  entry_fee = EXCLUDED.entry_fee,
  max_participants = EXCLUDED.max_participants,
  current_participants = EXCLUDED.current_participants,
  source_url = EXCLUDED.source_url,
  ticket_url = EXCLUDED.ticket_url,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  scraped_at = now(),
  updated_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, tournaments.venue_id);`,
  );
}

chunk(events, 12).forEach((batch, idx) => {
  const values = batch
    .map((e) => {
      const price = e.priceCents ?? 0;
      const starts = e.startsAt.toISOString();
      const sourceName =
        SOURCE_DISPLAY_NAMES[e.source as keyof typeof SOURCE_DISPLAY_NAMES] ??
        'Oficiálny web športoviska';
      return `('official','open',${esc(e.sport)},${sportType(e.sportType)},${esc(e.title)},${esc(descOf(e))},${esc(COVERS[e.sport] ?? COVERS.OTHER)},${esc(e.city)},${esc(starts)}::timestamptz,${esc(starts)}::timestamptz,${esc(starts)}::timestamptz,${price / 100},${price},${e.capacity ?? 'NULL'},${e.capacity ?? 'NULL'},${e.registeredCount ?? 0},${seedLat(e.venueKey)},${seedLng(e.venueKey)},${venueIdExpr(e.venueKey)},${esc(e.source)},${esc(e.externalId)},${esc(e.sourceUrl ?? null)},${esc(sourceName)},true,${esc(e.ticketUrl ?? null)},now(),${esc(e.participationMode)},ARRAY[]::text[],false)`;
    })
    .join(',\n');

  writeFileSync(
    join(outDir, `events-${String(idx).padStart(2, '0')}.sql`),
    `INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  event_date, start_time, price, price_cents, capacity, max_participants, registered_count,
  latitude, longitude, venue_id, source, external_id, source_url, source_name, is_aggregated,
  ticket_url, scraped_at, participation_mode, photos, ai_enriched
) VALUES
${values}
ON CONFLICT (source, external_id) WHERE source IS NOT NULL AND external_id IS NOT NULL
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  event_date = EXCLUDED.event_date,
  start_time = EXCLUDED.start_time,
  price = EXCLUDED.price,
  price_cents = EXCLUDED.price_cents,
  capacity = EXCLUDED.capacity,
  max_participants = EXCLUDED.max_participants,
  registered_count = EXCLUDED.registered_count,
  source_url = EXCLUDED.source_url,
  ticket_url = EXCLUDED.ticket_url,
  source_name = EXCLUDED.source_name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  scraped_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, events.venue_id),
  participation_mode = EXCLUDED.participation_mode;`,
  );
});

writeFileSync(
  join(process.cwd(), 'tmp-scrape-tagged.json'),
  JSON.stringify(
    {
      scrapedAt: new Date().toISOString(),
      boroughCounts,
      events: tagged.map((e) => ({
        ...e,
        startsAt: e.startsAt.toISOString(),
        districtSlug: e.borough ? boroughToSlug(e.borough) : null,
      })),
    },
    null,
    2,
  ),
);

console.log(JSON.stringify({ total: tagged.length, boroughCounts, outDir }, null, 2));
