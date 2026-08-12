import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { LOBBY_SPORTS } from '@/lib/constants/sports';

export const runtime = 'edge';

const createScheduleSchema = z.object({
  title: z.string().min(2).max(120),
  sport: z.enum(LOBBY_SPORTS),
  dayOfWeek: z.number().int().min(0).max(6),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM 24h time'),
  locationNote: z.string().max(200).optional(),
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
  const parsed = createScheduleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid schedule payload', issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const { data: schedule, error: scheduleError } = await supabase
    .from('sport_group_recurring_schedules')
    .insert({
      group_id: params.id,
      created_by_id: auth.user.id,
      title: input.title.trim(),
      sport: input.sport,
      day_of_week: input.dayOfWeek,
      time_of_day: input.timeOfDay,
      location_note: input.locationNote?.trim() || null,
    })
    .select('id')
    .single();

  if (scheduleError || !schedule) {
    return NextResponse.json({ error: scheduleError?.message ?? 'Could not create schedule' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, scheduleId: schedule.id });
}
