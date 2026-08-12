import { createClient } from '@/lib/supabase/server';
import { boundingBox, distanceKm, DEFAULT_RADIUS_KM } from '@/lib/geo';
import type { DomainEntityType } from '@/lib/orchestration/types';
import { broadcastMercenarySos } from '@/lib/matching/mercenary';

export interface AutoMatchInput {
  entityType: DomainEntityType;
  entityId: string;
  sport: string;
  title: string;
  city: string;
  latitude: number;
  longitude: number;
  /** IDs to exclude (organizer, host, etc.) */
  excludeIds?: string[];
  /**
   * When true (lobby created with mercenaryMode), the engine also broadcasts
   * a Mercenary SOS to nearby players who opted in for this sport — prioritizing
   * mercenary availability per the VISION.md "Intelligent Mercenary Flow".
   */
  prioritizeMercenaries?: boolean;
}

export interface AutoMatchResult {
  ok: boolean;
  suggestionsCreated: number;
  candidatesFound: number;
  mercenarySuggestions?: number;
  error?: string;
}

/**
 * Core auto-match engine.
 *
 * After an event/tournament/lobby is created, this finds nearby players
 * whose preferred sports match the entity's sport, and creates a
 * MatchSuggestion row for each. The frontend can then query
 * match_suggestions to show a "For You" feed.
 *
 * Called from emitDomainEvent or directly from creation routes.
 */
export async function autoMatchPlayers(input: AutoMatchInput): Promise<AutoMatchResult> {
  const supabase = await createClient();
  const { entityType, entityId, sport, title, city, latitude, longitude, excludeIds = [] } = input;

  const box = boundingBox(latitude, longitude, DEFAULT_RADIUS_KM);
  const exclude = new Set(excludeIds.filter(Boolean));

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
    return { ok: false, suggestionsCreated: 0, candidatesFound: 0, error: error.message };
  }

  const sportUpper = sport.toUpperCase();

  const candidates: Array<{ id: string; distanceKm: number }> = [];

  for (const row of rows ?? []) {
    const uid = row.id as string;
    if (exclude.has(uid)) continue;

    const lat = row.latitude as number | null;
    const lng = row.longitude as number | null;
    if (lat == null || lng == null) continue;

    const km = distanceKm(latitude, longitude, lat, lng);
    if (km > DEFAULT_RADIUS_KM) continue;

    // Filter by preferred sports — include players with no preference
    const preferred = (row.preferred_sports as string[] | null) ?? [];
    if (preferred.length > 0 && !preferred.some((s) => s.toUpperCase() === sportUpper)) {
      continue;
    }

    candidates.push({ id: uid, distanceKm: Math.round(km * 10) / 10 });
  }

  if (candidates.length === 0) {
    return { ok: true, suggestionsCreated: 0, candidatesFound: 0 };
  }

  // Batch insert match suggestions
  const suggestions = candidates.map((c) => ({
    user_id: c.id,
    context_type: entityType,
    context_id: entityId,
    title,
    sport,
    city,
    distance_km: c.distanceKm,
    reason: 'nearby',
    status: 'pending',
  }));

  // Insert in batches of 50 to avoid payload size issues
  let inserted = 0;
  for (let i = 0; i < suggestions.length; i += 50) {
    const batch = suggestions.slice(i, i + 50);
    const { error: insertError } = await supabase
      .from('match_suggestions')
      .insert(batch);

    if (!insertError) {
      inserted += batch.length;
    }
  }

  // Write a platform signal for the notification layer
  await supabase.from('platform_signals').insert({
    event_name: 'matching.suggestions_created',
    payload: {
      entityType,
      entityId,
      sport,
      city,
      candidateCount: candidates.length,
      suggestionsCreated: inserted,
    },
  });

  // Mercenary prioritization: if the entity is a mercenary-enabled lobby, also
  // broadcast an SOS to players who explicitly opted in as mercenaries.
  let mercenarySuggestions: number | undefined;
  if (input.prioritizeMercenaries && entityType === 'lobby') {
    const sos = await broadcastMercenarySos({
      lobbyId: entityId,
      sport,
      title,
      city,
      latitude,
      longitude,
      excludeIds,
    });
    if (sos.ok) mercenarySuggestions = sos.suggestionsCreated;
  }

  return {
    ok: true,
    suggestionsCreated: inserted,
    candidatesFound: candidates.length,
    mercenarySuggestions,
  };
}
