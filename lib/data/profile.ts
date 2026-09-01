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
  phone_number: string | null;
  is_phone_verified: boolean | null;
  is_email_verified: boolean | null;
  is_2fa_enabled: boolean | null;
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
    phoneNumber: row.phone_number ?? null,
    isPhoneVerified: row.is_phone_verified ?? false,
    isEmailVerified: row.is_email_verified ?? false,
    is2faEnabled: row.is_2fa_enabled ?? false,
  };
}

/** Reads the signed-in user's profile via Supabase (RLS), no Prisma/DATABASE_URL needed. */
export async function getProfileByAuthId(authId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', authId).maybeSingle();

  if (error || !data) return null;
  return mapProfile(data as ProfileRow);
}

const PUBLIC_PROFILE_COLUMNS =
  'id, email, username, full_name, avatar_url, cover_url, bio, preferred_sports, sport_skills, mercenary_sports, role, city, latitude, longitude, karma_score, season_pts, is_email_verified, is_2fa_enabled';

/** Returns true if another account already uses this phone number. */
export async function isPhoneNumberInUse(phone: string, excludeAuthId?: string): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase.from('profiles').select('id').eq('phone_number', phone).limit(1);
  if (excludeAuthId) query = query.neq('id', excludeAuthId);
  const { data, error } = await query;
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

/** Public profile lookup by username — phone number is never exposed. */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('username', username)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfile({ ...(data as ProfileRow), phone_number: null, is_phone_verified: false });
}

export interface ProfileUpdateInput {
  fullName?: string | null;
  bio?: string | null;
  username?: string;
  preferredSports?: string[];
  sportSkills?: SportSkillsMap;
  mercenarySports?: string[];
  phoneNumber?: string | null;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  is2faEnabled?: boolean;
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

  if (input.phoneNumber !== undefined) update.phone_number = input.phoneNumber;
  if (input.isPhoneVerified !== undefined) update.is_phone_verified = input.isPhoneVerified;
  if (input.isEmailVerified !== undefined) update.is_email_verified = input.isEmailVerified;
  if (input.is2faEnabled !== undefined) update.is_2fa_enabled = input.is2faEnabled;

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
    const dbMessage = formatDbError(error, 'Nepodarilo sa aktualizovať profil.');
    // Unique username / phone collision
    if (error && /profiles_username|duplicate key|unique/i.test(error.message ?? '')) {
      if (/phone_number|profiles_phone/i.test(error.message ?? '')) {
        return { ok: false, error: 'Toto telefónne číslo je už zaregistrované na inom účte.' };
      }
      return { ok: false, error: 'This username is already taken' };
    }
    // Remote DB may lag Prisma — retry without optional columns that might be missing.
    if (error && /schema cache|column .* does not exist/i.test(error.message ?? '')) {
      const optionalKeys = [
        'sport_skills',
        'preferred_sports',
        'mercenary_sports',
        'bio',
        'cover_url',
        'phone_number',
        'is_phone_verified',
        'is_email_verified',
        'is_2fa_enabled',
      ] as const;
      const rest = { ...update };
      for (const key of optionalKeys) {
        if (error.message.includes(key)) delete rest[key];
      }
      if (Object.keys(rest).length === 0) {
        const missingPhone = 'phone_number' in update && !('phone_number' in rest);
        if (missingPhone) {
          return {
            ok: false,
            error:
              'Stĺpec phone_number ešte nie je v databáze. Spusti migráciu prisma/migrations/20260901_profile_verification.',
          };
        }
        return { ok: true, profile: current };
      }
      const fallback = await supabase.from('profiles').update(rest).eq('id', authId).select('*').single();
      if (fallback.error || !fallback.data) {
        return { ok: false, error: formatDbError(fallback.error, 'Nepodarilo sa aktualizovať profil.') };
      }
      return { ok: true, profile: mapProfile(fallback.data as ProfileRow) };
    }
    return { ok: false, error: dbMessage };
  }
  return { ok: true, profile: mapProfile(data as ProfileRow) };
}

function formatDbError(
  error: { message?: string; details?: string; hint?: string; code?: string } | null,
  fallback: string,
): string {
  if (!error) return fallback;
  const candidates = [error.message, error.details, error.hint, error.code];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim() && value.trim() !== '{}') {
      return value.trim();
    }
  }
  return fallback;
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
