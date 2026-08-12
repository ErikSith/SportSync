import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseTournamentIntent } from '@/lib/ai/tournament-intent';
import { canCreateTournament } from '@/lib/auth/tournament-access';
import { findCityByName } from '@/lib/cities';
import { resolveOrganizerVenue } from '@/lib/data/organizer-venues';
import { persistAiPlan } from '@/lib/ai/plan-executor';
import { emitDomainEvent } from '@/lib/orchestration/emit';
import { DOMAIN_EVENTS } from '@/lib/orchestration/types';
import { generateBracket } from '@/lib/tournaments/bracket';
import { autoMatchPlayers } from '@/lib/matching/auto-match';

export const runtime = 'edge';

const ingestRequestSchema = z.object({
  brief: z.string().min(12).max(4000),
  organizerName: z.string().min(1).max(80).optional(),
  defaultCity: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const role = profile.role as string;
  if (!canCreateTournament(role)) {
    return NextResponse.json(
      { ok: false, error: 'Only venue managers and admins can create tournaments.' },
      { status: 403 },
    );
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

  // Step 1: Parse natural-language brief into structured intent
  let intent;
  let source;
  try {
    const result = await parseTournamentIntent({
      brief: input.brief,
      organizerName: input.organizerName,
      defaultCity: input.defaultCity,
    });
    intent = result.intent;
    source = result.source;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not parse tournament brief';
    return NextResponse.json({ ok: false, error: message, source: null }, { status: 422 });
  }

  // Step 2: Resolve geo coordinates
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

  const cityName = venueResult.city ?? city.name;
  const latitude = venueResult.latitude ?? city.latitude;
  const longitude = venueResult.longitude ?? city.longitude;

  // Step 3: Validate dates
  const startsAt = new Date(intent.startsAt);
  const registrationDeadline = new Date(intent.registrationDeadline);
  const endsAt = intent.endsAt ? new Date(intent.endsAt) : null;

  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    return NextResponse.json(
      { ok: false, error: 'Tournament start must be in the future', source },
      { status: 400 },
    );
  }
  if (Number.isNaN(registrationDeadline.getTime()) || registrationDeadline >= startsAt) {
    return NextResponse.json(
      { ok: false, error: 'Registration deadline must be before start', source },
      { status: 400 },
    );
  }

  // Step 4: Create the tournament
  const { data: tournament, error: insertError } = await supabase
    .from('tournaments')
    .insert({
      organizer_id: auth.user.id,
      venue_id: venueResult.venueId,
      name: intent.name,
      description: intent.description,
      sport: intent.sport,
      format: intent.format,
      status: 'REGISTRATION_OPEN',
      entry_fee: intent.entryFee,
      max_participants: intent.maxParticipants,
      current_participants: 0,
      skill_level_min: intent.skillLevelMin,
      skill_level_max: intent.skillLevelMax,
      city: cityName,
      latitude,
      longitude,
      registration_deadline: registrationDeadline.toISOString(),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() ?? null,
    })
    .select('id')
    .single();

  if (insertError || !tournament) {
    return NextResponse.json(
      { ok: false, error: insertError?.message ?? 'Could not create tournament', source },
      { status: 500 },
    );
  }

  const tournamentId = tournament.id as string;

  // Step 5: Persist AI management plan
  await persistAiPlan('tournament', tournamentId, intent.aiManagementPlan);

  // Step 6: Emit orchestration domain event
  const orchestration = await emitDomainEvent({
    name: DOMAIN_EVENTS.EVENT_CREATED,
    payload: {
      entityType: 'tournament',
      entityId: tournamentId,
      sport: intent.sport,
      latitude,
      longitude,
      userId: auth.user.id,
      title: intent.name,
      city: cityName,
      format: intent.format,
    },
  });

  // Step 7: Auto-match nearby players
  const matching = await autoMatchPlayers({
    entityType: 'tournament',
    entityId: tournamentId,
    sport: intent.sport,
    title: intent.name,
    city: cityName,
    latitude,
    longitude,
    excludeIds: [auth.user.id],
  });

  // Step 8: Auto-generate bracket for knock-out formats
  let bracketResult: { ok: boolean; error?: string } | null = null;
  if (intent.format === 'SINGLE_ELIMINATION' || intent.format === 'DOUBLE_ELIMINATION') {
    bracketResult = await generateBracket(tournamentId);
  }

  revalidatePath('/tournaments');
  revalidatePath('/tournaments');

  return NextResponse.json(
    {
      ok: true,
      tournamentId,
      source,
      intent: {
        name: intent.name,
        sport: intent.sport,
        format: intent.format,
        city: cityName,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString() ?? null,
        registrationDeadline: registrationDeadline.toISOString(),
        entryFee: intent.entryFee,
        maxParticipants: intent.maxParticipants,
        skillLevelLabel: intent.skillLevelLabel,
        aiManagementPlan: intent.aiManagementPlan,
      },
      orchestration,
      matching,
      bracket: bracketResult,
    },
    { status: 201 },
  );
}