import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getApiAuthUser } from '@/lib/auth/api-user';
import { ensureProfileForUser } from '@/lib/auth/ensure-profile';
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
  skillLevel: z.number().int().min(0).max(3000).optional(),
  lobbyType: z.enum(['NEED_PLAYER', 'TEAM_CHALLENGE', 'RECURRING']).optional(),
  title: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  const { user, supabase } = await getApiAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const profileReady = await ensureProfileForUser(supabase, user);
  if (!profileReady.ok) {
    return NextResponse.json(
      { error: profileReady.error || 'Could not prepare player profile' },
      { status: 500 },
    );
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

  let latitude = city.latitude;
  let longitude = city.longitude;

  if (input.venueId) {
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, latitude, longitude')
      .eq('id', input.venueId)
      .maybeSingle();
    if (venueError || !venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 422 });
    }
    if (typeof venue.latitude === 'number' && typeof venue.longitude === 'number') {
      latitude = venue.latitude;
      longitude = venue.longitude;
    }
  }

  const title = input.title?.trim() || null;

  const baseInsert = {
    host_id: user.id,
    sport: input.sport,
    format: input.format,
    city: city.name,
    scheduled_at: scheduledAt.toISOString(),
    spots_total: input.spotsTotal,
    cost_per_player: 0,
    split_pay: false,
    mercenary_mode: input.mercenaryMode,
    venue_id: input.venueId ?? null,
    latitude,
    longitude,
    status: 'open',
    // Keep title on the core insert so sport/venue still show after schema-cache fallback.
    title,
  };

  const enrichedInsert = {
    ...baseInsert,
    skill_level: input.skillLevel ?? null,
    lobby_type: input.lobbyType ?? null,
  };

  let lobby: { id: string } | null = null;
  let lobbyError: { message: string } | null = null;

  {
    const first = await supabase.from('lobbies').insert(enrichedInsert).select('id').single();
    lobby = first.data as { id: string } | null;
    lobbyError = first.error;

    // Remote DB may lag Prisma (missing lobby_type/title/skill_level) — retry core columns only.
    if (
      lobbyError &&
      /lobby_type|skill_level|title|schema cache/i.test(lobbyError.message)
    ) {
      const fallback = await supabase.from('lobbies').insert(baseInsert).select('id').single();
      lobby = fallback.data as { id: string } | null;
      lobbyError = fallback.error;
    }
  }

  if (lobbyError || !lobby) {
    return NextResponse.json({ error: lobbyError?.message ?? 'Could not create lobby' }, { status: 500 });
  }

  const { error: joinError } = await supabase.from('lobby_participants').insert({
    lobby_id: lobby.id,
    user_id: user.id,
    payment_status: 'mock',
  });

  if (joinError) {
    await supabase.from('lobbies').delete().eq('id', lobby.id);
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  let matching: Awaited<ReturnType<typeof autoMatchPlayers>> | null = null;
  try {
    matching = await autoMatchPlayers({
      entityType: 'lobby',
      entityId: lobby.id as string,
      sport: input.sport,
      title: input.title ?? `${input.format} in ${city.name}`,
      city: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      excludeIds: [user.id],
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
