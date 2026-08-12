import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { LOBBY_FORMATS } from '@/lib/constants/lobbies';
import { LOBBY_SPORTS } from '@/lib/constants/sports';
import { findCityByName } from '@/lib/cities';
import { autoMatchPlayers } from '@/lib/matching/auto-match';

export const runtime = 'edge';

const createLobbySchema = z.object({
  sport: z.enum(LOBBY_SPORTS),
  format: z.enum(LOBBY_FORMATS),
  city: z.string().min(1),
  scheduledAt: z.string().datetime(),
  spotsTotal: z.number().int().min(2).max(10),
  mercenaryMode: z.boolean().default(false),
  venueId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createLobbySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid lobby payload', issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const city = findCityByName(input.city);
  if (!city) {
    return NextResponse.json({ error: `Unsupported city "${input.city}"` }, { status: 422 });
  }

  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 });
  }

  const { data: lobby, error: lobbyError } = await supabase
    .from('lobbies')
    .insert({
      host_id: auth.user.id,
      sport: input.sport,
      format: input.format,
      city: city.name,
      scheduled_at: scheduledAt.toISOString(),
      spots_total: input.spotsTotal,
      cost_per_player: 0,
      split_pay: false,
      mercenary_mode: input.mercenaryMode,
      venue_id: input.venueId ?? null,
      latitude: city.latitude,
      longitude: city.longitude,
      status: 'open',
    })
    .select('id')
    .single();

  if (lobbyError || !lobby) {
    return NextResponse.json({ error: lobbyError?.message ?? 'Could not create lobby' }, { status: 500 });
  }

  const { error: joinError } = await supabase.from('lobby_participants').insert({
    lobby_id: lobby.id,
    user_id: auth.user.id,
    payment_status: 'mock',
  });

  if (joinError) {
    await supabase.from('lobbies').delete().eq('id', lobby.id);
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  // Autonomous matchmaking: notify nearby players who like this sport, and if
  // the lobby is a "Mercenary +1" broadcast an SOS to opted-in mercenaries.
  let matching: Awaited<ReturnType<typeof autoMatchPlayers>> | null = null;
  try {
    matching = await autoMatchPlayers({
      entityType: 'lobby',
      entityId: lobby.id as string,
      sport: input.sport,
      title: `${input.format} in ${city.name}`,
      city: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      excludeIds: [auth.user.id],
      prioritizeMercenaries: input.mercenaryMode,
    });
  } catch {
    matching = null;
  }

  revalidatePath('/lobby');
  revalidatePath('/');
  revalidatePath(`/lobby/${lobby.id}`);

  return NextResponse.json({ ok: true, lobbyId: lobby.id, matching });
}
