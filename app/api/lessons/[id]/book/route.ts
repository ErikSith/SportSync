import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: lesson, error: lessonError } = await supabase
    .from('training_lessons')
    .select('id, status, capacity, booked_count, price_per_person, starts_at, training_lesson_bookings(user_id, status)')
    .eq('id', params.id)
    .maybeSingle();

  if (lessonError || !lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  if (lesson.status !== 'SCHEDULED') {
    return NextResponse.json({ error: 'Lesson is not available for booking' }, { status: 409 });
  }

  const startsAt = new Date(lesson.starts_at as string);
  if (startsAt <= new Date()) {
    return NextResponse.json({ error: 'This lesson has already started or passed' }, { status: 409 });
  }

  const bookings = (lesson.training_lesson_bookings ?? []) as Array<{ user_id: string; status: string }>;
  if (lesson.booked_count >= lesson.capacity) {
    return NextResponse.json({ error: 'Lesson is full' }, { status: 409 });
  }
  const existing = bookings.find((b) => b.user_id === auth.user.id && b.status !== 'CANCELLED');
  if (existing) {
    return NextResponse.json({ error: 'Already booked', status: existing.status }, { status: 409 });
  }

  const price = Number(lesson.price_per_person);
  const bookingStatus = price === 0 ? 'BOOKED' : 'PENDING';

  const { error: bookError } = await supabase.from('training_lesson_bookings').insert({
    lesson_id: lesson.id,
    user_id: auth.user.id,
    status: bookingStatus,
  });

  if (bookError) {
    return NextResponse.json({ error: bookError.message }, { status: 500 });
  }

  if (bookingStatus === 'BOOKED') {
    await supabase
      .from('training_lessons')
      .update({ booked_count: lesson.booked_count + 1 })
      .eq('id', lesson.id);
  }

  return NextResponse.json({ ok: true, status: bookingStatus, price });
}
