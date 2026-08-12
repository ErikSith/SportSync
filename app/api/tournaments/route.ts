import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { findCityByName } from '@/lib/cities';
import { tournamentIntentSchema } from '@/lib/ai/tournament-intent';
import { canCreateTournament } from '@/lib/auth/tournament-access';
import { resolveOrganizerVenue } from '@/lib/data/organizer-venues';
import { persistAiPlan } from '@/lib/ai/plan-executor';
import { emitDomainEvent } from '@/lib/orchestration/emit';
import { DOMAIN_EVENTS } from '@/lib/orchestration/types';
import { autoMatchPlayers } from '@/lib/matching/auto-match';

export const runtime = 'edge';

const createTournamentSchema = tournamentIntentSchema.extend({
  status: z.enum(['REGISTRATION_OPEN']).default('REGISTRATION_OPEN'),
  venueId: z.string().uuid().optional(),
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
    return NextResponse.json({ error: 'Only venue managers and admins can create tournaments.' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createTournamentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid tournament payload', issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const city = findCityByName(input.city);
  if (!city) {
    return NextResponse.json({ error: `Unsupported city "${input.city}"` }, { status: 422 });
  }

  const startsAt = new Date(input.startsAt);
  const registrationDeadline = new Date(input.registrationDeadline);
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;

  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    return NextResponse.json({ error: 'Tournament start must be in the future' }, { status: 400 });
  }
  if (Number.isNaN(registrationDeadline.getTime()) || registrationDeadline >= startsAt) {
    return NextResponse.json({ error: 'Registration deadline must be before start' }, { status: 400 });
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

  const cityName = venueResult.city ?? city.name;
  const latitude = venueResult.latitude ?? city.latitude;
  const longitude = venueResult.longitude ?? city.longitude;

  const { data: tournament, error: insertError } = await supabase
    .from('tournaments')
    .insert({
      organizer_id: auth.user.id,
      venue_id: venueResult.venueId,
      name: input.name,
      description: input.description,
      sport: input.sport,
      format: input.format,
      status: input.status,
      entry_fee: input.entryFee,
      max_participants: input.maxParticipants,
      current_participants: 0,
      skill_level_min: input.skillLevelMin,
      skill_level_max: input.skillLevelMax,
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
    return NextResponse.json({ error: insertError?.message ?? 'Could not create tournament' }, { status: 500 });
  }

  const tournamentId = tournament.id as string;

  await persistAiPlan('tournament', tournamentId, input.aiManagementPlan ?? []);

  const orchestration = await emitDomainEvent({
    name: DOMAIN_EVENTS.EVENT_CREATED,
    payload: {
      entityType: 'tournament',
      entityId: tournamentId,
      sport: input.sport,
      latitude,
      longitude,
      userId: auth.user.id,
      title: input.name,
      city: cityName,
      format: input.format,
    },
  });

  const matching = await autoMatchPlayers({
    entityType: 'tournament',
    entityId: tournamentId,
    sport: input.sport,
    title: input.name,
    city: cityName,
    latitude,
    longitude,
    excludeIds: [auth.user.id],
  });

  // Auto-generate bracket for knock-out formats
  let bracketResult: { ok: boolean; error?: string } | null = null;
  if (input.format === 'SINGLE_ELIMINATION' || input.format === 'DOUBLE_ELIMINATION') {
    const { generateBracket } = await import('@/lib/tournaments/bracket');
    bracketResult = await generateBracket(tournamentId);
  }

  revalidatePath('/tournaments');
  revalidatePath('/tournaments');

  return NextResponse.json({
    ok: true,
    tournamentId,
    orchestration,
    matching,
    bracket: bracketResult,
  });
}
