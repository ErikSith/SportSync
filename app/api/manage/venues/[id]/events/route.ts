import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getProfileByAuthId } from '@/lib/data/profile';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { canUseVenueForOrganizer } from '@/lib/data/organizer-venues';
import { enrichEvent } from '@/lib/ai/event-enrich';
import { parseStructuredEventIntent } from '@/lib/ai/event-parse-structured';
import { emitDomainEvent } from '@/lib/orchestration/emit';
import { DOMAIN_EVENTS } from '@/lib/orchestration/types';
import { EVENT_SPORTS } from '@/lib/constants/sports';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const profile = await getProfileByAuthId(auth.user.id);
  if (!profile || !canAccessManageHub(profile.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const allowed = await canUseVenueForOrganizer(profile.id, profile.role, params.id);
  if (!allowed) {
    return NextResponse.json({ error: 'You do not have access to this venue' }, { status: 403 });
  }

  const now = new Date().toISOString();

  const [eventsResult, tournamentsResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, sport, city, type, status, price, capacity, registered_count, starts_at, created_at')
      .eq('venue_id', params.id)
      .order('starts_at', { ascending: false })
      .limit(50),
    supabase
      .from('tournaments')
      .select('id, name, sport, format, city, status, entry_fee, max_participants, current_participants, starts_at, created_at')
      .eq('venue_id', params.id)
      .order('starts_at', { ascending: false })
      .limit(20),
  ]);

  const events = (eventsResult.data ?? []).map((e) => ({
    id: e.id as string,
    kind: 'event' as const,
    title: e.title as string,
    sport: e.sport as string,
    city: e.city as string,
    type: e.type as string,
    status: e.status as string,
    price: e.price as string,
    capacity: e.capacity as number | null,
    registered: (e.registered_count as number) ?? 0,
    startsAt: e.starts_at as string,
    createdAt: e.created_at as string,
    isUpcoming: (e.starts_at as string) >= now,
  }));

  const tournaments = (tournamentsResult.data ?? []).map((t) => ({
    id: t.id as string,
    kind: 'tournament' as const,
    title: t.name as string,
    sport: t.sport as string,
    city: t.city as string,
    format: t.format as string,
    status: t.status as string,
    entryFee: t.entry_fee as string,
    maxParticipants: t.max_participants as number,
    currentParticipants: (t.current_participants as number) ?? 0,
    startsAt: t.starts_at as string,
    createdAt: t.created_at as string,
    isUpcoming: (t.starts_at as string) >= now,
  }));

  const all = [...events, ...tournaments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json({
    ok: true,
    events,
    tournaments,
    all,
    total: all.length,
  });
}

// ---------------------------------------------------------------------------
// POST: Venue Owner AI-Driven Event Factory — create an official event from
// raw intent + photos + sponsors (VISION.md pillar 3).
// ---------------------------------------------------------------------------

const createVenueEventSchema = z.object({
  title: z.string().min(3).max(120),
  sport: z.enum(EVENT_SPORTS),
  sportType: z.enum(['PADEL', 'TENNIS', 'FOOTBALL', 'BASKETBALL', 'ATLETIKA', 'OTHER']).optional(),
  description: z.string().min(10).max(2000),
  startsAt: z.string().datetime(),
  price: z.number().min(0).default(0),
  capacity: z.number().int().min(2).max(500).nullable().default(null),
  rawBrief: z.string().max(4000).optional(),
  photos: z.array(z.string().url()).max(12).default([]),
  // Structured AI-Factory fields (optional — derived from rawBrief when absent)
  priceCents: z.number().int().min(0).optional(),
  currency: z.string().min(3).max(3).default('EUR'),
  eventDate: z.string().datetime().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().nullable().optional(),
  maxParticipants: z.number().int().min(2).max(500).nullable().optional(),
  entryRequirements: z.string().max(1000).nullable().optional(),
  themeConfig: z.record(z.unknown()).optional(),
  sponsorsJson: z.array(z.record(z.unknown())).optional(),
  sponsors: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        logoUrl: z.string().url().optional().nullable(),
        websiteUrl: z.string().url().optional().nullable(),
        tier: z.enum(['gold', 'silver', 'bronze', 'partner']).default('partner'),
      }),
    )
    .max(8)
    .default([]),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const profile = await getProfileByAuthId(auth.user.id);
  if (!profile || !canAccessManageHub(profile.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const allowed = await canUseVenueForOrganizer(profile.id, profile.role, params.id);
  if (!allowed) {
    return NextResponse.json({ error: 'You do not have access to this venue' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createVenueEventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid event payload', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    return NextResponse.json({ error: 'Event start must be in the future' }, { status: 400 });
  }

  // Resolve venue geo (needed before AI parse for venue name / default city)
  const { data: venue } = await supabase
    .from('venues')
    .select('name, city, latitude, longitude')
    .eq('id', params.id)
    .maybeSingle();

  const cityName = (venue?.city as string) ?? 'Bratislava';
  const latitude = (venue?.latitude as number | null) ?? null;
  const longitude = (venue?.longitude as number | null) ?? null;

  // Resolve structured fields: if a rawBrief is present but structured fields
  // are missing, run the AI parser to fill them in.
  let sportType = input.sportType ?? 'OTHER';
  let priceCents = input.priceCents ?? Math.round(Number(input.price) * 100);
  let currency = input.currency;
  let eventDate = input.eventDate ? new Date(input.eventDate) : startsAt;
  let startTime = input.startTime ? new Date(input.startTime) : startsAt;
  let endTime = input.endTime ? new Date(input.endTime) : null;
  let maxParticipants = input.maxParticipants ?? input.capacity ?? null;
  let entryRequirements = input.entryRequirements ?? null;
  let themeConfig: Record<string, unknown> | null = input.themeConfig ?? null;
  let sponsorsJson = input.sponsorsJson ?? [];

  if (input.rawBrief && (!input.priceCents || !input.sportType || !input.themeConfig)) {
    try {
      const parsedIntent = await parseStructuredEventIntent({
        brief: input.rawBrief,
        photos: input.photos,
        organizerName: profile.fullName ?? profile.username,
        venueName: venue?.name as string | undefined,
        defaultCity: cityName,
        mode: 'official',
      });
      const i = parsedIntent.intent;
      sportType = i.sportType;
      priceCents = i.priceCents;
      currency = i.currency;
      eventDate = new Date(i.eventDate);
      startTime = new Date(i.startTime);
      endTime = i.endTime ? new Date(i.endTime) : null;
      maxParticipants = i.maxParticipants ?? input.capacity ?? null;
      entryRequirements = i.entryRequirements ?? entryRequirements;
      themeConfig = (i.themeConfig as Record<string, unknown>) ?? null;
      if (sponsorsJson.length === 0) sponsorsJson = i.sponsors ?? [];
    } catch {
      // keep heuristic/provided values
    }
  }

  // AI enrichment pass for promo/social copy
  const enrichment = await enrichEvent({
    rawBrief: input.rawBrief ?? input.description,
    photos: input.photos,
    organizerName: profile.fullName ?? profile.username,
    venueName: venue?.name as string | undefined,
    defaultCity: cityName,
    mode: 'official',
  });

  const { data: event, error: insertError } = await supabase
    .from('events')
    .insert({
      organizer_id: auth.user.id,
      venue_id: params.id,
      type: 'official',
      status: 'open',
      sport: input.sport,
      title: input.title,
      description: input.description,
      city: cityName,
      latitude,
      longitude,
      price: input.price,
      capacity: input.capacity,
      starts_at: startsAt.toISOString(),
      sport_type: sportType,
      price_cents: priceCents,
      currency,
      event_date: eventDate.toISOString(),
      start_time: startTime.toISOString(),
      end_time: endTime ? endTime.toISOString() : null,
      max_participants: maxParticipants,
      entry_requirements: entryRequirements,
      theme_config: themeConfig ?? {},
      sponsors_json: sponsorsJson,
      raw_brief: input.rawBrief ?? null,
      photos: input.photos,
      ai_enriched: true,
    })
    .select('id')
    .single();

  if (insertError || !event) {
    return NextResponse.json(
      { ok: false, error: insertError?.message ?? 'Could not create event' },
      { status: 500 },
    );
  }

  const eventId = event.id as string;

  if (input.sponsors.length > 0) {
    const { error: sponsorError } = await supabase.from('event_sponsors').insert(
      input.sponsors.map((s) => ({
        event_id: eventId,
        name: s.name,
        logo_url: s.logoUrl ?? null,
        website_url: s.websiteUrl ?? null,
        tier: s.tier,
      })),
    );
    if (sponsorError && process.env.NODE_ENV !== 'production') {
      console.error('[event-factory] sponsor insert failed', sponsorError.message);
    }
  }

  await emitDomainEvent({
    name: DOMAIN_EVENTS.EVENT_CREATED,
    payload: {
      entityType: 'event',
      entityId: eventId,
      sport: input.sport,
      latitude,
      longitude,
      userId: auth.user.id,
      title: input.title,
      city: cityName,
      type: 'official',
    },
  });

  return NextResponse.json({
    ok: true,
    eventId,
    enrichmentSource: enrichment.source,
    promoCopy: enrichment.event.promoCopy,
    socialPost: enrichment.event.socialPost,
    tags: enrichment.event.tags,
  });
}
