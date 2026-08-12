/**
 * Emit SQL upserts for CityLife sport scraper.
 * Usage: npx tsx scripts/export-citylife-sql.ts
 */
import { writeFileSync } from 'fs';
import { scrapeCitylife } from '../lib/scrape/adapters/citylife';
import { DEFAULT_COVERS, VENUE_SEEDS, type NormalizedScrapedEvent } from '../lib/scrape/types';
import { SPORT_TYPE_THEMES, type SportTypeKey } from '../lib/ai/theme-config';

function esc(s: string | null | undefined): string {
  if (s == null) return 'NULL';
  return `'${s.replace(/'/g, "''")}'`;
}

function toSportType(sportType: SportTypeKey, sport: string): SportTypeKey {
  const allowed: SportTypeKey[] = ['PADEL', 'TENNIS', 'FOOTBALL', 'BASKETBALL', 'ATLETIKA', 'OTHER'];
  if (allowed.includes(sportType)) return sportType;
  if (sport === 'TENNIS') return 'TENNIS';
  if (sport === 'FOOTBALL') return 'FOOTBALL';
  if (sport === 'RUNNING') return 'ATLETIKA';
  return 'OTHER';
}

function venueSql(): string {
  return VENUE_SEEDS.filter((v) => v.key.startsWith('citylife-'))
    .map((v) => {
      const sports = v.sports.map((s) => esc(s)).join(',');
      return `
INSERT INTO venues (name, address, city, sports, latitude, longitude, website_url, verified)
SELECT ${esc(v.name)}, ${esc(v.address)}, ${esc(v.city)}, ARRAY[${sports}]::text[], ${v.latitude}, ${v.longitude}, ${esc(v.websiteUrl)}, true
WHERE NOT EXISTS (SELECT 1 FROM venues WHERE name = ${esc(v.name)} AND city = ${esc(v.city)});`;
    })
    .join('\n');
}

function upsertEventSql(e: NormalizedScrapedEvent): string {
  const venue = VENUE_SEEDS.find((v) => v.key === e.venueKey);
  const sportType = toSportType(e.sportType, e.sport);
  const theme = SPORT_TYPE_THEMES[sportType] ?? SPORT_TYPE_THEMES.OTHER;
  const themeJson = JSON.stringify({
    accent: theme.accent,
    accentSoft: theme.accentSoft,
    gradient: theme.gradient,
    label: theme.label,
  });
  const cover = e.coverUrl ?? DEFAULT_COVERS[e.sport] ?? DEFAULT_COVERS.OTHER;
  const priceCents = e.priceCents ?? 0;
  const lat = venue?.latitude ?? 48.1486;
  const lng = venue?.longitude ?? 17.1077;
  const cap = e.capacity == null ? 'NULL' : String(e.capacity);

  return `
DELETE FROM events WHERE source = ${esc(e.source)} AND external_id = ${esc(e.externalId)};
INSERT INTO events (
  type, status, sport, sport_type, title, description, cover_url, city,
  price, price_cents, currency, capacity, max_participants, registered_count,
  starts_at, event_date, start_time, latitude, longitude, venue_id,
  source, external_id, source_url, ticket_url, scraped_at, participation_mode,
  theme_config, ai_enriched, photos, sponsors_json
) VALUES (
  'official', 'open', ${esc(e.sport)}, ${esc(sportType)}::"SportType",
  ${esc(e.title)}, ${esc(e.description ?? null)}, ${esc(cover)}, ${esc(e.city)},
  ${priceCents / 100}, ${priceCents}, 'EUR', ${cap}, ${cap}, ${e.registeredCount ?? 0},
  ${esc(e.startsAt.toISOString())}::timestamptz,
  ${esc(e.startsAt.toISOString())}::timestamptz,
  ${esc(e.startsAt.toISOString())}::timestamptz,
  ${lat}, ${lng},
  (SELECT id FROM venues WHERE name = ${esc(venue?.name ?? null)} LIMIT 1),
  ${esc(e.source)}, ${esc(e.externalId)}, ${esc(e.sourceUrl ?? null)}, ${esc(e.ticketUrl ?? null)}, now(),
  ${esc(e.participationMode)}, ${esc(themeJson)}::jsonb, false, '{}'::text[], '[]'::jsonb
);`;
}

async function main() {
  const result = await scrapeCitylife();
  if (result.error) {
    console.error('scrape error', result.error);
    process.exitCode = 1;
  }

  const sql = ['-- CityLife sport upsert', venueSql(), ...result.events.map(upsertEventSql)].join(
    '\n',
  );

  writeFileSync('scripts/_citylife.sql', sql, 'utf8');

  const { writeFileSync: wfs } = await import('fs');
  const parts = sql.split(/(?=DELETE FROM )/);
  let i = 0;
  for (const p of parts) {
    if (!p.trim()) continue;
    i += 1;
    wfs(`scripts/_citylife_chunk_${String(i).padStart(2, '0')}.sql`, p.trim(), 'utf8');
  }

  for (const e of result.events) {
    console.log(e.participationMode, e.startsAt.toISOString().slice(0, 10), e.title);
  }
  console.log(JSON.stringify({ count: result.events.length, chunks: i, error: result.error ?? null }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
