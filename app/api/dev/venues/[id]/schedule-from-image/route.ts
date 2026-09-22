import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireDevAdmin } from '@/lib/auth/dev-admin';
import { extractScheduleSlotsFromImage } from '@/lib/dev/extract-schedule-from-image';
import {
  mergeAmenitiesWithSchedule,
  parseGroupClassSchedule,
  type GroupClassSchedule,
} from '@/lib/dev/group-class-schedule';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/dev/venues/[id]/schedule-from-image
 * multipart form field "image" — Gemini vision → weekly schedule (areas + slots).
 * Query: ?save=1 to write into venues.amenities.groupClassSchedule.
 * Optional form field areaId — assign all extracted slots to that area (merge into existing).
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  const { id: venueId } = await context.params;
  if (!venueId) {
    return NextResponse.json({ error: 'Missing venue id' }, { status: 400 });
  }

  const url = new URL(request.url);
  const shouldSave = url.searchParams.get('save') === '1';

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const raw = form.get('image');
  if (!raw || typeof raw === 'string') {
    return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
  }

  const targetAreaId =
    typeof form.get('areaId') === 'string' && String(form.get('areaId')).trim()
      ? String(form.get('areaId')).trim()
      : null;

  const file = raw as File;
  const mimeType = file.type || 'image/jpeg';
  const ab = await file.arrayBuffer();
  const bytes = Buffer.from(ab);

  let schedule: GroupClassSchedule;
  let model: string;
  try {
    const result = await extractScheduleSlotsFromImage({ bytes, mimeType });
    schedule = result.schedule;
    model = result.model;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = /Unsupported|too (small|large)|Missing GEMINI/i.test(msg) ? 400 : 502;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }

  const supabase = createAdminClient();
  const { data: existing, error: readErr } = await supabase
    .from('venues')
    .select('amenities')
    .eq('id', venueId)
    .maybeSingle();
  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
  }

  // If user is editing one area: pin extracted slots to that area and merge.
  if (targetAreaId) {
    const prev = parseGroupClassSchedule(
      (existing.amenities as Record<string, unknown> | null)?.groupClassSchedule,
    );
    const pinned = schedule.slots.map((s) => ({ ...s, areaId: targetAreaId }));
    const kept = prev.slots.filter((s) => s.areaId !== targetAreaId);
    schedule = {
      areas: prev.areas.length ? prev.areas : schedule.areas,
      slots: [...kept, ...pinned],
    };
  }

  if (shouldSave) {
    const amenities = mergeAmenitiesWithSchedule(existing.amenities, schedule);
    const { error: writeErr } = await supabase
      .from('venues')
      .update({ amenities, updated_at: new Date().toISOString() })
      .eq('id', venueId);
    if (writeErr) {
      return NextResponse.json({ error: writeErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    model,
    saved: shouldSave,
    slotCount: schedule.slots.length,
    areaCount: schedule.areas.length,
    areas: schedule.areas,
    slots: schedule.slots,
    schedule,
  });
}
