import { createClient } from '@/lib/supabase/server';
import {
  normalizeSportSkills,
  parseSportSkills,
  type SportSkillsMap,
} from '@/lib/profile/sport-skills';
import type { Profile } from '@/lib/data/profile-shared';

export type { Profile } from '@/lib/data/profile-shared';

interface ProfileRow {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  preferred_sports: string[] | null;
  sport_skills?: unknown;
  mercenary_sports: string[] | null;
  role: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  karma_score: number | string | null;
  season_pts: number | null;
}

export function mapProfile(row: ProfileRow): Profile {
  const preferredSports = row.preferred_sports ?? [];
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url,
    bio: row.bio,
    preferredSports,
    sportSkills: normalizeSportSkills(preferredSports, parseSportSkills(row.sport_skills)),
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
  sportSkills?: SportSkillsMap;
  mercenarySports?: string[];
}

export type ProfileUpdateResult =
  | { ok: true; profile: Profile }
  | { ok: false; error: string };

function normalizePreferredSports(sports: string[] | undefined): string[] | undefined {
  if (sports === undefined) return undefined;
  return [...new Set(sports.map((s) => s.trim().toUpperCase()).filter(Boolean))];
}

/** Updates the signed-in user's profile fields. */
export async function updateProfile(
  authId: string,
  input: ProfileUpdateInput,
): Promise<ProfileUpdateResult> {
  const supabase = await createClient();

  const current = await getProfileByAuthId(authId);
  if (!current) return { ok: false, error: 'Profile not found' };

  const preferredSports = normalizePreferredSports(input.preferredSports);
  const mercenarySports = normalizePreferredSports(input.mercenarySports);

  const update: Record<string, unknown> = {};
  if (input.fullName !== undefined) update.full_name = input.fullName;
  if (input.bio !== undefined) update.bio = input.bio;
  if (input.username !== undefined) update.username = input.username.trim();
  if (mercenarySports !== undefined) update.mercenary_sports = mercenarySports;

  const nextPreferred = preferredSports ?? current.preferredSports;
  if (preferredSports !== undefined) {
    update.preferred_sports = preferredSports;
  }

  if (input.sportSkills !== undefined || preferredSports !== undefined) {
    update.sport_skills = normalizeSportSkills(nextPreferred, {
      ...current.sportSkills,
      ...(input.sportSkills ?? {}),
    });
  }

  if (Object.keys(update).length === 0) {
    return { ok: true, profile: current };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', authId)
    .select('*')
    .single();

  if (error || !data) {
    // Unique username collision
    if (error && /profiles_username|duplicate key|unique/i.test(error.message)) {
      return { ok: false, error: 'This username is already taken' };
    }
    // Remote DB may lag Prisma — retry without optional columns that might be missing.
    if (error && /schema cache|column .* does not exist/i.test(error.message)) {
      const optionalKeys = ['sport_skills', 'preferred_sports', 'mercenary_sports', 'bio', 'cover_url'] as const;
      const rest = { ...update };
      for (const key of optionalKeys) {
        if (error.message.includes(key)) delete rest[key];
      }
      if (Object.keys(rest).length === 0) return { ok: true, profile: current };
      const fallback = await supabase.from('profiles').update(rest).eq('id', authId).select('*').single();
      if (fallback.error || !fallback.data) {
        return { ok: false, error: fallback.error?.message ?? 'Could not update profile' };
      }
      return { ok: true, profile: mapProfile(fallback.data as ProfileRow) };
    }
    return { ok: false, error: error?.message ?? 'Could not update profile' };
  }
  return { ok: true, profile: mapProfile(data as ProfileRow) };
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
