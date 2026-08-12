/**
 * Build compact jsonb_to_recordset SQL batches from tagged scrape JSON.
 * Output: tmp-sql-mcp/jb-*.sql (small enough for Supabase MCP execute_sql)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { VENUE_SEEDS } from '../lib/scrape/types';
import { SOURCE_DISPLAY_NAMES } from '../lib/constants/event-sources';

const COVERS: Record<string, string> = {
  PADEL: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
  TENNIS: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
  FITNESS: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  FOOTBALL: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  RUNNING: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
  SWIMMING: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=800&q=80',
  OTHER: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
};

type Tagged = {
  source: string;
  externalId: string;
  title: string;
  sport: string;
  sportType: string;
  category: string;
  participationMode: string;
  startsAt: string;
  city: string;
  venueKey: string;
  description?: string;
  sourceUrl?: string | null;
  ticketUrl?: string | null;
  priceCents?: number;
  capacity?: number | null;
  registeredCount?: number;
  borough?: string;
  district?: string;
};

function venueName(key: string): string {
  return VENUE_SEEDS.find((v) => v.key === key)?.name ?? 'Form Factory FitCamp';
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

const data = JSON.parse(readFileSync(join(process.cwd(), 'tmp-scrape-tagged.json'), 'utf8'));
const all = data.events as Tagged[];
const outDir = join(process.cwd(), 'tmp-sql-mcp');
mkdirSync(outDir, { recursive: true });

const events = all.filter((e) => e.category !== 'tournament');
const tournaments = all.filter((e) => e.category === 'tournament');

chunk(events, 8).forEach((batch, idx) => {
  const rows = batch.map((e) => {
    const sourceName =
      SOURCE_DISPLAY_NAMES[e.source as keyof typeof SOURCE_DISPLAY_NAMES] ??
      'Oficiálny web športoviska';
    const boroughLine =
      e.borough && e.district ? `Lokalita: ${e.borough} (${e.district}).` : '';
    const description = [e.description, boroughLine, `SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (${sourceName}).${e.sourceUrl ? ` ${e.sourceUrl}` : ''}`]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 600);
    return {
      source: e.source,
      external_id: e.externalId,
      title: e.title,
      sport: e.sport,
      sport_type: ['PADEL', 'TENNIS', 'FOOTBALL', 'BASKETBALL', 'ATLETIKA', 'OTHER'].includes(
        e.sportType,
      )
        ? e.sportType
        : 'OTHER',
      description,
      cover_url: COVERS[e.sport] ?? COVERS.OTHER,
      city: e.city,
      starts_at: e.startsAt,
      price_cents: e.priceCents ?? 0,
      capacity: e.capacity ?? null,
      registered_count: e.registeredCount ?? 0,
      venue_name: venueName(e.venueKey),
      latitude: seedLat(e.venueKey),
      longitude: seedLng(e.venueKey),
      source_url: e.sourceUrl ?? null,
      ticket_url: e.ticketUrl ?? null,
      source_name: sourceName,
      participation_mode: e.participationMode,
    };
  });

  const json = JSON.stringify(rows).replace(/\$json\$/g, '$ json $');
  const sql = `WITH rows AS (
  SELECT * FROM jsonb_to_recordset($json$${json}$json$::jsonb) AS x(
    source text, external_id text, title text, sport text, sport_type text, description text,
    cover_url text, city text, starts_at timestamptz, price_cents int, capacity int,
    registered_count int, venue_name text, latitude float8, longitude float8,
    source_url text, ticket_url text, source_name text, participation_mode text
  )
)
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  event_date, start_time, price, price_cents, capacity, max_participants, registered_count,
  latitude, longitude, venue_id, source, external_id, source_url, source_name, is_aggregated,
  ticket_url, scraped_at, participation_mode, photos, ai_enriched
)
SELECT
  'official', 'open', r.sport, r.sport_type::"SportType", r.title, r.description, r.cover_url, r.city, r.starts_at,
  r.starts_at, r.starts_at, (r.price_cents::numeric)/100, r.price_cents, r.capacity, r.capacity, r.registered_count,
  r.latitude, r.longitude,
  (SELECT id FROM venues v WHERE v.name ILIKE r.venue_name LIMIT 1),
  r.source, r.external_id, r.source_url, r.source_name, true, r.ticket_url,
  now(), r.participation_mode, ARRAY[]::text[], false
FROM rows r
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
  participation_mode = EXCLUDED.participation_mode;`;

  writeFileSync(join(outDir, `jb-events-${String(idx).padStart(2, '0')}.sql`), sql);
});

chunk(tournaments, 6).forEach((batch, idx) => {
  const rows = batch.map((e) => {
    const sourceName =
      SOURCE_DISPLAY_NAMES[e.source as keyof typeof SOURCE_DISPLAY_NAMES] ??
      'Oficiálny web športoviska';
    const boroughLine =
      e.borough && e.district ? `Lokalita: ${e.borough} (${e.district}).` : '';
    const description = [e.description, boroughLine, `SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (${sourceName}).${e.sourceUrl ? ` ${e.sourceUrl}` : ''}`]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 600);
    return {
      source: e.source,
      external_id: e.externalId,
      name: e.title,
      sport: e.sport,
      description,
      cover_url: COVERS[e.sport] ?? COVERS.OTHER,
      city: e.city,
      starts_at: e.startsAt,
      entry_fee: (e.priceCents ?? 0) / 100,
      max_participants: e.capacity && e.capacity > 0 ? e.capacity : 8,
      current_participants: e.registeredCount ?? 0,
      venue_name: venueName(e.venueKey),
      latitude: seedLat(e.venueKey),
      longitude: seedLng(e.venueKey),
      source_url: e.sourceUrl ?? null,
      ticket_url: e.ticketUrl ?? null,
    };
  });

  const json = JSON.stringify(rows).replace(/\$json\$/g, '$ json $');
  const sql = `WITH rows AS (
  SELECT * FROM jsonb_to_recordset($json$${json}$json$::jsonb) AS x(
    source text, external_id text, name text, sport text, description text, cover_url text,
    city text, starts_at timestamptz, entry_fee numeric, max_participants int,
    current_participants int, venue_name text, latitude float8, longitude float8,
    source_url text, ticket_url text
  )
)
INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
)
SELECT
  r.name, r.description, r.sport, 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', r.entry_fee,
  r.max_participants, r.current_participants, r.cover_url, r.city, r.latitude, r.longitude,
  r.starts_at, r.starts_at,
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
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  scraped_at = now(),
  updated_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, tournaments.venue_id);`;

  writeFileSync(join(outDir, `jb-tournaments-${String(idx).padStart(2, '0')}.sql`), sql);
});

const files = require('fs')
  .readdirSync(outDir)
  .filter((f: string) => f.startsWith('jb-'))
  .sort();
console.log(JSON.stringify({ files, events: events.length, tournaments: tournaments.length }, null, 2));
