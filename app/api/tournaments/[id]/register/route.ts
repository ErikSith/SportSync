import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  externalRegistrationPayload,
  resolveRegistrationTarget,
} from '@/src/lib/scraper/registration-router';

export const runtime = 'edge';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ registered: false });
  }

  const { data: registration } = await supabase
    .from('tournament_registrations')
    .select('status')
    .eq('tournament_id', params.id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (!registration || registration.status === 'CANCELLED') {
    return NextResponse.json({ registered: false });
  }

  return NextResponse.json({ registered: true, status: registration.status });
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select(
      'id, status, max_participants, current_participants, entry_fee, registration_deadline, skill_level_min, skill_level_max, sport, source, source_url, ticket_url, tournament_registrations(user_id, status)',
    )
    .eq('id', params.id)
    .maybeSingle();

  if (tournamentError || !tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  const target = resolveRegistrationTarget({
    source: tournament.source,
    sourceUrl: tournament.source_url,
    ticketUrl: tournament.ticket_url,
  });
  if (target.mode === 'external') {
    return NextResponse.json(externalRegistrationPayload(target.url));
  }
  if (target.mode === 'unavailable') {
    return NextResponse.json(
      { error: 'Registrácia je len na stránke organizátora, ale odkaz chýba' },
      { status: 409 },
    );
  }

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (tournament.status !== 'REGISTRATION_OPEN') {
    return NextResponse.json({ error: 'Registration is not open' }, { status: 409 });
  }

  if (tournament.registration_deadline) {
    const deadline = new Date(tournament.registration_deadline as string);
    if (deadline <= new Date()) {
      return NextResponse.json({ error: 'Registration deadline has passed' }, { status: 409 });
    }
  }

  if (tournament.current_participants >= tournament.max_participants) {
    return NextResponse.json({ error: 'Tournament is full' }, { status: 409 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('karma_score')
    .eq('id', auth.user.id)
    .maybeSingle();

  const karma = Number(profile?.karma_score ?? 0);
  const skillMin = tournament.skill_level_min as number | null;
  const skillMax = tournament.skill_level_max as number | null;
  if (skillMin !== null && karma < skillMin) {
    return NextResponse.json({ error: 'Your skill rating is below the minimum for this tournament' }, { status: 403 });
  }
  if (skillMax !== null && karma > skillMax) {
    return NextResponse.json({ error: 'Your skill rating is above the maximum for this tournament' }, { status: 403 });
  }

  const registrations = (tournament.tournament_registrations ?? []) as Array<{
    user_id: string;
    status: string;
  }>;
  const existing = registrations.find((r) => r.user_id === auth.user.id);
  if (existing && existing.status !== 'CANCELLED') {
    return NextResponse.json({ error: 'Already registered', status: existing.status }, { status: 409 });
  }

  const entryFee = Number(tournament.entry_fee);
  const registrationStatus = entryFee === 0 ? 'CONFIRMED' : 'PENDING';

  const { error: registerError } = await supabase.from('tournament_registrations').upsert(
    {
      tournament_id: tournament.id,
      user_id: auth.user.id,
      status: registrationStatus,
    },
    { onConflict: 'tournament_id,user_id' },
  );

  if (registerError) {
    return NextResponse.json({ error: registerError.message }, { status: 500 });
  }

  if (registrationStatus === 'CONFIRMED') {
    await supabase
      .from('tournaments')
      .update({ current_participants: tournament.current_participants + 1 })
      .eq('id', tournament.id);
  }

  return NextResponse.json({ ok: true, status: registrationStatus, entryFee });
}
