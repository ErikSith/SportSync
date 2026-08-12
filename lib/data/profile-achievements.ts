import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/data/profile';
import { getProfileGameStats, profileTierLabel, type ProfileGameStats } from '@/lib/data/profile-stats';

export interface EventAchievementHighlight {
  id: string;
  kind: 'event' | 'tournament';
  title: string;
  sport: string;
  badgeLabel: string;
  placement: number | null;
  totalParticipants: number | null;
  finishTime: string | null;
  occurredAt: Date | null;
}

export interface PlatformBadge {
  id: string;
  category: string;
  title: string;
  icon: string;
  unlocked: boolean;
  progressHint: string | null;
}

export interface ProfileAchievementsBundle {
  highlights: EventAchievementHighlight[];
  badges: PlatformBadge[];
}

interface EventResultRow {
  id: string;
  status: string;
  placement: number | null;
  total_participants: number | null;
  finish_time: string | null;
  created_at: string;
  events:
    | {
        id: string;
        title: string;
        sport: string;
        starts_at: string;
      }
    | {
        id: string;
        title: string;
        sport: string;
        starts_at: string;
      }[]
    | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function getSportLobbyCounts(profileId: string): Promise<Map<string, number>> {
  const supabase = await createClient();
  const counts = new Map<string, number>();

  const { data: memberships } = await supabase
    .from('lobby_participants')
    .select('lobby_id')
    .eq('user_id', profileId);

  const { data: hostedRows } = await supabase.from('lobbies').select('id').eq('host_id', profileId);

  const lobbyIds = [
    ...new Set([
      ...(memberships ?? []).map((row) => row.lobby_id as string),
      ...(hostedRows ?? []).map((row) => row.id as string),
    ]),
  ];

  if (lobbyIds.length === 0) return counts;

  const { data: lobbies } = await supabase
    .from('lobbies')
    .select('sport')
    .in('id', lobbyIds)
    .eq('status', 'completed');

  for (const lobby of lobbies ?? []) {
    const sport = lobby.sport as string;
    counts.set(sport, (counts.get(sport) ?? 0) + 1);
  }

  return counts;
}

async function hasTournamentWin(profileId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('tournament_matches')
    .select('*', { count: 'exact', head: true })
    .eq('winner_id', profileId);
  return (count ?? 0) > 0;
}

async function hasEventFinish(profileId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('event_results')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profileId)
    .eq('status', 'finished');
  return (count ?? 0) > 0;
}

async function getEventHighlights(profileId: string): Promise<EventAchievementHighlight[]> {
  const supabase = await createClient();
  const highlights: EventAchievementHighlight[] = [];

  const { data: eventResults } = await supabase
    .from('event_results')
    .select('id, status, placement, total_participants, finish_time, created_at, events(id, title, sport, starts_at)')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });

  for (const row of (eventResults ?? []) as EventResultRow[]) {
    const event = firstRelation(row.events);
    if (!event) continue;
    highlights.push({
      id: row.id,
      kind: 'event',
      title: event.title,
      sport: event.sport,
      badgeLabel: row.status === 'finished' ? 'Finisher' : row.status === 'dnf' ? 'DNF' : 'Registered',
      placement: row.placement,
      totalParticipants: row.total_participants,
      finishTime: row.finish_time,
      occurredAt: new Date(event.starts_at),
    });
  }

  const { data: tournamentRegs } = await supabase
    .from('tournament_registrations')
    .select('id, registered_at, tournaments(id, name, sport, starts_at, current_participants, max_participants)')
    .eq('user_id', profileId)
    .eq('status', 'CONFIRMED')
    .order('registered_at', { ascending: false })
    .limit(5);

  for (const reg of tournamentRegs ?? []) {
    const tournament = firstRelation(
      reg.tournaments as
        | {
            id: string;
            name: string;
            sport: string;
            starts_at: string;
            current_participants: number;
            max_participants: number | null;
          }
        | {
            id: string;
            name: string;
            sport: string;
            starts_at: string;
            current_participants: number;
            max_participants: number | null;
          }[]
        | null,
    );
    if (!tournament) continue;

    const alreadyListed = highlights.some((h) => h.kind === 'tournament' && h.title === tournament.name);
    if (alreadyListed) continue;

    highlights.push({
      id: reg.id as string,
      kind: 'tournament',
      title: tournament.name,
      sport: tournament.sport,
      badgeLabel: 'Competitor',
      placement: null,
      totalParticipants: tournament.max_participants ?? tournament.current_participants,
      finishTime: null,
      occurredAt: new Date(tournament.starts_at),
    });
  }

  return highlights.sort((a, b) => {
    const aTime = a.occurredAt?.getTime() ?? 0;
    const bTime = b.occurredAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

function buildPlatformBadges(
  profile: Profile,
  stats: ProfileGameStats,
  sportCounts: Map<string, number>,
  eventFinisher: boolean,
  tournamentChampion: boolean,
): PlatformBadge[] {
  const tier = profileTierLabel(profile.karmaScore);
  const hasMatch = stats.lobbiesHosted + stats.lobbiesJoined > 0;

  const padelCount = sportCounts.get('PADEL') ?? 0;
  const tennisCount = sportCounts.get('TENNIS') ?? 0;
  const topSport = padelCount >= tennisCount ? 'PADEL' : 'TENNIS';
  const topSportCount = Math.max(padelCount, tennisCount);

  return [
    {
      id: 'first-match',
      category: 'Starter',
      title: 'First Match',
      icon: 'directions_run',
      unlocked: hasMatch,
      progressHint: hasMatch ? null : 'Join or host a lobby',
    },
    {
      id: 'finisher',
      category: 'Finisher',
      title: 'Match Complete',
      icon: 'flag',
      unlocked: stats.completedLobbies > 0,
      progressHint: stats.completedLobbies > 0 ? null : `${stats.completedLobbies}/1 completed`,
    },
    {
      id: 'karma-king',
      category: 'Status',
      title: 'Karma King',
      icon: 'star',
      unlocked: profile.karmaScore >= 500,
      progressHint: profile.karmaScore >= 500 ? null : `${profile.karmaScore}/500 karma`,
    },
    {
      id: 'tournament-pro',
      category: 'Compete',
      title: 'Tournament Pro',
      icon: 'emoji_events',
      unlocked: stats.tournamentRegistrations > 0,
      progressHint: stats.tournamentRegistrations > 0 ? null : 'Register for a tournament',
    },
    {
      id: 'student',
      category: 'Train',
      title: 'Dedicated Student',
      icon: 'school',
      unlocked: stats.lessonsBooked > 0,
      progressHint: stats.lessonsBooked > 0 ? null : 'Book a training lesson',
    },
    {
      id: 'elite-contender',
      category: 'Status',
      title: 'Elite Contender',
      icon: 'workspace_premium',
      unlocked: tier === 'ELITE TIER' || tier === 'LEGEND',
      progressHint: tier === 'ELITE TIER' || tier === 'LEGEND' ? null : `${profile.karmaScore}/1500 karma`,
    },
    {
      id: 'event-finisher',
      category: 'Events',
      title: 'Event Finisher',
      icon: 'directions_run',
      unlocked: eventFinisher,
      progressHint: eventFinisher ? null : 'Finish an official event',
    },
    {
      id: 'tournament-champion',
      category: 'Compete',
      title: 'Tournament Champion',
      icon: 'emoji_events',
      unlocked: tournamentChampion,
      progressHint: tournamentChampion ? null : 'Win a tournament match',
    },
    {
      id: 'sport-specialist',
      category: 'Sport',
      title: `${topSport.charAt(0)}${topSport.slice(1).toLowerCase()} Regular`,
      icon: 'sports_tennis',
      unlocked: topSportCount >= 5,
      progressHint: topSportCount >= 5 ? null : `${topSportCount}/5 ${topSport.toLowerCase()} matches`,
    },
  ];
}

export async function getProfileAchievements(profile: Profile): Promise<ProfileAchievementsBundle> {
  const [stats, sportCounts, eventFinisher, tournamentChampion, highlights] = await Promise.all([
    getProfileGameStats(profile.id),
    getSportLobbyCounts(profile.id),
    hasEventFinish(profile.id),
    hasTournamentWin(profile.id),
    getEventHighlights(profile.id),
  ]);

  return {
    highlights,
    badges: buildPlatformBadges(profile, stats, sportCounts, eventFinisher, tournamentChampion),
  };
}
