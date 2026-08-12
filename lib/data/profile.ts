import { createClient } from '@/lib/supabase/server';

export interface Profile {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  preferredSports: string[];
  mercenarySports: string[];
  role: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  karmaScore: number;
  seasonPts: number;
}

interface ProfileRow {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  preferred_sports: string[] | null;
  mercenary_sports: string[] | null;
  role: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  karma_score: number | string | null;
  season_pts: number | null;
}

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url,
    bio: row.bio,
    preferredSports: row.preferred_sports ?? [],
    mercenarySports: row.mercenary_sports ?? [],
    role: row.role,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    karmaScore: Number(row.karma_score ?? 0),
    seasonPts: row.season_pts ?? 0,
  };
}

/** Reads the signed-in user's profile via Supabase (RLS), no Prisma/DATABASE_URL needed. */
export async function getProfileByAuthId(authId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', authId).maybeSingle();

  if (error || !data) return null;
  return mapProfile(data as ProfileRow);
}

/** Public profile lookup by username (authenticated users only via RLS). */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfile(data as ProfileRow);
}

export interface ProfileUpdateInput {
  fullName?: string | null;
  bio?: string | null;
  username?: string;
  preferredSports?: string[];
  mercenarySports?: string[];
}

/** Updates the signed-in user's profile fields. */
export async function updateProfile(authId: string, input: ProfileUpdateInput): Promise<Profile | null> {
  const supabase = await createClient();

  const update: Record<string, unknown> = {};
  if (input.fullName !== undefined) update.full_name = input.fullName;
  if (input.bio !== undefined) update.bio = input.bio;
  if (input.username !== undefined) update.username = input.username;
  if (input.preferredSports !== undefined) update.preferred_sports = input.preferredSports;
  if (input.mercenarySports !== undefined) update.mercenary_sports = input.mercenarySports;

  if (Object.keys(update).length === 0) {
    return getProfileByAuthId(authId);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', authId)
    .select('*')
    .single();

  if (error || !data) return null;
  return mapProfile(data as ProfileRow);
}

export async function updateProfileAvatarUrl(authId: string, avatarUrl: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', authId)
    .select('*')
    .single();

  if (error || !data) return null;
  return mapProfile(data as ProfileRow);
}

export async function updateProfileCoverUrl(authId: string, coverUrl: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .update({ cover_url: coverUrl })
    .eq('id', authId)
    .select('*')
    .single();

  if (error || !data) return null;
  return mapProfile(data as ProfileRow);
}
