import { readFileSync, writeFileSync } from 'fs';

const events = JSON.parse(readFileSync('tmp-payload-events.json', 'utf8'));
const half = Math.ceil(events.length / 2);
writeFileSync('tmp-payload-events-a.json', JSON.stringify(events.slice(0, half)));
writeFileSync('tmp-payload-events-b.json', JSON.stringify(events.slice(half)));

function wrap(path, out) {
  const e = readFileSync(path, 'utf8');
  const eSql = `WITH rows AS (
  SELECT * FROM jsonb_to_recordset($json$${e}$json$::jsonb) AS x(
    source text, external_id text, title text, sport text, sport_type text, description text, cover_url text, city text,
    starts_at timestamptz, price_cents int, capacity int, registered_count int, venue_name text,
    source_url text, ticket_url text, source_name text, participation_mode text
  )
)
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price, price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
)
SELECT
  'official', 'open', r.sport, r.sport_type::"SportType", r.title, r.description, r.cover_url, r.city, r.starts_at,
  (r.price_cents::numeric)/100, r.price_cents, r.capacity, r.capacity, r.registered_count, 48.1486, 17.1077,
  (SELECT id FROM venues v WHERE v.name ILIKE r.venue_name LIMIT 1),
  r.source, r.external_id, r.source_url, r.source_name, true, r.ticket_url,
  now(), r.participation_mode, ARRAY[]::text[], false
FROM rows r
ON CONFLICT (source, external_id) WHERE source IS NOT NULL AND external_id IS NOT NULL
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  price_cents = EXCLUDED.price_cents,
  price = EXCLUDED.price,
  capacity = EXCLUDED.capacity,
  max_participants = EXCLUDED.max_participants,
  registered_count = EXCLUDED.registered_count,
  source_url = EXCLUDED.source_url,
  ticket_url = EXCLUDED.ticket_url,
  source_name = EXCLUDED.source_name,
  is_aggregated = true,
  scraped_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, events.venue_id);
`;
  writeFileSync(out, eSql);
  console.log(out, eSql.length);
}

wrap('tmp-payload-events-a.json', 'tmp-bulk-events-a.sql');
wrap('tmp-payload-events-b.json', 'tmp-bulk-events-b.sql');
