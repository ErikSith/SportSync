/**
 * Edge-safe direct Supabase queries for discovery feeds.
 * Never uses internal HTTP (`fetch('/api/events')`) — call from Server Components.
 */

import { createClient } from '@/lib/supabase/server';
import { getSupabaseAnonEnv } from '@/lib/supabase/env';
import { distanceKm } from '@/lib/geo';
import { activeFeedSinceIso } from '@/lib/retention/feed-window';
import { parseDbInstant } from '@/lib/datetime/bratislava';
import {
  ALL_EVENTS_FALLBACK_MESSAGE,
  type EventCardData,
  type EventFeedResult,
  type ParticipationMode,
} from '@/lib/data/events';
import type { EventType } from '@/lib/constants/events';

interface RawEventRow {
  id: string;
  title: string;
  description: string | null;
  sport: string;
  sport_type: string | null;
  type: string;
  city: string;
  starts_at: string;
  price: number | string;
  price_cents: number | null;
  currency: string | null;
  cover_url: string | null;
  status: string;
  capacity: number | null;
  max_participants: number | null;
  registered_count: number;
  latitude: number | null;
  longitude: number | null;
  venue_id: string | null;
  theme_config: Record<string, unknown> | null;
  participation_mode?: string | null;
  ticket_url?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  source?: string | null;
  external_id?: string | null;
  is_aggregated?: boolean | null;
  for_kids?: boolean | null;
  venues?: { name: string } | { name: string }[] | null;
}

function venueName(venues: RawEventRow['venues']): string | null {
  if (!venues) return null;
  return Array.isArray(venues) ? (venues[0]?.name ?? null) : venues.name;
}

function mapRow(event: RawEventRow, lat: number, lng: number): EventCardData {
  const dist =
    event.latitude != null && event.longitude != null
      ? distanceKm(lat, lng, event.latitude, event.longitude)
      : 0;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    sport: event.sport,
    sportType: event.sport_type ?? 'OTHER',
    type: event.type === 'community' ? 'community' : 'official',
    city: event.city,
    startsAt: parseDbInstant(event.starts_at),
    price: Number(event.price),
    priceCents: event.price_cents ?? Math.round(Number(event.price) * 100),
    currency: event.currency ?? 'EUR',
    coverUrl: event.cover_url,
    status: event.status,
    capacity: event.capacity,
    maxParticipants: event.max_participants ?? null,
    registeredCount: event.registered_count ?? 0,
    distanceKm: Math.round(dist * 10) / 10,
    latitude: event.latitude,
    longitude: event.longitude,
    venueId: event.venue_id,
    venueName: venueName(event.venues),
    themeConfig: event.theme_config ?? {},
    participationMode: event.participation_mode === 'spectator' ? 'spectator' : 'participate',
    ticketUrl: event.ticket_url ?? null,
    sourceUrl: event.source_url ?? null,
    sourceName: event.source_name ?? null,
    source: event.source ?? null,
    externalId: event.external_id ?? null,
    isAggregated: Boolean(event.is_aggregated),
    forKids: Boolean(event.for_kids),
  };
}

export interface FetchActiveEventsOptions {
  lat?: number | null;
  lng?: number | null;
  type?: EventType | 'ALL';
  participationMode?: ParticipationMode | 'all';
  /** Soft date floor; when empty, retries without it. Default: grace window. */
  requireUpcoming?: boolean;
  limit?: number;
}

/**
 * Fetch all active open/live events (including rows with null lat/lng).
 * Never throws — logs and returns [] on failure.
 */
export async function fetchActiveEventsSafe(
  options: FetchActiveEventsOptions = {},
): Promise<EventCardData[]> {
  const lat = options.lat != null && Number.isFinite(options.lat) ? options.lat : 48.1486;
  const lng = options.lng != null && Number.isFinite(options.lng) ? options.lng : 17.1077;
  const limit = options.limit ?? 120;
  const requireUpcoming = options.requireUpcoming !== false;

  try {
    const { isConfigured } = getSupabaseAnonEnv();
    if (!isConfigured) {
      console.error(
        'fetchActiveEventsSafe: Supabase env not configured (set NEXT_PUBLIC_SUPABASE_* or SUPABASE_URL/SUPABASE_ANON_KEY on Cloudflare)',
      );
      return [];
    }

    const supabase = await createClient();

    const runQuery = async (withVenues: boolean, withStartsAtFloor: boolean) => {
      let request = supabase
        .from('events')
        .select(withVenues ? '*, venues(name)' : '*')
        .in('status', ['open', 'live'])
        .order('starts_at', { ascending: true })
        .limit(limit);

      if (withStartsAtFloor) {
        request = request.gte('starts_at', activeFeedSinceIso());
      }
      if (options.type && options.type !== 'ALL') {
        request = request.eq('type', options.type);
      }
      if (options.participationMode && options.participationMode !== 'all') {
        request = request.eq('participation_mode', options.participationMode);
      }

      return request;
    };

    // 1) Prefer join for venue names
    let { data, error } = await runQuery(true, requireUpcoming);

    // 2) Join can fail under RLS — retry without venues embed
    if (error) {
      console.error('fetchActiveEventsSafe query error (with venues):', error);
      ({ data, error } = await runQuery(false, requireUpcoming));
    }

    if (error) {
      console.error('fetchActiveEventsSafe query error:', error);
      return [];
    }

    let rows = (data ?? []) as unknown as RawEventRow[];

    // 3) If date floor emptied the feed, retry status-only (still includes null coords)
    if (rows.length === 0 && requireUpcoming) {
      console.error(
        'fetchActiveEventsSafe: 0 rows with starts_at floor — retrying without date filter',
      );
      const retry = await runQuery(true, false);
      if (retry.error) {
        console.error('fetchActiveEventsSafe loose query error:', retry.error);
        const retryBare = await runQuery(false, false);
        if (retryBare.error) {
          console.error('fetchActiveEventsSafe loose bare query error:', retryBare.error);
          return [];
        }
        rows = (retryBare.data ?? []) as unknown as RawEventRow[];
      } else {
        rows = (retry.data ?? []) as unknown as RawEventRow[];
      }
    }

    return rows.map((row) => mapRow(row, lat, lng));
  } catch (error) {
    console.error('fetchActiveEventsSafe unexpected error:', error);
    return [];
  }
}

/** EventFeedResult wrapper for the events tab + API-compatible callers. */
export async function getAllActiveEventsFeedSafe(
  options: FetchActiveEventsOptions = {},
): Promise<EventFeedResult> {
  const events = await fetchActiveEventsSafe(options);
  return {
    events,
    radiusKm: 0,
    showExtended: true,
    usedAllEventsFallback: true,
    message: ALL_EVENTS_FALLBACK_MESSAGE,
  };
}
