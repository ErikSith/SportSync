import { createClient } from '@/lib/supabase/server';

export interface BracketMatch {
  id: string;
  round: number;
  slot: number;
  participant1Id: string | null;
  participant2Id: string | null;
  participant1Name: string | null;
  participant2Name: string | null;
  winnerId: string | null;
  status: string;
  score: string | null;
}

export interface BracketRound {
  round: number;
  label: string;
  matches: BracketMatch[];
}

/** Generate single-elimination bracket slots for confirmed registrations. */
export async function generateBracket(tournamentId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('id, format, status, max_participants')
    .eq('id', tournamentId)
    .maybeSingle();

  if (tErr || !tournament) return { ok: false, error: 'Tournament not found' };

  const { data: regs, error: rErr } = await supabase
    .from('tournament_registrations')
    .select('id, user_id, seed, status, profiles(full_name, username)')
    .eq('tournament_id', tournamentId)
    .eq('status', 'CONFIRMED')
    .order('seed', { ascending: true, nullsFirst: false });

  if (rErr) return { ok: false, error: rErr.message };

  const participants = (regs ?? []).map((r) => r.user_id as string);
  if (participants.length < 2) return { ok: false, error: 'Need at least 2 confirmed participants' };

  // Pad to next power of 2 with byes (null slots)
  const bracketSize = nextPowerOf2(participants.length);
  const slots: (string | null)[] = [...participants];
  while (slots.length < bracketSize) slots.push(null);

  const totalRounds = Math.log2(bracketSize);
  const matches: Array<{
    tournament_id: string;
    round: number;
    slot: number;
    participant1_id: string | null;
    participant2_id: string | null;
    status: string;
  }> = [];

  for (let slot = 0; slot < bracketSize / 2; slot++) {
    const p1 = slots[slot * 2] ?? null;
    const p2 = slots[slot * 2 + 1] ?? null;
    const isBye = p1 && !p2;
    matches.push({
      tournament_id: tournamentId,
      round: 1,
      slot,
      participant1_id: p1,
      participant2_id: p2,
      status: isBye ? 'walkover' : 'pending',
    });
    if (isBye && p1) {
      // Auto-advance bye winner — stored as winner_id on insert below
    }
  }

  // Clear existing bracket
  await supabase.from('tournament_matches').delete().eq('tournament_id', tournamentId);

  for (const m of matches) {
    const isBye = m.participant1_id && !m.participant2_id;
    await supabase.from('tournament_matches').insert({
      ...m,
      winner_id: isBye ? m.participant1_id : null,
    });
  }

  // Create empty placeholder matches for subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchCount = bracketSize / Math.pow(2, round);
    for (let slot = 0; slot < matchCount; slot++) {
      await supabase.from('tournament_matches').insert({
        tournament_id: tournamentId,
        round,
        slot,
        participant1_id: null,
        participant2_id: null,
        status: 'pending',
      });
    }
  }

  await supabase.from('tournaments').update({ status: 'IN_PROGRESS' }).eq('id', tournamentId);

  return { ok: true };
}

export async function getBracket(tournamentId: string): Promise<BracketRound[]> {
  const supabase = await createClient();

  const { data: matches, error } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round', { ascending: true })
    .order('slot', { ascending: true });

  if (error || !matches?.length) return [];

  const userIds = new Set<string>();
  for (const m of matches) {
    if (m.participant1_id) userIds.add(m.participant1_id as string);
    if (m.participant2_id) userIds.add(m.participant2_id as string);
  }

  const nameMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', [...userIds]);
    for (const p of profiles ?? []) {
      nameMap.set(p.id as string, (p.full_name as string) || (p.username as string));
    }
  }

  const roundMap = new Map<number, BracketMatch[]>();
  for (const m of matches) {
    const round = m.round as number;
    if (!roundMap.has(round)) roundMap.set(round, []);
    roundMap.get(round)!.push({
      id: m.id as string,
      round,
      slot: m.slot as number,
      participant1Id: (m.participant1_id as string) ?? null,
      participant2Id: (m.participant2_id as string) ?? null,
      participant1Name: m.participant1_id ? nameMap.get(m.participant1_id as string) ?? 'TBD' : 'TBD',
      participant2Name: m.participant2_id ? nameMap.get(m.participant2_id as string) ?? 'TBD' : 'TBD',
      winnerId: (m.winner_id as string) ?? null,
      status: m.status as string,
      score: (m.score as string) ?? null,
    });
  }

  const totalRounds = Math.max(...[...roundMap.keys()]);
  return [...roundMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, ms]) => ({
      round,
      label: roundLabel(round, totalRounds),
      matches: ms,
    }));
}

export async function reportMatchResult(
  matchId: string,
  winnerId: string,
  score: string,
  sport: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: match, error: mErr } = await supabase
    .from('tournament_matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (mErr || !match) return { ok: false, error: 'Match not found' };

  await supabase
    .from('tournament_matches')
    .update({ winner_id: winnerId, score, status: 'completed' })
    .eq('id', matchId);

  // Advance winner to next round
  const nextRound = (match.round as number) + 1;
  const nextSlot = Math.floor((match.slot as number) / 2);
  const isTopSlot = (match.slot as number) % 2 === 0;

  const { data: nextMatch } = await supabase
    .from('tournament_matches')
    .select('id, participant1_id, participant2_id')
    .eq('tournament_id', match.tournament_id as string)
    .eq('round', nextRound)
    .eq('slot', nextSlot)
    .maybeSingle();

  if (nextMatch) {
    const update = isTopSlot
      ? { participant1_id: winnerId }
      : { participant2_id: winnerId };
    await supabase.from('tournament_matches').update(update).eq('id', nextMatch.id);
  } else {
    // Final match — tournament complete
    await supabase
      .from('tournaments')
      .update({ status: 'COMPLETED' })
      .eq('id', match.tournament_id as string);
  }

  const participantIds = [match.participant1_id, match.participant2_id].filter(Boolean) as string[];
  await supabase.from('match_results').insert({
    sport,
    context_type: 'tournament',
    context_id: match.tournament_id as string,
    participant_ids: participantIds,
    winner_id: winnerId,
    score: { raw: score },
    status: 'confirmed',
  });

  return { ok: true };
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function roundLabel(round: number, totalRounds: number): string {
  const fromFinal = totalRounds - round;
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semi-Finals';
  if (fromFinal === 2) return 'Quarter-Finals';
  return `Round ${round}`;
}
