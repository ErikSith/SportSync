import { readFileSync, writeFileSync } from 'fs';

const t = readFileSync('tmp-payload-tournaments.json', 'utf8');
const e = readFileSync('tmp-payload-events.json', 'utf8');

const tSql = `WITH rows AS (
  SELECT * FROM jsonb_to_recordset($json$${t}$json$::jsonb) AS x(
    source text, external_id text, name text, sport text, description text, cover_url text, city text,
    starts_at timestamptz, entry_fee numeric, max_participants int, current_participants int,
    venue_name text, source_url text, ticket_url text
  )
)
INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
)
SELECT
  r.name, r.description, r.sport, 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', r.entry_fee, r.max_participants, r.current_participants,
  r.cover_url, r.city, 48.1486, 17.1077, r.starts_at, r.starts_at,
  (SELECT id FROM venues v WHERE v.name ILIKE r.venue_name LIMIT 1),
  r.source, r.external_id, r.source_url, r.ticket_url, now(), now()
FROM rows r
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
  scraped_at = now(),
  updated_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, tournaments.venue_id);
`;

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

writeFileSync('tmp-bulk-tournaments.sql', tSql);
writeFileSync('tmp-bulk-events.sql', eSql);
console.log(JSON.stringify({ t: tSql.length, e: eSql.length }));
