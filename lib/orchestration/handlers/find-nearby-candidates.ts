import { createClient } from '@/lib/supabase/server';
import { boundingBox, distanceKm, DEFAULT_RADIUS_KM } from '@/lib/geo';
import type { DomainEntityType } from '@/lib/orchestration/types';

export interface NearbyCandidate {
  id: string;
  username: string;
  fullName: string | null;
  distanceKm: number;
  city: string | null;
}

export interface FindNearbyCandidatesResult {
  ok: boolean;
  radiusKm: number;
  candidateCount: number;
  candidates: NearbyCandidate[];
  reason?: string;
}

interface OriginContext {
  latitude: number;
  longitude: number;
  sport: string | null;
  excludeIds: string[];
}

/**
 * Resolve geo origin for an orchestrated entity, then list profiles within 20 km.
 * Writes a platform_signal with the candidate snapshot (no notifications yet).
 */
export async function findNearbyCandidates(
  entityType: DomainEntityType,
  entityId: string,
): Promise<FindNearbyCandidatesResult> {
  const supabase = await createClient();
  const origin = await resolveOrigin(entityType, entityId);

  if (!origin) {
    const reason = 'no_origin_coordinates';
    await supabase.from('platform_signals').insert({
      event_name: 'orchestration.nearby_candidates',
      payload: {
        entityType,
        entityId,
        radiusKm: DEFAULT_RADIUS_KM,
        candidateCount: 0,
        candidates: [],
        reason,
      },
    });
    return {
      ok: false,
      radiusKm: DEFAULT_RADIUS_KM,
      candidateCount: 0,
      candidates: [],
      reason,
    };
  }

  const box = boundingBox(origin.latitude, origin.longitude, DEFAULT_RADIUS_KM);
  const exclude = new Set(origin.excludeIds.filter(Boolean));

  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, city, latitude, longitude, preferred_sports')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLng)
    .lte('longitude', box.maxLng)
    .limit(200);

  if (error) {
    const reason = `query_failed:${error.message}`;
    await supabase.from('platform_signals').insert({
      event_name: 'orchestration.nearby_candidates',
      payload: {
        entityType,
        entityId,
        radiusKm: DEFAULT_RADIUS_KM,
        candidateCount: 0,
        candidates: [],
        reason,
      },
    });
    return {
      ok: false,
      radiusKm: DEFAULT_RADIUS_KM,
      candidateCount: 0,
      candidates: [],
      reason,
    };
  }

  const sportUpper = origin.sport?.toUpperCase() ?? null;

  const candidates: NearbyCandidate[] = (rows ?? [])
    .filter((row) => {
      if (exclude.has(row.id as string)) return false;
      const lat = row.latitude as number | null;
      const lng = row.longitude as number | null;
      if (lat == null || lng == null) return false;

      const km = distanceKm(origin.latitude, origin.longitude, lat, lng);
      if (km > DEFAULT_RADIUS_KM) return false;

      if (sportUpper) {
        const preferred = (row.preferred_sports as string[] | null) ?? [];
        // Include players with no preference (open to discovery) or matching sport.
        if (preferred.length > 0 && !preferred.some((s) => s.toUpperCase() === sportUpper)) {
          return false;
        }
      }
      return true;
    })
    .map((row) => {
      const lat = row.latitude as number;
      const lng = row.longitude as number;
      return {
        id: row.id as string,
        username: row.username as string,
        fullName: (row.full_name as string | null) ?? null,
        distanceKm: Math.round(distanceKm(origin.latitude, origin.longitude, lat, lng) * 10) / 10,
        city: (row.city as string | null) ?? null,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 50);

  await supabase.from('platform_signals').insert({
    event_name: 'orchestration.nearby_candidates',
    payload: {
      entityType,
      entityId,
      sport: origin.sport,
      latitude: origin.latitude,
      longitude: origin.longitude,
      radiusKm: DEFAULT_RADIUS_KM,
      candidateCount: candidates.length,
      candidates,
      reason: candidates.length === 0 ? 'no_candidates_in_radius' : undefined,
    },
  });

  return {
    ok: true,
    radiusKm: DEFAULT_RADIUS_KM,
    candidateCount: candidates.length,
    candidates,
    reason: candidates.length === 0 ? 'no_candidates_in_radius' : undefined,
  };
}

async function resolveOrigin(
  entityType: DomainEntityType,
  entityId: string,
): Promise<OriginContext | null> {
  const supabase = await createClient();

  if (entityType === 'event') {
    const { data } = await supabase
      .from('events')
      .select('latitude, longitude, sport, organizer_id')
      .eq('id', entityId)
      .maybeSingle();
    if (!data) return null;
    const lat = data.latitude as number | null;
    const lng = data.longitude as number | null;
    if (lat == null || lng == null) return null;
    return {
      latitude: lat,
      longitude: lng,
      sport: (data.sport as string) ?? null,
      excludeIds: data.organizer_id ? [data.organizer_id as string] : [],
    };
  }

  if (entityType === 'tournament') {
    const { data } = await supabase
      .from('tournaments')
      .select('sport, organizer_id, venue_id, latitude, longitude')
      .eq('id', entityId)
      .maybeSingle();
    if (!data) return null;

    let lat = (data.latitude as number | null) ?? null;
    let lng = (data.longitude as number | null) ?? null;

    if ((lat == null || lng == null) && data.venue_id) {
      const { data: venue } = await supabase
        .from('venues')
        .select('latitude, longitude')
        .eq('id', data.venue_id as string)
        .maybeSingle();
      lat = lat ?? ((venue?.latitude as number | null) ?? null);
      lng = lng ?? ((venue?.longitude as number | null) ?? null);
    }

    if (lat == null || lng == null) return null;
    return {
      latitude: lat,
      longitude: lng,
      sport: (data.sport as string) ?? null,
      excludeIds: data.organizer_id ? [data.organizer_id as string] : [],
    };
  }

  // match — resolve from match_results + context (lobby / tournament) or participants
  const { data: match } = await supabase
    .from('match_results')
    .select('sport, context_type, context_id, participant_ids, recorded_by_id')
    .eq('id', entityId)
    .maybeSingle();

  if (!match) return null;

  const contextType = match.context_type as string;
  const contextId = match.context_id as string;
  const participantIds = (match.participant_ids as string[]) ?? [];
  const excludeIds = [
    ...participantIds,
    ...(match.recorded_by_id ? [match.recorded_by_id as string] : []),
  ];

  if (contextType === 'lobby') {
    const { data: lobby } = await supabase
      .from('lobbies')
      .select('latitude, longitude, sport')
      .eq('id', contextId)
      .maybeSingle();
    const lat = lobby?.latitude as number | null | undefined;
    const lng = lobby?.longitude as number | null | undefined;
    if (lat != null && lng != null) {
      return {
        latitude: lat,
        longitude: lng,
        sport: (lobby?.sport as string) ?? (match.sport as string) ?? null,
        excludeIds,
      };
    }
  }

  if (contextType === 'tournament') {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('sport, venue_id, latitude, longitude')
      .eq('id', contextId)
      .maybeSingle();
    let lat = (tournament?.latitude as number | null) ?? null;
    let lng = (tournament?.longitude as number | null) ?? null;
    if ((lat == null || lng == null) && tournament?.venue_id) {
      const { data: venue } = await supabase
        .from('venues')
        .select('latitude, longitude')
        .eq('id', tournament.venue_id as string)
        .maybeSingle();
      lat = lat ?? ((venue?.latitude as number | null) ?? null);
      lng = lng ?? ((venue?.longitude as number | null) ?? null);
    }
    if (lat != null && lng != null) {
      return {
        latitude: lat,
        longitude: lng,
        sport: (tournament?.sport as string) ?? (match.sport as string) ?? null,
        excludeIds,
      };
    }
  }

  // Fallback: first participant with coordinates
  if (participantIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, latitude, longitude')
      .in('id', participantIds)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(1);
    const p = profiles?.[0];
    if (p?.latitude != null && p?.longitude != null) {
      return {
        latitude: p.latitude as number,
        longitude: p.longitude as number,
        sport: (match.sport as string) ?? null,
        excludeIds,
      };
    }
  }

  return null;
}
