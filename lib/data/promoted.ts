import { createClient } from '@/lib/supabase/server';
import type { EventCardData } from '@/lib/data/events';
import type { TournamentCardData } from '@/lib/data/tournaments';
import { sportColor } from '@/lib/utils/sport-icons';
import type { PromotedBannerItem } from '@/lib/data/promoted-types';
import { parseDbInstant } from '@/lib/datetime/bratislava';

export type { PromotedBannerItem, PromotedKind } from '@/lib/data/promoted-types';

const PROMOTED_SLOT_LIMIT = 8;

interface VenueSnippet {
  name: string;
  city?: string;
}

function resolveVenue(venues: VenueSnippet | VenueSnippet[] | null | undefined): VenueSnippet | null {
  if (!venues) return null;
  return Array.isArray(venues) ? (venues[0] ?? null) : venues;
}

function formatPrice(price: number, priceCents?: number | null): string {
  if (priceCents != null && priceCents > 0) {
    return `€${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`;
  }
  if (price > 0) return `€${price}`;
  return 'Free';
}

function normalizeBadge(raw: string | null | undefined, fallback: string): string {
  const t = raw?.trim();
  return t && t.length > 0 ? t.toUpperCase() : fallback;
}

function resolveAccent(sport: string, accent: string | null | undefined): string {
  const hex = accent?.trim();
  if (hex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return hex;
  return sportColor(sport);
}

/** Active paid promotions — events + tournaments, freshest `promotedUntil` first. */
export async function getActivePromotedBanners(
  take = PROMOTED_SLOT_LIMIT,
): Promise<PromotedBannerItem[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [eventsRes, tournamentsRes] = await Promise.all([
    supabase
      .from('events')
      .select('*, venues(name, city)')
      .eq('is_promoted', true)
      .gt('promoted_until', nowIso)
      .in('status', ['open', 'live'])
      .order('promoted_until', { ascending: false })
      .limit(take),
    supabase
      .from('tournaments')
      .select('*, venues(name, city)')
      .eq('is_promoted', true)
      .gt('promoted_until', nowIso)
      .in('status', ['REGISTRATION_OPEN', 'IN_PROGRESS'])
      .order('promoted_until', { ascending: false })
      .limit(take),
  ]);

  if (eventsRes.error && process.env.NODE_ENV !== 'production') {
    console.error('[promoted.events]', eventsRes.error.message);
  }
  if (tournamentsRes.error && process.env.NODE_ENV !== 'production') {
    console.error('[promoted.tournaments]', tournamentsRes.error.message);
  }

  const eventItems: PromotedBannerItem[] = ((eventsRes.data ?? []) as Array<Record<string, unknown>>).map(
    (row) => {
      const venue = resolveVenue(row.venues as VenueSnippet | VenueSnippet[] | null);
      const price = Number(row.price ?? 0);
      const priceCents = (row.price_cents as number | null) ?? Math.round(price * 100);
      const sport = String(row.sport ?? 'OTHER');
      const startsAt = parseDbInstant(String(row.starts_at));
      const promotedUntil = new Date(String(row.promoted_until));
      const city = String(row.city ?? venue?.city ?? '');
      const eventCard: EventCardData = {
        id: String(row.id),
        title: String(row.title),
        description: (row.description as string | null) ?? null,
        sport,
        sportType: String(row.sport_type ?? 'OTHER'),
        type: row.type === 'community' ? 'community' : 'official',
        city,
        startsAt,
        price,
        priceCents,
        currency: String(row.currency ?? 'EUR'),
        coverUrl: (row.cover_url as string | null) ?? null,
        capacity: (row.capacity as number | null) ?? null,
        maxParticipants: (row.max_participants as number | null) ?? null,
        registeredCount: Number(row.registered_count ?? 0),
        status: String(row.status ?? 'open'),
        distanceKm: 0,
        venueId: (row.venue_id as string | null) ?? null,
        venueName: venue?.name ?? null,
        latitude: (row.latitude as number | null) ?? null,
        longitude: (row.longitude as number | null) ?? null,
        themeConfig: (row.theme_config as Record<string, unknown> | null) ?? {},
        participationMode: row.participation_mode === 'spectator' ? 'spectator' : 'participate',
        ticketUrl: (row.ticket_url as string | null) ?? null,
        sourceUrl: (row.source_url as string | null) ?? null,
        sourceName: (row.source_name as string | null) ?? null,
        source: (row.source as string | null) ?? null,
        externalId: (row.external_id as string | null) ?? null,
        isAggregated: Boolean(row.is_aggregated),
        forKids: Boolean(row.for_kids),
        isDiscovery: false,
      };

      return {
        id: `event:${eventCard.id}`,
        kind: 'event' as const,
        title: eventCard.title,
        sport,
        startsAt,
        venueName: eventCard.venueName,
        city,
        priceLabel: formatPrice(price, priceCents),
        coverUrl: eventCard.coverUrl,
        sponsorLogoUrl: (row.sponsor_logo_url as string | null) ?? null,
        sponsorName: (row.sponsor_name as string | null) ?? null,
        badgeText: normalizeBadge(row.badge_text as string | null, 'PROMOTED'),
        accentColor: resolveAccent(sport, row.accent_color as string | null),
        promotedUntil,
        event: eventCard,
        tournament: null,
      };
    },
  );

  const tournamentItems: PromotedBannerItem[] = (
    (tournamentsRes.data ?? []) as Array<Record<string, unknown>>
  ).map((row) => {
    const venue = resolveVenue(row.venues as VenueSnippet | VenueSnippet[] | null);
    const entryFee = Number(row.entry_fee ?? 0);
    const sport = String(row.sport ?? 'OTHER');
    const startsAt = parseDbInstant(String(row.starts_at));
    const promotedUntil = new Date(String(row.promoted_until));
    const city = String(row.city || venue?.city || '');
    const tournamentCard: TournamentCardData = {
      id: String(row.id),
      name: String(row.name),
      description: (row.description as string | null) ?? null,
      sport,
      format: String(row.format ?? 'SINGLE_ELIMINATION'),
      status: String(row.status ?? 'REGISTRATION_OPEN'),
      entryFee,
      currentParticipants: Number(row.current_participants ?? 0),
      maxParticipants: Number(row.max_participants ?? 0),
      coverUrl: (row.cover_url as string | null) ?? null,
      startsAt,
      endsAt: row.ends_at ? new Date(String(row.ends_at)) : null,
      registrationDeadline: row.registration_deadline
        ? new Date(String(row.registration_deadline))
        : null,
      venueId: (row.venue_id as string | null) ?? null,
      venueName: venue?.name ?? null,
      venueCity: venue?.city ?? (city || null),
      venueAddress: null,
      venueLatitude: (row.latitude as number | null) ?? null,
      venueLongitude: (row.longitude as number | null) ?? null,
      skillLevelMin: (row.skill_level_min as number | null) ?? null,
      skillLevelMax: (row.skill_level_max as number | null) ?? null,
      source: (row.source as string | null) ?? null,
      sourceUrl: (row.source_url as string | null) ?? null,
      ticketUrl: (row.ticket_url as string | null) ?? null,
      isAggregated: Boolean(row.source),
    };

    return {
      id: `tournament:${tournamentCard.id}`,
      kind: 'tournament' as const,
      title: tournamentCard.name,
      sport,
      startsAt,
      venueName: tournamentCard.venueName,
      city,
      priceLabel: formatPrice(entryFee),
      coverUrl: tournamentCard.coverUrl,
      sponsorLogoUrl: (row.sponsor_logo_url as string | null) ?? null,
      sponsorName: (row.sponsor_name as string | null) ?? null,
      badgeText: normalizeBadge(row.badge_text as string | null, 'SPONSORED'),
      accentColor: resolveAccent(sport, row.accent_color as string | null),
      promotedUntil,
      event: null,
      tournament: tournamentCard,
    };
  });

  return [...eventItems, ...tournamentItems]
    .sort((a, b) => b.promotedUntil.getTime() - a.promotedUntil.getTime())
    .slice(0, take);
}
