import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import { getProfileByUsername } from '@/lib/data/profile';
import { getTopProfilesByCity } from '@/lib/data/homepage';
import { getProfileGameStats, getKarmaHistory, profileTierLabel } from '@/lib/data/profile-stats';
import { getProfileGoals } from '@/lib/data/profile-goals';
import { getProfileAchievements } from '@/lib/data/profile-achievements';
import { getFavoriteVenues } from '@/lib/data/profile-venues';
import {
  friendshipRelation,
  getFriends,
  getFriendshipBetween,
} from '@/lib/data/profile-friends';
import { TopAppBar } from '@/components/home/TopAppBar';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileFriendsSection } from '@/components/profile/ProfileFriendsSection';
import { ProfileGoalsSection } from '@/components/profile/ProfileGoalsSection';
import { ProfileAchievementsSection } from '@/components/profile/ProfileAchievementsSection';
import { ProfileVenuesSection } from '@/components/profile/ProfileVenuesSection';
import { ProfileRankingsSection } from '@/components/profile/ProfileRankingsSection';
import { ProfileActivitySection } from '@/components/profile/ProfileActivitySection';
import { FriendActionButton } from '@/components/profile/FriendActionButton';

interface PlayerProfilePageProps {
  params: { username: string };
}

async function getCityKarmaRank(city: string, karmaScore: number): Promise<number | null> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .ilike('city', city)
    .gt('karma_score', karmaScore);

  if (error) return null;
  return (count ?? 0) + 1;
}

export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const pageViewer = await getPageViewer();
  if (pageViewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
  }

  const { profile: viewer } = pageViewer;

  const profile = await getProfileByUsername(params.username);
  if (!profile) notFound();

  if (profile.id === viewer.id) {
    redirect('/profile');
  }

  const city = profile.city ?? 'Bratislava';
  const displayName = profile.fullName ?? profile.username;
  const tier = profileTierLabel(profile.karmaScore);

  const friendship = await getFriendshipBetween(viewer.id, profile.id);
  const relation = friendshipRelation(viewer.id, profile.id, friendship);
  const isFriend = relation === 'friends';

  const [stats, goals, achievements, karmaHistory, leaderboard, cityRank, favoriteVenues, friends] =
    await Promise.all([
      getProfileGameStats(profile.id),
      getProfileGoals(profile.id, profile.karmaScore),
      getProfileAchievements(profile),
      isFriend ? getKarmaHistory(profile.id) : Promise.resolve([]),
      getTopProfilesByCity(city, 5),
      getCityKarmaRank(city, profile.karmaScore),
      isFriend ? getFavoriteVenues(profile.id) : Promise.resolve([]),
      isFriend ? getFriends(profile.id) : Promise.resolve([]),
    ]);

  const isTopTier = tier === 'ELITE TIER' || tier === 'LEGEND';

  return (
    <>
      <div className="ambient-glow bg-primary-container/10 w-[500px] h-[500px] top-0 left-[-200px]" />

      <TopAppBar avatarUrl={viewer.avatarUrl} name={viewer.fullName ?? viewer.username} />

      <main className="pt-24 pb-28 px-container-margin-mobile md:px-container-margin-desktop max-w-lg md:max-w-2xl mx-auto flex flex-col gap-6 relative z-10 md:pt-28">
        <div className="flex items-start justify-between gap-4">
          <Link
            href="/profile"
            className="flex items-center gap-1 text-on-surface-variant hover:text-secondary transition-colors shrink-0 mt-1"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="font-label-caps text-[10px] uppercase">Back</span>
          </Link>
          <FriendActionButton
            targetUsername={profile.username}
            relation={relation}
            friendshipId={friendship?.id ?? null}
          />
        </div>

        <ProfileHero profile={profile} stats={stats} cityRank={cityRank} editable={false} />

        {isFriend && <ProfileFriendsSection friends={friends} incomingRequests={[]} readOnly />}

        <ProfileGoalsSection goals={goals} readOnly />

        <ProfileAchievementsSection achievements={achievements} />

        <ProfileVenuesSection venues={favoriteVenues} />

        {isFriend && (
          <>
            <ProfileRankingsSection
              city={city}
              cityRank={cityRank}
              tier={tier}
              isTopTier={isTopTier}
              leaderboard={leaderboard}
            />

            <ProfileActivitySection entries={karmaHistory.slice(0, 5)} />
          </>
        )}
      </main>

    </>
  );
}
