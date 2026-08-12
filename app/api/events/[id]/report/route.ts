import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isEventReportReason } from '@/lib/constants/event-sources';

export const runtime = 'edge';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Pre nahlásenie sa musíte prihlásiť' }, { status: 401 });
  }

  let body: { reason?: string; details?: string | null };
  try {
    body = (await request.json()) as { reason?: string; details?: string | null };
  } catch {
    return NextResponse.json({ error: 'Neplatný request' }, { status: 400 });
  }

  const reason = body.reason?.trim() ?? '';
  if (!isEventReportReason(reason)) {
    return NextResponse.json({ error: 'Neplatný dôvod' }, { status: 400 });
  }

  const details =
    typeof body.details === 'string' && body.details.trim()
      ? body.details.trim().slice(0, 1000)
      : null;

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('id', params.id)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event neexistuje' }, { status: 404 });
  }

  const { data: report, error: insertError } = await supabase
    .from('event_reports')
    .insert({
      event_id: params.id,
      user_id: auth.user.id,
      reason,
      details,
      status: 'open',
    })
    .select('id')
    .maybeSingle();

  if (insertError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[events.report]', insertError.message);
    }
    return NextResponse.json({ error: 'Nepodarilo sa uložiť nahlásenie' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: report?.id ?? null });
}
