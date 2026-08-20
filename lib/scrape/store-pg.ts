import type { Client } from 'pg';
import { SPORT_TYPE_THEMES } from '@/lib/ai/theme-config';
import { sourceDisplayName } from '@/lib/constants/event-sources';
import { resolveEventCover } from '@/lib/media/cover-factory';
import { aggregatorNotice, SCRAPE_ETHICS } from '@/lib/scrape/ethics';
import { classifyListingAudience } from '@/lib/events/audience';
import { boroughSlugForEvent, tagScrapedEventLocation } from '@/lib/scrape/tag-location';
import {
  DEFAULT_COVERS,
  VENUE_SEEDS,
  type NormalizedScrapedEvent,
} from '@/lib/scrape/types';
import { withPgAdmin } from '@/lib/db/pg';
import {
  pickSoftIdentityMatch,
  softMatchWindow,
} from '@/lib/scrape/dedupe-identity';

type UpsertStats = { created: number; updated: number; skipped: number; unchanged: number };

let audienceColumnsAvailable: boolean | null = null;

async function supportsAudienceColumns(client: Client): Promise<boolean> {
  if (audienceColumnsAvailable != null) return audienceColumnsAvailable;
  try {
    const res = await client.query(
      `select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'events' and column_name = 'for_women'
       limit 1`,
    );
    audienceColumnsAvailable = (res.rowCount ?? 0) > 0;
  } catch {
    audienceColumnsAvailable = false;
  }
  return audienceColumnsAvailable;
}

function skillFromTitle(title: string): { min: number | null; max: number | null } {
  if (/kategorie\s*[-–]?\s*d\b|za[cč]iato[cč]/i.test(title)) return { min: 1, max: 2 };
  if (/kategorie\s*[-–]?\s*c\b|mierne/i.test(title)) return { min: 2, max: 3 };
  if (/kategorie\s*[-–]?\s*b\b|pokro[cč]il/i.test(title) && !/expert/i.test(title)) {
    return { min: 3, max: 4 };
  }
  if (/kategorie\s*[-–]?\s*a\b|expert/i.test(title)) return { min: 4, max: 5 };
  return { min: null, max: null };
}

function isoEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

function strEq(a: unknown, b: unknown): boolean {
  const left = a == null || a === '' ? null : String(a);
  const right = b == null || b === '' ? null : String(b);
  return left === right;
}

function numEq(a: unknown, b: unknown): boolean {
  const left = a == null ? null : Number(a);
  const right = b == null ? null : Number(b);
  if (left === null && right === null) return true;
  if (left === null || right === null) return false;
  return left === right;
}

async function coverForEvent(
  event: NormalizedScrapedEvent,
  venueId: string | null,
): Promise<string> {
  if (SCRAPE_ETHICS.allowThirdPartyMedia && event.coverUrl && event.requiresAiGraphic === false) {
    return event.coverUrl;
  }
  try {
    return await resolveEventCover({
      venueId,
      sport: event.sport,
      title: event.title,
    });
  } catch {
    return DEFAULT_COVERS[event.sport] ?? DEFAULT_COVERS.OTHER ?? DEFAULT_COVERS.FITNESS!;
  }
}

function withAggregatorDescription(
  event: NormalizedScrapedEvent,
  sourceName: string,
): string | null {
  const base = (event.description ?? '').trim();
  const notice = aggregatorNotice(sourceName, event.sourceUrl ?? event.ticketUrl);
  if (!base) return notice;
  if (base.includes('SportSync zobrazuje textový prehľad')) return base.slice(0, 600);
  return `${base.slice(0, 400)}\n\n${notice}`.slice(0, 600);
}

async function syncVenueBorough(
  client: Client,
  venueId: string | null,
  event: NormalizedScrapedEvent,
): Promise<void> {
  if (!venueId) return;
  const districtSlug = boroughSlugForEvent(event);
  if (!districtSlug) return;
  await client.query(`update venues set district = $1 where id = $2::uuid`, [
    districtSlug,
    venueId,
  ]);
}

export async function ensureVenuesPg(): Promise<Map<string, string>> {
  return withPgAdmin(async (client) => {
    const map = new Map<string, string>();

    for (const seed of VENUE_SEEDS) {
      const existing = await client.query<{ id: string }>(
        `select id from venues where city = $1 and name ilike $2 limit 1`,
        [seed.city, seed.name],
      );

      if (existing.rows[0]?.id) {
        await client.query(
          `update venues set
             website_url = $1,
             latitude = $2,
             longitude = $3,
             address = $4,
             sports = $5,
             district = coalesce($6, district)
           where id = $7::uuid`,
          [
            seed.websiteUrl,
            seed.latitude,
            seed.longitude,
            seed.address,
            seed.sports,
            seed.district ?? null,
            existing.rows[0].id,
          ],
        );
        map.set(seed.key, existing.rows[0].id);
        continue;
      }

      const created = await client.query<{ id: string }>(
        `insert into venues (
           name, address, city, sports, latitude, longitude, website_url, verified, district
         ) values ($1,$2,$3,$4,$5,$6,$7,true,$8)
         returning id`,
        [
          seed.name,
          seed.address,
          seed.city,
          seed.sports,
          seed.latitude,
          seed.longitude,
          seed.websiteUrl,
          seed.district ?? null,
        ],
      );

      if (!created.rows[0]?.id) {
        console.error('[scrape.ensureVenuesPg]', seed.key, 'insert failed');
        continue;
      }
      map.set(seed.key, created.rows[0].id);
    }

    return map;
  });
}

export async function upsertEventsPg(
  events: NormalizedScrapedEvent[],
  venueIds: Map<string, string>,
): Promise<UpsertStats> {
  const stats: UpsertStats = { created: 0, updated: 0, skipped: 0, unchanged: 0 };

  await withPgAdmin(async (client) => {
    const hasAudience = await supportsAudienceColumns(client);

    for (const raw of events) {
      try {
        const event = tagScrapedEventLocation(raw);
        const venueId = venueIds.get(event.venueKey) ?? null;
        const venue = VENUE_SEEDS.find((v) => v.key === event.venueKey);
        const theme = SPORT_TYPE_THEMES[event.sportType] ?? SPORT_TYPE_THEMES.OTHER;
        const priceCents = event.priceCents ?? 0;
        const sourceName = sourceDisplayName(event.source);
        const description = withAggregatorDescription(event, sourceName);
        const startsAt = event.startsAt.toISOString();
        await syncVenueBorough(client, venueId, event);

        const existingRes = await client.query<{
          id: string;
          title: string | null;
          sport: string | null;
          starts_at: string;
          price_cents: number | null;
          capacity: number | null;
          registered_count: number | null;
          venue_id: string | null;
          source_url: string | null;
          ticket_url: string | null;
          participation_mode: string | null;
          is_aggregated: boolean | null;
          cover_url: string | null;
          for_kids: boolean | null;
          for_women: boolean | null;
        }>(
          hasAudience
            ? `select id, title, sport, starts_at, price_cents, capacity, registered_count,
                    venue_id, source_url, ticket_url, participation_mode, is_aggregated, cover_url,
                    for_kids, for_women
               from events
               where source = $1 and external_id = $2
               limit 1`
            : `select id, title, sport, starts_at, price_cents, capacity, registered_count,
                    venue_id, source_url, ticket_url, participation_mode, is_aggregated, cover_url,
                    false as for_kids, false as for_women
               from events
               where source = $1 and external_id = $2
               limit 1`,
          [event.source, event.externalId],
        );
        const existing = existingRes.rows[0];
        const { forKids, forWomen } = classifyListingAudience({
          title: event.title,
          description,
          sourceUrl: event.sourceUrl,
          venueName: venue?.name ?? event.locationName,
          sourceName,
          locationName: event.locationName,
          forKids: event.forKids,
          forWomen: event.forWomen,
        });

        if (!existing?.id) {
          const window = softMatchWindow(event.startsAt);
          const nearRes = await client.query<{ id: string; title: string | null; starts_at: string }>(
            `select id, title, starts_at::text as starts_at
               from events
              where starts_at >= $1::timestamptz
                and starts_at <= $2::timestamptz
                and status is distinct from 'cancelled'
              limit 25`,
            [window.from, window.to],
          );
          const soft = pickSoftIdentityMatch(nearRes.rows, event.title, event.startsAt);
          if (soft?.id) {
            await client.query(`update events set scraped_at = now() where id = $1::uuid`, [
              soft.id,
            ]);
            stats.unchanged += 1;
            continue;
          }
        }

        if (existing?.id) {
          const same =
            strEq(existing.title, event.title) &&
            strEq(existing.sport, event.sport) &&
            isoEqual(existing.starts_at, startsAt) &&
            numEq(existing.price_cents, priceCents) &&
            numEq(existing.capacity, event.capacity ?? null) &&
            numEq(existing.registered_count, event.registeredCount ?? 0) &&
            strEq(existing.venue_id, venueId) &&
            strEq(existing.source_url, event.sourceUrl ?? null) &&
            strEq(existing.ticket_url, event.ticketUrl ?? null) &&
            strEq(existing.participation_mode, event.participationMode) &&
            (!hasAudience ||
              (Boolean(existing.for_kids) === forKids &&
                Boolean(existing.for_women) === forWomen)) &&
            Boolean(existing.is_aggregated) === SCRAPE_ETHICS.isAggregatedRedirector;

          if (same) {
            await client.query(`update events set scraped_at = now() where id = $1::uuid`, [
              existing.id,
            ]);
            stats.unchanged += 1;
            continue;
          }
        }

        let cover = existing?.cover_url
          ? String(existing.cover_url)
          : await coverForEvent(event, venueId);

        if (existing?.id) {
          const identityChanged =
            !strEq(existing.title, event.title) ||
            !strEq(existing.sport, event.sport) ||
            !strEq(existing.venue_id, venueId);
          if (identityChanged || !existing.cover_url) {
            cover = await coverForEvent(event, venueId);
          }

          await client.query(
            hasAudience
              ? `update events set
               type = 'official',
               status = 'open',
               sport = $2,
               sport_type = $3::"SportType",
               title = $4,
               description = $5,
               cover_url = $6,
               city = $7,
               starts_at = $8::timestamptz,
               event_date = $8::timestamptz,
               start_time = $8::timestamptz,
               price = $9,
               price_cents = $10,
               currency = 'EUR',
               capacity = $11,
               max_participants = $11,
               registered_count = $12,
               latitude = $13,
               longitude = $14,
               venue_id = $15::uuid,
               organizer_id = null,
               source = $16,
               external_id = $17,
               source_url = $18,
               source_name = $19,
               is_aggregated = $20,
               ticket_url = $21,
               scraped_at = now(),
               participation_mode = $22,
               theme_config = $23::jsonb,
               for_kids = $24,
               for_women = $25,
               ai_enriched = false,
               photos = '{}',
               sponsors_json = '[]'::jsonb
             where id = $1::uuid`
              : `update events set
               type = 'official',
               status = 'open',
               sport = $2,
               sport_type = $3::"SportType",
               title = $4,
               description = $5,
               cover_url = $6,
               city = $7,
               starts_at = $8::timestamptz,
               event_date = $8::timestamptz,
               start_time = $8::timestamptz,
               price = $9,
               price_cents = $10,
               currency = 'EUR',
               capacity = $11,
               max_participants = $11,
               registered_count = $12,
               latitude = $13,
               longitude = $14,
               venue_id = $15::uuid,
               organizer_id = null,
               source = $16,
               external_id = $17,
               source_url = $18,
               source_name = $19,
               is_aggregated = $20,
               ticket_url = $21,
               scraped_at = now(),
               participation_mode = $22,
               theme_config = $23::jsonb,
               ai_enriched = false,
               photos = '{}',
               sponsors_json = '[]'::jsonb
             where id = $1::uuid`,
            hasAudience
              ? [
                  existing.id,
                  event.sport,
                  event.sportType,
                  event.title,
                  description,
                  cover,
                  event.city,
                  startsAt,
                  priceCents / 100,
                  priceCents,
                  event.capacity ?? null,
                  event.registeredCount ?? 0,
                  venue?.latitude ?? 48.1486,
                  venue?.longitude ?? 17.1077,
                  venueId,
                  event.source,
                  event.externalId,
                  event.sourceUrl ?? null,
                  sourceName,
                  SCRAPE_ETHICS.isAggregatedRedirector,
                  event.ticketUrl ?? null,
                  event.participationMode,
                  JSON.stringify(theme),
                  forKids,
                  forWomen,
                ]
              : [
                  existing.id,
                  event.sport,
                  event.sportType,
                  event.title,
                  description,
                  cover,
                  event.city,
                  startsAt,
                  priceCents / 100,
                  priceCents,
                  event.capacity ?? null,
                  event.registeredCount ?? 0,
                  venue?.latitude ?? 48.1486,
                  venue?.longitude ?? 17.1077,
                  venueId,
                  event.source,
                  event.externalId,
                  event.sourceUrl ?? null,
                  sourceName,
                  SCRAPE_ETHICS.isAggregatedRedirector,
                  event.ticketUrl ?? null,
                  event.participationMode,
                  JSON.stringify(theme),
                ],
          );
          stats.updated += 1;
          continue;
        }

        await client.query(
          hasAudience
            ? `insert into events (
             type, status, sport, sport_type, title, description, cover_url, city,
             starts_at, event_date, start_time, price, price_cents, currency,
             capacity, max_participants, registered_count, latitude, longitude,
             venue_id, organizer_id, source, external_id, source_url, source_name,
             is_aggregated, ticket_url, scraped_at, participation_mode, theme_config,
             for_kids, for_women, ai_enriched, photos, sponsors_json
           ) values (
             'official', 'open', $1, $2::"SportType", $3, $4, $5, $6,
             $7::timestamptz, $7::timestamptz, $7::timestamptz, $8, $9, 'EUR',
             $10, $10, $11, $12, $13,
             $14::uuid, null, $15, $16, $17, $18,
             $19, $20, now(), $21, $22::jsonb,
             $23, $24, false, '{}', '[]'::jsonb
           )`
            : `insert into events (
             type, status, sport, sport_type, title, description, cover_url, city,
             starts_at, event_date, start_time, price, price_cents, currency,
             capacity, max_participants, registered_count, latitude, longitude,
             venue_id, organizer_id, source, external_id, source_url, source_name,
             is_aggregated, ticket_url, scraped_at, participation_mode, theme_config,
             ai_enriched, photos, sponsors_json
           ) values (
             'official', 'open', $1, $2::"SportType", $3, $4, $5, $6,
             $7::timestamptz, $7::timestamptz, $7::timestamptz, $8, $9, 'EUR',
             $10, $10, $11, $12, $13,
             $14::uuid, null, $15, $16, $17, $18,
             $19, $20, now(), $21, $22::jsonb,
             false, '{}', '[]'::jsonb
           )`,
          hasAudience
            ? [
                event.sport,
                event.sportType,
                event.title,
                description,
                cover,
                event.city,
                startsAt,
                priceCents / 100,
                priceCents,
                event.capacity ?? null,
                event.registeredCount ?? 0,
                venue?.latitude ?? 48.1486,
                venue?.longitude ?? 17.1077,
                venueId,
                event.source,
                event.externalId,
                event.sourceUrl ?? null,
                sourceName,
                SCRAPE_ETHICS.isAggregatedRedirector,
                event.ticketUrl ?? null,
                event.participationMode,
                JSON.stringify(theme),
                forKids,
                forWomen,
              ]
            : [
                event.sport,
                event.sportType,
                event.title,
                description,
                cover,
                event.city,
                startsAt,
                priceCents / 100,
                priceCents,
                event.capacity ?? null,
                event.registeredCount ?? 0,
                venue?.latitude ?? 48.1486,
                venue?.longitude ?? 17.1077,
                venueId,
                event.source,
                event.externalId,
                event.sourceUrl ?? null,
                sourceName,
                SCRAPE_ETHICS.isAggregatedRedirector,
                event.ticketUrl ?? null,
                event.participationMode,
                JSON.stringify(theme),
              ],
        );
        stats.created += 1;
      } catch (error) {
        console.error(
          '[scrape.upsertEventsPg]',
          error instanceof Error ? error.message : error,
        );
        stats.skipped += 1;
      }
    }
  });

  return stats;
}

export async function upsertTournamentsPg(
  tournaments: NormalizedScrapedEvent[],
  venueIds: Map<string, string>,
): Promise<UpsertStats> {
  const stats: UpsertStats = { created: 0, updated: 0, skipped: 0, unchanged: 0 };

  await withPgAdmin(async (client) => {
    for (const raw of tournaments) {
      try {
        const item = tagScrapedEventLocation(raw);
        const venueId = venueIds.get(item.venueKey) ?? null;
        const venue = VENUE_SEEDS.find((v) => v.key === item.venueKey);
        const priceCents = item.priceCents ?? 0;
        const skill = skillFromTitle(item.title);
        const maxParticipants = item.capacity && item.capacity > 0 ? item.capacity : 8;
        const sourceName = sourceDisplayName(item.source);
        const description = withAggregatorDescription(item, sourceName);
        const startsAt = item.startsAt.toISOString();
        await syncVenueBorough(client, venueId, item);
        const { forKids, forWomen } = classifyListingAudience({
          title: item.title,
          description,
          sourceUrl: item.sourceUrl,
          venueName: venue?.name ?? item.locationName,
          sourceName,
          locationName: item.locationName,
          forKids: item.forKids,
          forWomen: item.forWomen,
        });

        const existingRes = await client.query<{
          id: string;
          name: string | null;
          sport: string | null;
          starts_at: string;
          entry_fee: number | null;
          max_participants: number | null;
          current_participants: number | null;
          venue_id: string | null;
          source_url: string | null;
          ticket_url: string | null;
          cover_url: string | null;
          for_kids: boolean | null;
          for_women: boolean | null;
        }>(
          `select id, name, sport, starts_at, entry_fee, max_participants, current_participants,
                  venue_id, source_url, ticket_url, cover_url, for_kids, for_women
           from tournaments
           where source = $1 and external_id = $2
           limit 1`,
          [item.source, item.externalId],
        );
        const existing = existingRes.rows[0];

        if (existing?.id) {
          const same =
            strEq(existing.name, item.title) &&
            strEq(existing.sport, item.sport) &&
            isoEqual(existing.starts_at, startsAt) &&
            numEq(existing.entry_fee, priceCents / 100) &&
            numEq(existing.max_participants, maxParticipants) &&
            numEq(existing.current_participants, item.registeredCount ?? 0) &&
            strEq(existing.venue_id, venueId) &&
            strEq(existing.source_url, item.sourceUrl ?? null) &&
            strEq(existing.ticket_url, item.ticketUrl ?? null) &&
            Boolean(existing.for_kids) === forKids &&
            Boolean(existing.for_women) === forWomen;

          if (same) {
            await client.query(`update tournaments set scraped_at = now() where id = $1::uuid`, [
              existing.id,
            ]);
            stats.unchanged += 1;
            continue;
          }
        }

        const cover =
          existing?.cover_url &&
          strEq(existing.name, item.title) &&
          strEq(existing.sport, item.sport) &&
          strEq(existing.venue_id, venueId)
            ? String(existing.cover_url)
            : await coverForEvent(item, venueId);

        if (existing?.id) {
          await client.query(
            `update tournaments set
               organizer_id = null,
               venue_id = $2::uuid,
               name = $3,
               description = $4,
               sport = $5,
               format = 'SINGLE_ELIMINATION',
               status = 'REGISTRATION_OPEN',
               skill_level_min = $6,
               skill_level_max = $7,
               entry_fee = $8,
               max_participants = $9,
               current_participants = $10,
               cover_url = $11,
               city = $12,
               latitude = $13,
               longitude = $14,
               starts_at = $15::timestamptz,
               ends_at = null,
               registration_deadline = $15::timestamptz,
               source = $16,
               external_id = $17,
               source_url = $18,
               ticket_url = $19,
               for_kids = $20,
               for_women = $21,
               scraped_at = now(),
               updated_at = now()
             where id = $1::uuid`,
            [
              existing.id,
              venueId,
              item.title,
              description,
              item.sport,
              skill.min,
              skill.max,
              priceCents / 100,
              maxParticipants,
              item.registeredCount ?? 0,
              cover,
              item.city,
              venue?.latitude ?? 48.1486,
              venue?.longitude ?? 17.1077,
              startsAt,
              item.source,
              item.externalId,
              item.sourceUrl ?? null,
              item.ticketUrl ?? null,
              forKids,
              forWomen,
            ],
          );
          stats.updated += 1;
          continue;
        }

        await client.query(
          `insert into tournaments (
             organizer_id, venue_id, name, description, sport, format, status,
             skill_level_min, skill_level_max, entry_fee, max_participants, current_participants,
             cover_url, city, latitude, longitude, starts_at, ends_at, registration_deadline,
             source, external_id, source_url, ticket_url, for_kids, for_women, scraped_at, updated_at
           ) values (
             null, $1::uuid, $2, $3, $4, 'SINGLE_ELIMINATION', 'REGISTRATION_OPEN',
             $5, $6, $7, $8, $9,
             $10, $11, $12, $13, $14::timestamptz, null, $14::timestamptz,
             $15, $16, $17, $18, $19, $20, now(), now()
           )`,
          [
            venueId,
            item.title,
            description,
            item.sport,
            skill.min,
            skill.max,
            priceCents / 100,
            maxParticipants,
            item.registeredCount ?? 0,
            cover,
            item.city,
            venue?.latitude ?? 48.1486,
            venue?.longitude ?? 17.1077,
            startsAt,
            item.source,
            item.externalId,
            item.sourceUrl ?? null,
            item.ticketUrl ?? null,
            forKids,
            forWomen,
          ],
        );
        stats.created += 1;
      } catch (error) {
        console.error(
          '[scrape.upsertTournamentsPg]',
          error instanceof Error ? error.message : error,
        );
        stats.skipped += 1;
      }
    }
  });

  return stats;
}
