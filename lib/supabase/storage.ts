import { createClient } from '@/lib/supabase/server';

export const PROFILE_MEDIA_BUCKET = 'profile-media';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

export function validateProfileImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return 'Image must be JPEG, PNG, WebP, or GIF';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Image must be 5 MB or smaller';
  }
  return null;
}

export async function uploadProfileImage(
  userId: string,
  file: File,
  kind: 'avatar' | 'cover',
): Promise<{ publicUrl: string } | { error: string }> {
  const validationError = validateProfileImage(file);
  if (validationError) return { error: validationError };

  const ext = extensionForMime(file.type);
  const path = `${userId}/${kind}.${ext}`;
  const supabase = await createClient();

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  // Same object path on re-upload — bust CDN/browser cache so the new image shows.
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
  return { publicUrl };
}
