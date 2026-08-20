import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateProfileAvatarUrl } from '@/lib/data/profile';
import { uploadProfileImage } from '@/lib/supabase/storage';

export const runtime = 'edge';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const raw = formData?.get('file');
  // FormDataEntryValue is File | string; some runtimes still hand back a plain Blob.
  if (!(raw instanceof Blob) || raw.size === 0) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  const file =
    raw instanceof File
      ? raw
      : new File([raw as BlobPart], 'avatar', {
          type: (raw as { type?: string }).type || 'image/jpeg',
        });

  const result = await uploadProfileImage(auth.user.id, file, 'avatar');
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const profile = await updateProfileAvatarUrl(auth.user.id, result.publicUrl);
  if (!profile) {
    return NextResponse.json({ error: 'Could not update profile' }, { status: 500 });
  }

  return NextResponse.json({ profile, avatarUrl: result.publicUrl });
}
