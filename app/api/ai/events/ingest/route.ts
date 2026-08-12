import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseStructuredEventIntent } from '@/lib/ai/event-parse-structured';
import { enrichEvent } from '@/lib/ai/event-enrich';
import { canCreateOfficialEvent } from '@/lib/auth/tournament-access';
import { findCityByName } from '@/lib/cities';
import { resolveOrganizerVenue } from '@/lib/data/organizer-venues';
import { persistAiPlan } from '@/lib/ai/plan-executor';
import { emitDomainEvent } from '@/lib/orchestration/emit';
import { DOMAIN_EVENTS } from '@/lib/orchestration/types';
import { EVENT_SPORTS } from '@/lib/constants/sports';
import { autoMatchPlayers } from '@/lib/matching/auto-match';

export const runtime = 'edge';

const sponsorSchema = z.object({
  name: z.string().min(1).max(120),
  logoUrl: z.string().url().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  tier: z.enum(['gold', 'silver', 'bronze', 'partner']).default('partner'),
});

const ingestRequestSchema = z.object({
  brief: z.string().min(12).max(4000),
  teamName: z.string().min(1).max(80).optional(),
  organizerName: z.string().min(1).max(80).optional(),
  defaultCity: z.string().optional(),
  mode: z.enum(['community', 'official']).default('community'),
  // AI-Driven Event Factory extensions (VISION.md pillar 3)
  photos: z.array(z.string().url()).max(12).default([]),
  sponsors: z.array(sponsorSchema).max(8).default([]),
  rawBrief: z.string().min(12).max(4000).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = ingestRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request payload', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle();

  const role = (profile?.role as string) ?? 'PLAYER';

  if (input.mode === 'official' && !canCreateOfficialEvent(role)) {
    return NextResponse.json(
      { ok: false, error: 'Only venue managers and admins can create official events.' },
      { status: 403 },
    );
  }

  // Step 1: Parse natural-language brief into structured intent (AI Factory)
  let intent;
  let source;
  try {
    const result = await parseStructuredEventIntent({
      brief: input.brief,
      photos: input.photos,
      organizerName: input.organizerName ?? input.teamName,
      defaultCity: input.defaultCity,
      mode: input.mode,
    });
    intent = result.intent;
    source = result.source;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not parse event brief';
    return NextResponse.json({ ok: false, error: message, source: null }, { status: 422 });
  }

  // Step 2: Resolve geo coordinates
  let cityName: string;
  let latitude: number;
  let longitude: number;
  let venueId: string | null = null;

  if (input.mode === 'official') {
    const city = findCityByName(intent.city);
    if (!city) {
      return NextResponse.json(
        { ok: false, error: `Unsupported city "${intent.city}"`, source },
        { status: 422 },
      );
    }

    const venueResult = await resolveOrganizerVenue(
      auth.user.id,
      role,
      city.name,
      undefined,
      intent.suggestedVenueHint,
    );

    if (venueResult.error) {
      return NextResponse.json({ ok: false, error: venueResult.error, source }, { status: 403 });
    }

    venueId = venueResult.venueId;
    cityName = venueResult.city ?? city.name;
    latitude = venueResult.latitude ?? city.latitude;
    longitude = venueResult.longitude ?? city.longitude;
  } else {
    const city = findCityByName(intent.city);
    if (!city) {
      return NextResponse.json(
        { ok: false, error: `Unsupported city "${intent.city}"`, source },
        { status: 422 },
      );
    }
    cityName = city.name;
    latitude = city.latitude;
    longitude = city.longitude;
  }

  // Step 3: Validate start time
  const startsAt = new Date(intent.startsAt);
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    return NextResponse.json(
      { ok: false, error: 'Event start time must be in the future', source },
      { status: 400 },
    );
  }

  // Step 4: Validate sport
  if (!EVENT_SPORTS.includes(intent.sport)) {
    return NextResponse.json(
      { ok: false, error: `Unsupported sport "${intent.sport}"`, source },
      { status: 400 },
    );
  }

  // Step 4b: Resolve structured timing + pricing
  const eventDate = new Date(intent.eventDate);
  const startTime = new Date(intent.startTime);
  const endTime = intent.endTime ? new Date(intent.endTime) : null;
  const priceCents = intent.priceCents;
  const currency = intent.currency;
  const maxParticipants = intent.maxParticipants;
  const entryRequirements = intent.entryRequirements ?? null;
  const themeConfig = intent.themeConfig ?? {};
  const sponsorsJson = intent.sponsors ?? [];

  // Step 5b: AI enrichment pass (title/description/tags/promo from raw intent)
  const rawBrief = input.rawBrief ?? input.brief;
  const enrichment = await enrichEvent({
    rawBrief,
    photos: input.photos,
    organizerName: input.organizerName ?? input.teamName,
    defaultCity: cityName,
    mode: input.mode,
  });

  // Step 5: Create the event (AI-enriched fields + photos + raw brief)
  const { data: event, error: insertError } = await supabase
    .from('events')
    .insert({
      organizer_id: auth.user.id,
      venue_id: venueId,
      type: input.mode,
      status: 'open',
      sport: intent.sport,
      title: enrichment.event.title,
      description: enrichment.event.description,
      city: cityName,
      latitude,
      longitude,
      price: priceCents / 100,
      capacity: maxParticipants,
      starts_at: startsAt.toISOString(),
      sport_type: intent.sportType,
      price_cents: priceCents,
      currency,
      event_date: eventDate.toISOString(),
      start_time: startTime.toISOString(),
      end_time: endTime ? endTime.toISOString() : null,
      max_participants: maxParticipants,
      entry_requirements: entryRequirements,
      theme_config: themeConfig,
      sponsors_json: sponsorsJson,
      raw_brief: rawBrief,
      photos: input.photos,
      ai_enriched: true,
    })
    .select('id')
    .single();

  if (insertError || !event) {
    return NextResponse.json(
      { ok: false, error: insertError?.message ?? 'Could not create event', source },
      { status: 500 },
    );
  }

  const eventId = event.id as string;

  // Step 6b: Persist sponsors attached by the venue owner
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

  // Step 6: Persist AI management plan
  await persistAiPlan('event', eventId, intent.aiManagementPlan);

  // Step 7: Emit orchestration domain event
  const orchestration = await emitDomainEvent({
    name: DOMAIN_EVENTS.EVENT_CREATED,
    payload: {
      entityType: 'event',
      entityId: eventId,
      sport: intent.sport,
      latitude,
      longitude,
      userId: auth.user.id,
      title: enrichment.event.title,
      city: cityName,
      type: input.mode,
    },
  });

  // Step 8: Auto-match nearby players
  const matching = await autoMatchPlayers({
    entityType: 'event',
    entityId: eventId,
    sport: intent.sport,
    title: enrichment.event.title,
    city: cityName,
    latitude,
    longitude,
    excludeIds: [auth.user.id],
  });

  return NextResponse.json(
    {
      ok: true,
      eventId,
      source,
      enrichmentSource: enrichment.source,
      intent: {
        title: enrichment.event.title,
        sport: intent.sport,
        city: cityName,
        startsAt: startsAt.toISOString(),
        price: priceCents / 100,
        capacity: maxParticipants,
        priceCents,
        currency,
        sportType: intent.sportType,
        eventDate: eventDate.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime ? endTime.toISOString() : null,
        maxParticipants,
        entryRequirements,
        themeConfig: themeConfig,
        sponsorsJson: sponsorsJson,
        aiManagementPlan: intent.aiManagementPlan,
        tags: enrichment.event.tags,
        promoCopy: enrichment.event.promoCopy,
        socialPost: enrichment.event.socialPost,
        photos: input.photos,
        sponsors: input.sponsors,
      },
      orchestration,
      matching,
    },
    { status: 201 },
  );
}
