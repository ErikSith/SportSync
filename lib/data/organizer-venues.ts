import { createClient } from '@/lib/supabase/server';

export interface OrganizerVenueOption {
  id: string;
  name: string;
  city: string;
}

/** Venues owned by the signed-in venue manager (VENUE_OWNER). */
export async function getOwnedVenuesForProfile(profileId: string): Promise<OrganizerVenueOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('venues')
    .select('id, name, city')
    .eq('owner_id', profileId)
    .order('name', { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    city: row.city as string,
  }));
}

/** All venues for ADMIN; owned venues for VENUE_OWNER. */
export async function getVenuesForOrganizer(profileId: string, role: string): Promise<OrganizerVenueOption[]> {
  if (role === 'ADMIN') {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('venues')
      .select('id, name, city')
      .order('city', { ascending: true })
      .order('name', { ascending: true });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      city: row.city as string,
    }));
  }

  return getOwnedVenuesForProfile(profileId);
}

/** Returns true when the profile owns the venue. Admins may use any venue. */
export async function canUseVenueForOrganizer(
  profileId: string,
  role: string,
  venueId: string,
): Promise<boolean> {
  if (role === 'ADMIN') return true;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('venues')
    .select('id')
    .eq('id', venueId)
    .eq('owner_id', profileId)
    .maybeSingle();

  return !error && Boolean(data);
}

/** @deprecated Use canUseVenueForOrganizer */
export async function canUseVenueForTournament(
  profileId: string,
  role: string,
  venueId: string,
): Promise<boolean> {
  return canUseVenueForOrganizer(profileId, role, venueId);
}

export interface ResolvedVenue {
  venueId: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  error?: string;
}

/** Resolve venue for official events/tournaments. */
export async function resolveOrganizerVenue(
  profileId: string,
  role: string,
  city: string,
  venueId?: string,
  hint?: string | null,
): Promise<ResolvedVenue> {
  const supabase = await createClient();

  if (role === 'VENUE_OWNER') {
    if (!venueId) {
      return { venueId: null, city: null, latitude: null, longitude: null, error: 'Venue owners must select a venue.' };
    }
    const allowed = await canUseVenueForOrganizer(profileId, role, venueId);
    if (!allowed) {
      return {
        venueId: null,
        city: null,
        latitude: null,
        longitude: null,
        error: 'You can only create at venues you manage.',
      };
    }

    const { data: venue } = await supabase
      .from('venues')
      .select('id, city, latitude, longitude')
      .eq('id', venueId)
      .maybeSingle();

    if (!venue) {
      return { venueId: null, city: null, latitude: null, longitude: null, error: 'Venue not found.' };
    }

    return {
      venueId: venue.id as string,
      city: venue.city as string,
      latitude: venue.latitude as number | null,
      longitude: venue.longitude as number | null,
    };
  }

  if (venueId) {
    const { data } = await supabase
      .from('venues')
      .select('id, city, latitude, longitude')
      .eq('id', venueId)
      .maybeSingle();
    if (data?.id) {
      return {
        venueId: data.id as string,
        city: data.city as string,
        latitude: data.latitude as number | null,
        longitude: data.longitude as number | null,
      };
    }
  }

  if (hint) {
    const { data: hinted } = await supabase
      .from('venues')
      .select('id, city, latitude, longitude')
      .ilike('city', city)
      .ilike('name', `%${hint}%`)
      .limit(1)
      .maybeSingle();
    if (hinted?.id) {
      return {
        venueId: hinted.id as string,
        city: hinted.city as string,
        latitude: hinted.latitude as number | null,
        longitude: hinted.longitude as number | null,
      };
    }
  }

  const { data: fallback } = await supabase
    .from('venues')
    .select('id, city, latitude, longitude')
    .ilike('city', city)
    .limit(1)
    .maybeSingle();

  if (fallback?.id) {
    return {
      venueId: fallback.id as string,
      city: fallback.city as string,
      latitude: fallback.latitude as number | null,
      longitude: fallback.longitude as number | null,
    };
  }

  return { venueId: null, city: null, latitude: null, longitude: null };
}
