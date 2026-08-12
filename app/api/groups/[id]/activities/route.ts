import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { LOBBY_SPORTS } from '@/lib/constants/sports';

export const runtime = 'edge';

const planActivitySchema = z.object({
  title: z.string().min(2).max(120),
  sport: z.enum(LOBBY_SPORTS),
  scheduledAt: z.string().datetime(),
  locationNote: z.string().max(200).optional(),
  lobbyId: z.string().uuid().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from('sport_group_members')
    .select('role')
    .eq('group_id', params.id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = planActivitySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid activity payload', issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 });
  }

  if (input.lobbyId) {
    const { data: lobby, error: lobbyError } = await supabase
      .from('lobbies')
      .select('id')
      .eq('id', input.lobbyId)
      .maybeSingle();

    if (lobbyError || !lobby) {
      return NextResponse.json({ error: 'Linked lobby not found' }, { status: 404 });
    }
  }

  const { data: activity, error: activityError } = await supabase
    .from('sport_group_activities')
    .insert({
      group_id: params.id,
      created_by_id: auth.user.id,
      title: input.title.trim(),
      sport: input.sport,
      scheduled_at: scheduledAt.toISOString(),
      location_note: input.locationNote?.trim() || null,
      lobby_id: input.lobbyId ?? null,
    })
    .select('id')
    .single();

  if (activityError || !activity) {
    return NextResponse.json({ error: activityError?.message ?? 'Could not plan activity' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, activityId: activity.id });
}
