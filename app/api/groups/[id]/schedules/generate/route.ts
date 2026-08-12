import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nextOccurrence, wasGeneratedThisWeek } from '@/lib/utils/schedule';

export const runtime = 'edge';

/**
 * Simulates the "Monday morning" cron: creates a crew session for every
 * active recurring schedule that hasn't generated one yet this week. Safe
 * to call repeatedly (idempotent per ISO week) — trigger it from the UI
 * instead of needing real cron infra.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
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

  const { data: schedules, error: schedulesError } = await supabase
    .from('sport_group_recurring_schedules')
    .select('id, title, sport, day_of_week, time_of_day, location_note, is_active, last_generated_at')
    .eq('group_id', params.id)
    .eq('is_active', true);

  if (schedulesError) {
    return NextResponse.json({ error: schedulesError.message }, { status: 500 });
  }

  const now = new Date();
  const generated: { scheduleId: string; activityId: string; title: string; scheduledAt: string }[] = [];

  for (const schedule of schedules ?? []) {
    if (wasGeneratedThisWeek(schedule.last_generated_at, now)) continue;

    const scheduledAt = nextOccurrence(schedule.day_of_week, schedule.time_of_day, now);

    const { data: activity, error: activityError } = await supabase
      .from('sport_group_activities')
      .insert({
        group_id: params.id,
        created_by_id: auth.user.id,
        title: schedule.title,
        sport: schedule.sport,
        scheduled_at: scheduledAt.toISOString(),
        location_note: schedule.location_note,
      })
      .select('id')
      .single();

    if (activityError || !activity) continue;

    await supabase
      .from('sport_group_recurring_schedules')
      .update({ last_generated_at: now.toISOString() })
      .eq('id', schedule.id);

    generated.push({
      scheduleId: schedule.id,
      activityId: activity.id,
      title: schedule.title,
      scheduledAt: scheduledAt.toISOString(),
    });
  }

  return NextResponse.json({ ok: true, generated });
}
