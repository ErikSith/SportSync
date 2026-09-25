import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProfileByAuthId } from '@/lib/data/profile';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { uploadListingBanner } from '@/lib/supabase/storage';

export const runtime = 'edge';

/** Venue-owner only — upload a banner for one manage listing. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const profile = await getProfileByAuthId(auth.user.id);
  if (!profile || !canAccessManageHub(profile.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const raw = formData?.get('file');
  if (!(raw instanceof Blob) || raw.size === 0) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  const file =
    raw instanceof File
      ? raw
      : new File([raw as BlobPart], 'banner', {
          type: (raw as { type?: string }).type || 'image/jpeg',
        });

  const result = await uploadListingBanner(auth.user.id, file);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, coverUrl: result.publicUrl });
}
