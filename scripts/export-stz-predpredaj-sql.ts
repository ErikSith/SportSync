/**
 * Emit SQL upserts for STZ + Predpredaj scrapers only.
 * Usage: npx tsx scripts/export-stz-predpredaj-sql.ts > scripts/_stz_pp.sql
 */
import { scrapeStz } from '../lib/scrape/adapters/stz';
import { scrapePredpredaj } from '../lib/scrape/adapters/predpredaj';
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
  if (sport === 'BASKETBALL') return 'BASKETBALL';
  return 'OTHER';
}

function venueSql(): string {
  const seeds = VENUE_SEEDS.filter((v) =>
    ['ntc-kosice', 'ntc-bratislava', 'tipos-arena', 'tehelne-pole', 'gopass-arena'].includes(v.key),
  );
  return seeds
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

function upsertTournamentSql(e: NormalizedScrapedEvent): string {
  const venue = VENUE_SEEDS.find((v) => v.key === e.venueKey);
  const cover = e.coverUrl ?? DEFAULT_COVERS[e.sport] ?? DEFAULT_COVERS.OTHER;
  const priceCents = e.priceCents ?? 0;
  const maxParticipants = e.capacity && e.capacity > 0 ? e.capacity : 32;
  const lat = venue?.latitude ?? 48.1486;
  const lng = venue?.longitude ?? 17.1077;

  return `
DELETE FROM tournaments WHERE source = ${esc(e.source)} AND external_id = ${esc(e.externalId)};
INSERT INTO tournaments (
  organizer_id, venue_id, name, description, sport, format, status,
  entry_fee, max_participants, current_participants, cover_url, city,
  latitude, longitude, starts_at, ends_at, registration_deadline,
  source, external_id, source_url, ticket_url, scraped_at, updated_at
) VALUES (
  NULL,
  (SELECT id FROM venues WHERE name = ${esc(venue?.name ?? null)} LIMIT 1),
  ${esc(e.title)}, ${esc(e.description ?? null)}, ${esc(e.sport)}, 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
  ${priceCents / 100}, ${maxParticipants}, ${e.registeredCount ?? 0}, ${esc(cover)}, ${esc(e.city)},
  ${lat}, ${lng},
  ${esc(e.startsAt.toISOString())}::timestamptz, NULL,
  ${esc(e.startsAt.toISOString())}::timestamptz,
  ${esc(e.source)}, ${esc(e.externalId)}, ${esc(e.sourceUrl ?? null)}, ${esc(e.ticketUrl ?? null)}, now(), now()
);`;
}

async function main() {
  const [stz, pp] = await Promise.all([scrapeStz(), scrapePredpredaj()]);
  const all = [...stz.events, ...pp.events];
  const tournaments = all.filter((e) => e.category === 'tournament');
  const events = all.filter((e) => e.category !== 'tournament');

  const sql = [
    '-- STZ + Predpredaj upsert',
    venueSql(),
    '-- events',
    ...events.map(upsertEventSql),
    '-- tournaments',
    ...tournaments.map(upsertTournamentSql),
  ].join('\n');

  process.stdout.write(sql);
  process.stderr.write(
    JSON.stringify({
      stz: stz.events.length,
      predpredaj: pp.events.length,
      events: events.length,
      tournaments: tournaments.length,
    }) + '\n',
  );

  const { writeFileSync } = await import('fs');
  writeFileSync('scripts/_stz_pp.sql', sql, 'utf8');
  writeFileSync(
    'scripts/_stz_pp_meta.json',
    JSON.stringify(
      {
        stz: stz.events.length,
        predpredaj: pp.events.length,
        events: events.length,
        tournaments: tournaments.length,
      },
      null,
      2,
    ),
    'utf8',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
