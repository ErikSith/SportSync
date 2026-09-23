import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canCreateOfficialEvent } from '@/lib/auth/tournament-access';
import { extractListingFromImage } from '@/lib/ai/extract-listing-from-image';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/ai/events/from-image
 * multipart field "image" — Gemini vision → shared manage listing fields.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (!profile || !canCreateOfficialEvent(profile.role as string)) {
    return NextResponse.json(
      { error: 'Only venue managers and admins can extract listings from photos.' },
      { status: 403 },
    );
  }

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

  const file = raw as File;
  const mimeType = file.type || 'image/jpeg';
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const { listing, model } = await extractListingFromImage({ bytes, mimeType });
    return NextResponse.json({ ok: true, model, listing });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = /Unsupported|too (small|large)|Missing GEMINI/i.test(msg) ? 400 : 502;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
