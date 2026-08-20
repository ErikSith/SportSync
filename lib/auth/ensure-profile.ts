import type { User, SupabaseClient } from '@supabase/supabase-js';

/**
 * Guarantees a `profiles` row for the signed-in user before FK writes
 * (lobbies.host_id, sport_groups.owner_id, …). Covers anonymous auth and
 * trigger races where `handle_new_user` did not land yet.
 */
export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (existing.data?.id) return { ok: true };

  const email =
    (typeof user.email === 'string' && user.email.trim()) ||
    `${user.id}@anonymous.sportsync.demo`;
  const metaName =
    (typeof user.user_metadata?.username === 'string' && user.user_metadata.username.trim()) ||
    null;
  const username =
    metaName && metaName.toLowerCase() !== 'guest'
      ? metaName.slice(0, 40)
      : `guest_${user.id.replace(/-/g, '').slice(0, 12)}`;

  const roleRaw = String(user.user_metadata?.role ?? 'player').toLowerCase();
  const role =
    roleRaw === 'venue_owner' || roleRaw === 'coach' ? roleRaw.toUpperCase() : 'PLAYER';

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email,
      username,
      full_name:
        (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
        (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
        'Guest',
      role,
    },
    { onConflict: 'id' },
  );

  if (error) {
    // Unique username collision — retry with a longer suffix.
    if (/username|duplicate|unique/i.test(error.message)) {
      const retry = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email,
          username: `guest_${user.id.replace(/-/g, '').slice(0, 16)}`,
          full_name: 'Guest',
          role: 'PLAYER',
        },
        { onConflict: 'id' },
      );
      if (!retry.error) return { ok: true };
      return { ok: false, error: retry.error.message };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
