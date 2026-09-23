import { createClient } from '@/lib/supabase/server';

/** Venue IDs the user follows (homepage "Tvoje obľúbené"). */
export async function getFollowedVenueIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('venue_follows')
    .select('venue_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[venue-follows.getFollowedVenueIds]', error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => row.venue_id as string | null)
    .filter((id): id is string => Boolean(id));
}

export async function isFollowingVenue(
  userId: string,
  venueId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('venue_follows')
    .select('id')
    .eq('user_id', userId)
    .eq('venue_id', venueId)
    .maybeSingle();

  if (error) {
    console.error('[venue-follows.isFollowingVenue]', error.message);
    return false;
  }
  return Boolean(data);
}

export async function followVenue(
  userId: string,
  venueId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('venue_follows').upsert(
    { user_id: userId, venue_id: venueId },
    { onConflict: 'user_id,venue_id', ignoreDuplicates: true },
  );
  if (error) {
    console.error('[venue-follows.followVenue]', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function unfollowVenue(
  userId: string,
  venueId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('venue_follows')
    .delete()
    .eq('user_id', userId)
    .eq('venue_id', venueId);

  if (error) {
    console.error('[venue-follows.unfollowVenue]', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
