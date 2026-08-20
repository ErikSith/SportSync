import 'server-only';
import type { Profile } from '@/lib/data/profile';
import {
  getProfileGameStats,
  getKarmaHistory,
  type KarmaHistoryEntry,
  type ProfileGameStats,
} from '@/lib/data/profile-stats';
import { getUserMatchActivity } from '@/lib/data/match-results';
import type { MatchActivityCard, ProfileHeroStats } from '@/lib/data/profile-shared';
import { profileTierShortLabel } from '@/lib/utils/profile-tier';

export type { ProfileHeroStats } from '@/lib/data/profile-shared';

export interface ProfileDashboard {
  stats: ProfileGameStats;
  heroStats: ProfileHeroStats;
  recentMatches: MatchActivityCard[];
  karmaHistory: KarmaHistoryEntry[];
}

export async function getProfileDashboard(
  profile: Profile,
  options: { includePrivateSocial?: boolean; includeIncomingRequests?: boolean } = {},
): Promise<ProfileDashboard> {
  const includePrivateSocial = options.includePrivateSocial ?? true;

  const [stats, karmaHistory, recentMatches] = await Promise.all([
    getProfileGameStats(profile.id),
    includePrivateSocial ? getKarmaHistory(profile.id) : Promise.resolve([] as KarmaHistoryEntry[]),
    getUserMatchActivity(profile.id, 8),
  ]);

  return {
    stats,
    heroStats: {
      gamesPlayed: stats.gamesPlayed,
      groupsCount: stats.groupsCount,
      levelLabel: profileTierShortLabel(profile.karmaScore),
    },
    recentMatches,
    karmaHistory,
  };
}
