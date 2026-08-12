/**
 * Build upsert SQL from tmp-scrape-result.json for MCP / psql apply.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SOURCE_NAMES: Record<string, string> = {
  'aurial-padel': 'Aurial Padel Club',
  'form-factory': 'Form Factory',
  citylife: 'CityLife',
  stz: 'STZ – oficiálny web',
  predpredaj: 'Predpredaj.sk',
  'ntc-ba': 'NTC Bratislava',
  'arena-padel': 'Aurial Padel',
};

const COVERS: Record<string, string> = {
  PADEL: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
  TENNIS: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
  FITNESS: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  FOOTBALL: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  RUNNING: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
  OTHER: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
};

const VENUE_NAME: Record<string, string> = {
  'aurial-padel': 'Aurial Padel Bratislava',
  'aurial-padel-raca': 'Aurial Padel Rača',
  'form-factory-fitcamp': 'Form Factory FitCamp',
  'form-factory-farskeho': 'Form Factory Farského',
  'form-factory-nivy': 'Form Factory OC Nivy',
  'form-factory-bbc': 'Form Factory BBC',
  'ntc-bratislava': 'Národné tenisové centrum Bratislava',
  'citylife-eurovea': 'Eurovea (Dunaj)',
  'citylife-grassalkovich': 'Grassalkovichova zahrada',
};

function esc(s: string | null | undefined): string {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlSportType(sportType: string): string {
  const allowed = new Set(['PADEL', 'TENNIS', 'FOOTBALL', 'BASKETBALL', 'ATLETIKA', 'OTHER']);
  const t = allowed.has(sportType) ? sportType : 'OTHER';
  return `'${t}'::\"SportType\"`;
}

type Row = {
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
};

const data = JSON.parse(readFileSync(join(process.cwd(), 'tmp-scrape-result.json'), 'utf8'));
const events = data.events as Row[];

const notice = (source: string, url?: string | null) => {
  const name = SOURCE_NAMES[source] ?? 'Oficiálny web športoviska';
  return `SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (${name}).${url ? ` ${url}` : ''}`;
};

const venueSql = `
INSERT INTO venues (name, address, city, sports, latitude, longitude, website_url, verified)
SELECT v.name, v.address, v.city, v.sports, v.lat, v.lng, v.website, true
FROM (VALUES
  ('Aurial Padel Bratislava', 'Bajkalská 7, Bratislava', 'Bratislava', ARRAY['PADEL'], 48.1569, 17.1402, 'https://aurialpadel.sk/turnaje'),
  ('Aurial Padel Rača', 'Na Pántoch 8, Bratislava', 'Bratislava', ARRAY['PADEL'], 48.2045, 17.1508, 'https://aurialpadel.sk/turnaje'),
  ('Form Factory FitCamp', 'Drieňová 11/A, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1562, 17.1475, 'https://fitcamp.formfactory.sk/calendar'),
  ('Form Factory Farského', 'Farského 14, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1405, 17.1338, 'https://www.formfactory.sk/eventy/'),
  ('Form Factory OC Nivy', 'Mlynské nivy 16, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1468, 17.1272, 'https://www.formfactory.sk/eventy/'),
  ('Form Factory BBC', 'Plynárenská 7/A, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1422, 17.1285, 'https://www.formfactory.sk/eventy/'),
  ('Národné tenisové centrum Bratislava', 'Trnavská cesta, Bratislava', 'Bratislava', ARRAY['TENNIS'], 48.1655, 17.1368, 'https://www.ntc.sk/'),
  ('Eurovea (Dunaj)', 'Pribinova, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1405, 17.1225, 'https://www.citylife.sk/tag/sport'),
  ('Grassalkovichova zahrada', 'Hodžovo námestie, Bratislava', 'Bratislava', ARRAY['FITNESS'], 48.1494, 17.1077, 'https://www.citylife.sk/tag/sport')
) AS v(name, address, city, sports, lat, lng, website)
WHERE NOT EXISTS (
  SELECT 1 FROM venues x WHERE x.city = v.city AND x.name ILIKE v.name
);
`;

function venueSelect(key: string): string {
  const name = VENUE_NAME[key] ?? 'Form Factory FitCamp';
  return `(SELECT id FROM venues WHERE name ILIKE ${esc(name)} ORDER BY created_at NULLS LAST LIMIT 1)`;
}

const tournamentRows = events.filter((e) => e.category === 'tournament');
const eventRows = events.filter((e) => e.category !== 'tournament');

function eventInsert(e: Row): string {
  const sourceName = SOURCE_NAMES[e.source] ?? 'Oficiálny web športoviska';
  const desc = [e.description, notice(e.source, e.sourceUrl)].filter(Boolean).join('\n\n').slice(0, 600);
  const cover = COVERS[e.sport] ?? COVERS.OTHER;
  const price = e.priceCents ?? 0;
  return `INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES (
  'official', 'open', ${esc(e.sport)}, ${sqlSportType(e.sportType)}, ${esc(e.title)}, ${esc(desc)},
  ${esc(cover)}, ${esc(e.city)}, ${esc(e.startsAt)}::timestamptz,
  ${price}, ${e.capacity ?? 'NULL'}, ${e.capacity ?? 'NULL'}, ${e.registeredCount ?? 0},
  48.1486, 17.1077, ${venueSelect(e.venueKey)},
  ${esc(e.source)}, ${esc(e.externalId)}, ${esc(e.sourceUrl ?? null)}, ${esc(sourceName)}, true,
  ${esc(e.ticketUrl ?? null)}, now(), ${esc(e.participationMode)}, ARRAY[]::text[], false
)
ON CONFLICT (source, external_id) WHERE source IS NOT NULL AND external_id IS NOT NULL
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  price_cents = EXCLUDED.price_cents,
  capacity = EXCLUDED.capacity,
  max_participants = EXCLUDED.max_participants,
  registered_count = EXCLUDED.registered_count,
  source_url = EXCLUDED.source_url,
  ticket_url = EXCLUDED.ticket_url,
  source_name = EXCLUDED.source_name,
  is_aggregated = true,
  scraped_at = now(),
  venue_id = COALESCE(EXCLUDED.venue_id, events.venue_id);`;
}

function tournamentInsert(e: Row): string {
  const desc = [e.description, notice(e.source, e.sourceUrl)].filter(Boolean).join('\n\n').slice(0, 600);
  const cover = COVERS[e.sport] ?? COVERS.OTHER;
  const price = (e.priceCents ?? 0) / 100;
  const maxP = e.capacity && e.capacity > 0 ? e.capacity : 8;
  return `INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  ${esc(e.title)}, ${esc(desc)}, ${esc(e.sport)}, 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  ${price}, ${maxP}, ${e.registeredCount ?? 0},
  ${esc(cover)}, ${esc(e.city)}, 48.1486, 17.1077, ${esc(e.startsAt)}::timestamptz, ${esc(e.startsAt)}::timestamptz,
  ${venueSelect(e.venueKey)}, ${esc(e.source)}, ${esc(e.externalId)}, ${esc(e.sourceUrl ?? null)},
  ${esc(e.ticketUrl ?? null)}, now(), now()
)
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
  venue_id = COALESCE(EXCLUDED.venue_id, tournaments.venue_id);`;
}

const parts: string[] = [venueSql, ...tournamentRows.map(tournamentInsert), ...eventRows.map(eventInsert)];
const out = join(process.cwd(), 'tmp-scrape-upsert.sql');
writeFileSync(out, parts.join('\n\n'));
console.log(JSON.stringify({
  file: out,
  venuesSeed: 1,
  tournaments: tournamentRows.length,
  events: eventRows.length,
  statements: parts.length,
}));
