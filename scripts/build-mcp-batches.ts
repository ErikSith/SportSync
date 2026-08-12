/**
 * Emit compact multi-row upsert SQL batches from scrape JSON for Supabase MCP.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SOURCE_NAMES: Record<string, string> = {
  'aurial-padel': 'Aurial Padel Club',
  'form-factory': 'Form Factory',
  citylife: 'CityLife',
  stz: 'STZ – oficiálny web',
  predpredaj: 'Predpredaj.sk',
  'ntc-ba': 'NTC Bratislava',
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

function esc(s: string | null | undefined): string {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sportType(st: string): string {
  const allowed = new Set(['PADEL', 'TENNIS', 'FOOTBALL', 'BASKETBALL', 'ATLETIKA', 'OTHER']);
  return `'${allowed.has(st) ? st : 'OTHER'}'::"SportType"`;
}

function venueId(key: string): string {
  const name = VENUE_NAME[key] ?? 'Form Factory FitCamp';
  return `(SELECT id FROM venues WHERE name ILIKE ${esc(name)} ORDER BY created_at NULLS LAST LIMIT 1)`;
}

function notice(source: string, url?: string | null): string {
  const name = SOURCE_NAMES[source] ?? 'Oficiálny web športoviska';
  return `SportSync zobrazuje textový prehľad. Registrácia a lístky sú vždy u organizátora (${name}).${url ? ` ${url}` : ''}`;
}

function descOf(e: Row): string {
  return [e.description, notice(e.source, e.sourceUrl)].filter(Boolean).join('\n\n').slice(0, 600);
}

const data = JSON.parse(readFileSync(join(process.cwd(), 'tmp-scrape-result.json'), 'utf8'));
const all = data.events as Row[];
const tournaments = all.filter((e) => e.category === 'tournament');
const events = all.filter((e) => e.category !== 'tournament');

const outDir = join(process.cwd(), 'tmp-sql-mcp');
mkdirSync(outDir, { recursive: true });

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const tSql = tournaments
  .map((e) => {
    const price = (e.priceCents ?? 0) / 100;
    const maxP = e.capacity && e.capacity > 0 ? e.capacity : 8;
    return `(${esc(e.title)}, ${esc(descOf(e))}, ${esc(e.sport)}, 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN', ${price}, ${maxP}, ${e.registeredCount ?? 0}, ${esc(COVERS[e.sport] ?? COVERS.OTHER)}, ${esc(e.city)}, 48.1486, 17.1077, ${esc(e.startsAt)}::timestamptz, ${esc(e.startsAt)}::timestamptz, ${venueId(e.venueKey)}, ${esc(e.source)}, ${esc(e.externalId)}, ${esc(e.sourceUrl ?? null)}, ${esc(e.ticketUrl ?? null)}, now(), now())`;
  })
  .join(',\n');

writeFileSync(
  join(outDir, 'tournaments.sql'),
  `INSERT INTO tournaments (
  name, description, sport, format, status, entry_fee, max_participants, current_participants,
  cover_url, city, latitude, longitude, starts_at, registration_deadline,
  venue_id, source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES\n${tSql}
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
  venue_id = COALESCE(EXCLUDED.venue_id, tournaments.venue_id);`,
);

chunk(events, 15).forEach((batch, idx) => {
  const values = batch
    .map((e) => {
      const price = e.priceCents ?? 0;
      return `('official','open',${esc(e.sport)},${sportType(e.sportType)},${esc(e.title)},${esc(descOf(e))},${esc(COVERS[e.sport] ?? COVERS.OTHER)},${esc(e.city)},${esc(e.startsAt)}::timestamptz,${price},${e.capacity ?? 'NULL'},${e.capacity ?? 'NULL'},${e.registeredCount ?? 0},48.1486,17.1077,${venueId(e.venueKey)},${esc(e.source)},${esc(e.externalId)},${esc(e.sourceUrl ?? null)},${esc(SOURCE_NAMES[e.source] ?? 'Oficiálny web športoviska')},true,${esc(e.ticketUrl ?? null)},now(),${esc(e.participationMode)},ARRAY[]::text[],false)`;
    })
    .join(',\n');
  writeFileSync(
    join(outDir, `events-${String(idx).padStart(2, '0')}.sql`),
    `INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city, starts_at,
  price_cents, capacity, max_participants, registered_count, latitude, longitude,
  venue_id, source, external_id, source_url, source_name, is_aggregated, ticket_url,
  scraped_at, participation_mode, photos, ai_enriched
) VALUES\n${values}
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
  venue_id = COALESCE(EXCLUDED.venue_id, events.venue_id);`,
  );
});

console.log(
  JSON.stringify({
    tournaments: tournaments.length,
    events: events.length,
    eventBatches: Math.ceil(events.length / 15),
  }),
);
