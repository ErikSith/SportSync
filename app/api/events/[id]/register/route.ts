import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: eventMeta } = await supabase
    .from('events')
    .select('id, is_aggregated, source_url, ticket_url')
    .eq('id', params.id)
    .maybeSingle();

  if (!eventMeta) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  if (eventMeta.is_aggregated) {
    return NextResponse.json(
      {
        error: 'Tento event je agregovaný — registrácia prebieha na oficiálnej stránke organizátora',
        externalUrl: eventMeta.source_url ?? eventMeta.ticket_url ?? null,
      },
      { status: 409 },
    );
  }

  // Try atomic RPC first (requires migration)
  const { data: rpcResult, error: rpcError } = await supabase.rpc('register_for_event', {
    p_event_id: params.id,
    p_user_id: auth.user.id,
  });

  if (!rpcError && rpcResult) {
    const result = rpcResult as { ok: boolean; error?: string; status?: string };
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Registration failed' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, status: result.status ?? 'confirmed' });
  }

  // Fallback: application-level registration with participant record
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, status, capacity, registered_count')
    .eq('id', params.id)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  if (event.status !== 'open' && event.status !== 'live') {
    return NextResponse.json({ error: 'Registration is not open' }, { status: 409 });
  }

  const { data: existing } = await supabase
    .from('event_registrations')
    .select('id, status')
    .eq('event_id', params.id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (existing && existing.status !== 'cancelled') {
    return NextResponse.json({ error: 'Already registered', status: existing.status }, { status: 409 });
  }

  const isFull = event.capacity !== null && event.registered_count >= event.capacity;
  const regStatus = isFull ? 'waitlisted' : 'confirmed';

  const { error: regError } = await supabase.from('event_registrations').upsert(
    {
      event_id: params.id,
      user_id: auth.user.id,
      status: regStatus,
    },
    { onConflict: 'event_id,user_id' },
  );

  if (regError) {
    return NextResponse.json({ error: regError.message }, { status: 500 });
  }

  if (regStatus === 'confirmed') {
    const newCount = event.registered_count + 1;
    const newStatus = event.capacity !== null && newCount >= event.capacity ? 'full' : event.status;
    await supabase
      .from('events')
      .update({ registered_count: newCount, status: newStatus })
      .eq('id', params.id);
  }

  return NextResponse.json({ ok: true, status: regStatus });
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ registered: false });
  }

  const { data: reg } = await supabase
    .from('event_registrations')
    .select('status')
    .eq('event_id', params.id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  return NextResponse.json({
    registered: !!reg && reg.status !== 'cancelled',
    status: reg?.status ?? null,
  });
}
