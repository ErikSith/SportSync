import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { broadcastMercenarySos } from '@/lib/matching/mercenary';

export const runtime = 'edge';

const sosSchema = z.object({
  lobbyId: z.string().uuid(),
});

/**
 * POST /api/lobbies/mercenary
 *
 * Broadcasts a "Mercenary SOS" for a lobby that is missing a player. The host
 * (or any participant) triggers this; the matching engine finds nearby players
 * who opted in as mercenaries for the lobby's sport and notifies them via
 * match_suggestions (reason = 'mercenary').
 *
 * The lobby must be open and have at least one free spot for the SOS to make
 * sense — we still allow it on full lobbies (the host may be about to expand).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = sosSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 });
  }

  const { lobbyId } = parsed.data;

  const { data: lobby, error: lobbyError } = await supabase
    .from('lobbies')
    .select('id, sport, title, city, status, latitude, longitude, host_id, spots_total, spots_filled, mercenary_mode')
    .eq('id', lobbyId)
    .maybeSingle();

  if (lobbyError || !lobby) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  if (lobby.status !== 'open') {
    return NextResponse.json({ error: 'Lobby is not open for mercenaries' }, { status: 409 });
  }

  // Collect existing participant ids to exclude from the SOS.
  const { data: participants } = await supabase
    .from('lobby_participants')
    .select('user_id')
    .eq('lobby_id', lobbyId);

  const excludeIds = [
    lobby.host_id as string,
    ...(participants ?? []).map((p) => p.user_id as string),
  ];

  const result = await broadcastMercenarySos({
    lobbyId,
    sport: lobby.sport as string,
    title: (lobby.title as string) ?? 'Pickup game',
    city: lobby.city as string,
    latitude: lobby.latitude as number,
    longitude: lobby.longitude as number,
    excludeIds,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'SOS broadcast failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    candidatesFound: result.candidatesFound,
    suggestionsCreated: result.suggestionsCreated,
  });
}