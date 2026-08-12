import { createClient } from '@/lib/supabase/server';
import { boundingBox, distanceKm, DEFAULT_RADIUS_KM, EXTENDED_RADIUS_KM } from '@/lib/geo';

export interface MercenaryBroadcastInput {
  /** The lobby that is missing a player. */
  lobbyId: string;
  sport: string;
  title: string;
  city: string;
  latitude: number;
  longitude: number;
  /** IDs to exclude (host + existing participants). */
  excludeIds?: string[];
  /** When true, also search the extended 50km radius. */
  extended?: boolean;
}

export interface MercenaryBroadcastResult {
  ok: boolean;
  candidatesFound: number;
  suggestionsCreated: number;
  error?: string;
}

/**
 * Intelligent Mercenary Flow (VISION.md pillar 2 & "Living System").
 *
 * When a lobby is missing a player (mercenary_mode = true, or a crew session
 * flagged open_to_mercenaries), this broadcasts an "SOS" to nearby players who
 * explicitly opted in as mercenaries for the needed sport. Each candidate gets
 * a `match_suggestion` with `reason = 'mercenary'` so the feed can surface it
 * as a high-priority call-to-action.
 *
 * Mercenary availability is prioritized over generic proximity matching: a
 * player only receives the SOS if their `mercenary_sports` array contains the
 * lobby sport, regardless of their `preferred_sports`.
 */
export async function broadcastMercenarySos(
  input: MercenaryBroadcastInput,
): Promise<MercenaryBroadcastResult> {
  const supabase = await createClient();
  const {
    lobbyId,
    sport,
    title,
    city,
    latitude,
    longitude,
    excludeIds = [],
    extended = false,
  } = input;

  const radius = extended ? EXTENDED_RADIUS_KM : DEFAULT_RADIUS_KM;
  const box = boundingBox(latitude, longitude, radius);
  const exclude = new Set(excludeIds.filter(Boolean));
  const sportUpper = sport.toUpperCase();

  // Find players who opted in as mercenaries for this sport, within the box.
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, city, latitude, longitude, mercenary_sports')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .contains('mercenary_sports', [sportUpper])
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLng)
    .lte('longitude', box.maxLng)
    .limit(200);

  if (error) {
    return { ok: false, candidatesFound: 0, suggestionsCreated: 0, error: error.message };
  }

  const candidates: Array<{ id: string; distanceKm: number }> = [];
  for (const row of rows ?? []) {
    const uid = row.id as string;
    if (exclude.has(uid)) continue;

    const lat = row.latitude as number | null;
    const lng = row.longitude as number | null;
    if (lat == null || lng == null) continue;

    const km = distanceKm(latitude, longitude, lat, lng);
    if (km > radius) continue;

    candidates.push({ id: uid, distanceKm: Math.round(km * 10) / 10 });
  }

  if (candidates.length === 0) {
    // Retry once with the extended radius before giving up.
    if (!extended) {
      return broadcastMercenarySos({ ...input, extended: true });
    }
    return { ok: true, candidatesFound: 0, suggestionsCreated: 0 };
  }

  const suggestions = candidates.map((c) => ({
    user_id: c.id,
    context_type: 'lobby',
    context_id: lobbyId,
    title: `Mercenary call: ${title}`,
    sport,
    city,
    distance_km: c.distanceKm,
    reason: 'mercenary',
    status: 'pending',
  }));

  let inserted = 0;
  for (let i = 0; i < suggestions.length; i += 50) {
    const batch = suggestions.slice(i, i + 50);
    const { error: insertError } = await supabase.from('match_suggestions').insert(batch);
    if (!insertError) inserted += batch.length;
  }

  await supabase.from('platform_signals').insert({
    event_name: 'mercenary.sos_broadcast',
    payload: {
      lobbyId,
      sport,
      city,
      candidateCount: candidates.length,
      suggestionsCreated: inserted,
      extended,
    },
  });

  return { ok: true, candidatesFound: candidates.length, suggestionsCreated: inserted };
}