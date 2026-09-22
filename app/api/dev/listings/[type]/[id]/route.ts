import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireDevAdmin } from '@/lib/auth/dev-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ type: string; id: string }> };

const EVENT_STATUSES = new Set([
  'draft',
  'open',
  'full',
  'live',
  'completed',
  'cancelled',
]);

const TOURNAMENT_STATUSES = new Set([
  'DRAFT',
  'REGISTRATION_OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  // also accept lowercase variants from UI
  'draft',
  'registration_open',
  'in_progress',
  'completed',
  'cancelled',
]);

/**
 * PATCH /api/dev/listings/[type]/[id]
 * type = event | tournament
 * Body: { status?, forKids?, forWomen?, participationMode? }
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  const { type, id } = await context.params;
  if (!id || (type !== 'event' && type !== 'tournament')) {
    return NextResponse.json({ error: 'type must be event|tournament' }, { status: 400 });
  }

  let body: {
    status?: unknown;
    forKids?: unknown;
    forWomen?: unknown;
    participationMode?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if ('forKids' in body) {
    if (typeof body.forKids !== 'boolean') {
      return NextResponse.json({ error: 'forKids must be boolean' }, { status: 400 });
    }
    update.for_kids = body.forKids;
  }
  if ('forWomen' in body) {
    if (typeof body.forWomen !== 'boolean') {
      return NextResponse.json({ error: 'forWomen must be boolean' }, { status: 400 });
    }
    update.for_women = body.forWomen;
  }
  if ('status' in body) {
    if (typeof body.status !== 'string') {
      return NextResponse.json({ error: 'status must be string' }, { status: 400 });
    }
    const status = body.status.trim();
    if (type === 'event') {
      if (!EVENT_STATUSES.has(status)) {
        return NextResponse.json({ error: 'Invalid event status' }, { status: 400 });
      }
      update.status = status;
    } else {
      if (!TOURNAMENT_STATUSES.has(status)) {
        return NextResponse.json({ error: 'Invalid tournament status' }, { status: 400 });
      }
      // Prisma enum is uppercase
      update.status = status.toUpperCase();
    }
  }
  if ('participationMode' in body) {
    if (type !== 'event') {
      return NextResponse.json(
        { error: 'participationMode only applies to events' },
        { status: 400 },
      );
    }
    if (body.participationMode !== 'spectator' && body.participationMode !== 'participate') {
      return NextResponse.json(
        { error: 'participationMode must be spectator|participate' },
        { status: 400 },
      );
    }
    update.participation_mode = body.participationMode;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (type === 'event') {
    const { data, error } = await supabase
      .from('events')
      .update(update)
      .eq('id', id)
      .select('id, title, status, participation_mode, for_kids, for_women')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      type: 'event',
      id: data.id,
      title: data.title,
      status: data.status,
      participationMode: data.participation_mode,
      forKids: data.for_kids,
      forWomen: data.for_women,
    });
  }

  const { data, error } = await supabase
    .from('tournaments')
    .update(update)
    .eq('id', id)
    .select('id, name, status, for_kids, for_women')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    type: 'tournament',
    id: data.id,
    title: data.name,
    status: data.status,
    forKids: data.for_kids,
    forWomen: data.for_women,
  });
}
