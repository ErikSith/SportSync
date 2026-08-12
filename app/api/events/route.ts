import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { EVENT_SPORTS } from '@/lib/constants/sports';
import { findCityByName } from '@/lib/cities';
import { eventIntentSchema } from '@/lib/ai/event-intent';
import { canCreateOfficialEvent } from '@/lib/auth/tournament-access';
import { resolveOrganizerVenue } from '@/lib/data/organizer-venues';
import { persistAiPlan } from '@/lib/ai/plan-executor';
import { emitDomainEvent } from '@/lib/orchestration/emit';
import { DOMAIN_EVENTS } from '@/lib/orchestration/types';
import {
  getAllActiveEventsFeed,
  getNearbyEventsFeed,
  type ParticipationMode,
} from '@/lib/data/events';
import type { EventType } from '@/lib/constants/events';

export const runtime = 'edge';

/**
 * GET /api/events?lat=&lng=&sport=&type=&city=
 * Nearby discovery with 20km → 50km → all-events fallback (includes official
 * rows that have null latitude/longitude).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latRaw = searchParams.get('lat');
  const lngRaw = searchParams.get('lng');
  const lat = latRaw != null ? Number(latRaw) : NaN;
  const lng = lngRaw != null ? Number(lngRaw) : NaN;
  const sport = searchParams.get('sport') ?? undefined;
  const typeParam = searchParams.get('type')?.toLowerCase();
  const type: EventType | 'ALL' =
    typeParam === 'official' || typeParam === 'community' ? typeParam : 'ALL';
  const modeParam = searchParams.get('mode');
  const participationMode: ParticipationMode | 'all' =
    modeParam === 'spectator' || modeParam === 'participate' ? modeParam : 'all';
  const search = searchParams.get('q') ?? searchParams.get('search') ?? undefined;

  const hasGps = Number.isFinite(lat) && Number.isFinite(lng);

  const feed = hasGps
    ? await getNearbyEventsFeed({
        lat,
        lng,
        sport,
        type,
        participationMode,
        search,
        allowExtended: true,
      })
    : await getAllActiveEventsFeed({
        sport,
        type,
        participationMode,
        search,
      });

  return NextResponse.json({
    events: feed.events.map((event) => ({
      ...event,
      startsAt: event.startsAt.toISOString(),
    })),
    radius_km: feed.radiusKm,
    show_extended: feed.showExtended,
    used_all_events_fallback: Boolean(feed.usedAllEventsFallback),
    message: feed.message ?? null,
  });
}

const createEventSchema = eventIntentSchema.extend({
  type: z.enum(['community', 'official']).default('community'),
  status: z.enum(['draft', 'open']).default('open'),
  venueId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid event payload', issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle();

  const role = (profile?.role as string) ?? 'PLAYER';

  if (input.type === 'official' && !canCreateOfficialEvent(role)) {
    return NextResponse.json({ error: 'Only venue managers and admins can create official events.' }, { status: 403 });
  }

  let cityName: string;
  let latitude: number;
  let longitude: number;
  let venueId: string | null = null;

  if (input.type === 'official') {
    const city = findCityByName(input.city);
    if (!city) {
      return NextResponse.json({ error: `Unsupported city "${input.city}"` }, { status: 422 });
    }

    const venueResult = await resolveOrganizerVenue(
      auth.user.id,
      role,
      city.name,
      input.venueId,
      input.suggestedVenueHint,
    );

    if (venueResult.error) {
      return NextResponse.json({ error: venueResult.error }, { status: 403 });
    }

    venueId = venueResult.venueId;
    cityName = venueResult.city ?? city.name;
    latitude = venueResult.latitude ?? city.latitude;
    longitude = venueResult.longitude ?? city.longitude;
  } else {
    const city = findCityByName(input.city);
    if (!city) {
      return NextResponse.json({ error: `Unsupported city "${input.city}"` }, { status: 422 });
    }
    cityName = city.name;
    latitude = city.latitude;
    longitude = city.longitude;
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    return NextResponse.json({ error: 'Event start time must be in the future' }, { status: 400 });
  }

  if (!EVENT_SPORTS.includes(input.sport)) {
    return NextResponse.json({ error: 'Unsupported sport' }, { status: 400 });
  }

  const { data: event, error: insertError } = await supabase
    .from('events')
    .insert({
      organizer_id: auth.user.id,
      venue_id: venueId,
      type: input.type,
      status: input.status,
      sport: input.sport,
      title: input.title,
      description: input.description,
      city: cityName,
      latitude,
      longitude,
      price: input.price,
      capacity: input.capacity,
      starts_at: startsAt.toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !event) {
    return NextResponse.json({ error: insertError?.message ?? 'Could not create event' }, { status: 500 });
  }

  await persistAiPlan('event', event.id as string, input.aiManagementPlan);

  await emitDomainEvent({
    name: DOMAIN_EVENTS.EVENT_CREATED,
    payload: {
      entityType: 'event',
      entityId: event.id as string,
      sport: input.sport,
      latitude,
      longitude,
      userId: auth.user.id,
      title: input.title,
      city: cityName,
      type: input.type,
    },
  });

  return NextResponse.json({
    ok: true,
    eventId: event.id as string,
    aiManagementPlan: input.aiManagementPlan,
  });
}
