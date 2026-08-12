import { createClient } from '@/lib/supabase/server';

export type FillCampaignType = 'FILL' | 'URGENT' | 'LAST_MINUTE' | 'DEADLINE';

export interface FillCampaign {
  type: FillCampaignType;
  headline: string;
  body: string;
  cta: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface CandidatePlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  karmaScore: number;
  city: string | null;
  matchReason: string;
}

export interface TournamentFillAnalysis {
  tournamentId: string;
  tournamentName: string;
  spotsRemaining: number;
  fillPercent: number;
  daysToStart: number;
  daysToDeadline: number | null;
  needsFill: boolean;
  campaigns: FillCampaign[];
  candidates: CandidatePlayer[];
}

interface TournamentFillRow {
  id: string;
  name: string;
  sport: string;
  status: string;
  max_participants: number;
  current_participants: number;
  skill_level_min: number | null;
  skill_level_max: number | null;
  starts_at: string;
  registration_deadline: string | null;
  venues: { city: string } | { city: string }[] | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
  karma_score: number | string;
  city: string | null;
}

function resolveVenueCity(venues: TournamentFillRow['venues']): string | null {
  if (!venues) return null;
  const row = Array.isArray(venues) ? venues[0] : venues;
  return row?.city ?? null;
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

export function buildFillCampaigns(input: {
  name: string;
  sport: string;
  spotsRemaining: number;
  daysToStart: number;
  daysToDeadline: number | null;
  skillLabel: string;
}): FillCampaign[] {
  if (input.spotsRemaining <= 0) return [];

  const campaigns: FillCampaign[] = [];

  if (input.daysToStart <= 2) {
    campaigns.push({
      type: 'LAST_MINUTE',
      headline: 'Last minute spot!',
      body: `${input.name} starts in ${input.daysToStart} day${input.daysToStart === 1 ? '' : 's'}. ${input.spotsRemaining} spot${input.spotsRemaining === 1 ? '' : 's'} left for ${input.skillLabel} ${input.sport.toLowerCase()} players.`,
      cta: 'Claim spot now',
      urgency: 'critical',
    });
  }

  if (input.spotsRemaining <= 4) {
    campaigns.push({
      type: 'URGENT',
      headline: 'We need you!',
      body: `Only ${input.spotsRemaining} places remain at ${input.name}. You match the skill level for this tournament.`,
      cta: 'Join tournament',
      urgency: 'high',
    });
  }

  campaigns.push({
    type: 'FILL',
    headline: 'Looking for a player!',
    body: `${input.name} is filling up — ${input.spotsRemaining} open spot${input.spotsRemaining === 1 ? '' : 's'} for ${input.skillLabel} level.`,
    cta: 'View tournament',
    urgency: input.spotsRemaining <= 8 ? 'medium' : 'low',
  });

  if (input.daysToDeadline !== null && input.daysToDeadline <= 3 && input.daysToDeadline > 0) {
    campaigns.push({
      type: 'DEADLINE',
      headline: 'Registration closing soon!',
      body: `${input.daysToDeadline} day${input.daysToDeadline === 1 ? '' : 's'} left to register for ${input.name}. Don't miss the bracket.`,
      cta: 'Register before deadline',
      urgency: 'high',
    });
  }

  return campaigns;
}

function karmaInSkillRange(karma: number, min: number | null, max: number | null): boolean {
  if (min !== null && karma < min) return false;
  if (max !== null && karma > max) return false;
  return true;
}

async function findCandidatePlayers(
  tournament: TournamentFillRow,
  registeredUserIds: Set<string>,
  city: string | null,
): Promise<CandidatePlayer[]> {
  const supabase = await createClient();

  let query = supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, karma_score, city')
    .order('karma_score', { ascending: false })
    .limit(30);

  if (city) {
    query = query.ilike('city', city);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as ProfileRow[])
    .filter((profile) => !registeredUserIds.has(profile.id))
    .filter((profile) =>
      karmaInSkillRange(
        Number(profile.karma_score ?? 0),
        tournament.skill_level_min,
        tournament.skill_level_max,
      ),
    )
    .slice(0, 5)
    .map((profile) => ({
      id: profile.id,
      name: profile.full_name ?? profile.username,
      avatarUrl: profile.avatar_url,
      karmaScore: Number(profile.karma_score ?? 0),
      city: profile.city,
      matchReason: city ? `Active in ${city} · skill match` : 'Skill and karma match',
    }));
}

export async function analyzeTournamentFill(tournamentId: string): Promise<TournamentFillAnalysis | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tournaments')
    .select(
      `
      id, name, sport, status, max_participants, current_participants,
      skill_level_min, skill_level_max, starts_at, registration_deadline,
      venues ( city ),
      tournament_registrations ( user_id, status )
    `,
    )
    .eq('id', tournamentId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as TournamentFillRow & {
    tournament_registrations?: Array<{ user_id: string; status: string }>;
  };

  const spotsRemaining = Math.max(0, row.max_participants - row.current_participants);
  const fillPercent = row.max_participants > 0 ? (row.current_participants / row.max_participants) * 100 : 0;
  const startsAt = new Date(row.starts_at);
  const deadline = row.registration_deadline ? new Date(row.registration_deadline) : null;
  const daysToStart = daysUntil(startsAt);
  const daysToDeadline = deadline ? daysUntil(deadline) : null;
  const city = resolveVenueCity(row.venues);
  const skillLabel =
    row.skill_level_min !== null && row.skill_level_max !== null
      ? `${row.skill_level_min}–${row.skill_level_max}`
      : 'All levels';

  const registeredIds = new Set(
    (row.tournament_registrations ?? [])
      .filter((r) => r.status !== 'CANCELLED')
      .map((r) => r.user_id),
  );

  const needsFill = row.status === 'REGISTRATION_OPEN' && spotsRemaining > 0;

  const campaigns = needsFill
    ? buildFillCampaigns({
        name: row.name,
        sport: row.sport,
        spotsRemaining,
        daysToStart,
        daysToDeadline,
        skillLabel,
      })
    : [];

  const candidates = needsFill ? await findCandidatePlayers(row, registeredIds, city) : [];

  return {
    tournamentId: row.id,
    tournamentName: row.name,
    spotsRemaining,
    fillPercent,
    daysToStart,
    daysToDeadline,
    needsFill,
    campaigns,
    candidates,
  };
}

/** Scan all open tournaments and return fill analyses for the community agent. */
export async function runTournamentAgent(): Promise<TournamentFillAnalysis[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tournaments')
    .select('id')
    .eq('status', 'REGISTRATION_OPEN')
    .order('starts_at', { ascending: true })
    .limit(20);

  if (error || !data) return [];

  const results: TournamentFillAnalysis[] = [];
  for (const row of data) {
    const analysis = await analyzeTournamentFill(row.id as string);
    if (analysis?.needsFill) results.push(analysis);
  }

  return results;
}
