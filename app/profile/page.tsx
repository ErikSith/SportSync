import { getPageViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { getTopProfilesByCity } from '@/lib/data/homepage';
import { getProfileGameStats, getKarmaHistory, profileTierLabel } from '@/lib/data/profile-stats';
import { getProfileGoals } from '@/lib/data/profile-goals';
import { getProfileAchievements } from '@/lib/data/profile-achievements';
import { getFavoriteVenues } from '@/lib/data/profile-venues';
import { getFriends, getIncomingFriendRequests } from '@/lib/data/profile-friends';
import { TopAppBar } from '@/components/home/TopAppBar';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileFriendsSection } from '@/components/profile/ProfileFriendsSection';
import { ProfileGoalsSection } from '@/components/profile/ProfileGoalsSection';
import { ProfileAchievementsSection } from '@/components/profile/ProfileAchievementsSection';
import { ProfileVenuesSection } from '@/components/profile/ProfileVenuesSection';
import { ProfileRankingsSection } from '@/components/profile/ProfileRankingsSection';
import { ProfileActivitySection } from '@/components/profile/ProfileActivitySection';
import { MercenaryOptIn } from '@/components/profile/MercenaryOptIn';
import { SignOutButton } from '@/components/profile/SignOutButton';
import { ProfileAccountSwitcher } from '@/components/profile/ProfileAccountSwitcher';
import Link from 'next/link';

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

export default async function ProfilePage() {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center space-y-4">
        <h2 className="font-headline-md text-headline-md text-on-surface">Setting up your profile…</h2>
        <p className="font-body-md text-body-md text-tertiary-container">
          This only takes a second. Refresh the page to continue.
        </p>
      </main>
    );
  }

  const { profile } = viewer;

  const city = profile.city ?? 'Bratislava';
  const displayName = profile.fullName ?? profile.username;
  const tier = profileTierLabel(profile.karmaScore);

  const [stats, goals, achievements, karmaHistory, leaderboard, cityRank, favoriteVenues, friends, incomingRequests] =
    await Promise.all([
      getProfileGameStats(profile.id),
      getProfileGoals(profile.id, profile.karmaScore),
      getProfileAchievements(profile),
      getKarmaHistory(profile.id),
      getTopProfilesByCity(city, 5),
      getCityKarmaRank(city, profile.karmaScore),
      getFavoriteVenues(profile.id),
      getFriends(profile.id),
      getIncomingFriendRequests(profile.id),
    ]);

  const isTopTier = tier === 'ELITE TIER' || tier === 'LEGEND';

  return (
    <>
      <div className="ambient-glow bg-primary-container/10 w-[500px] h-[500px] top-0 left-[-200px]" />
      <div className="ambient-glow bg-secondary-container/5 w-[600px] h-[600px] bottom-[20%] right-[-100px]" />

      <TopAppBar avatarUrl={profile.avatarUrl} name={displayName} />

      <main className="pt-24 pb-28 px-container-margin-mobile md:px-container-margin-desktop max-w-lg md:max-w-2xl mx-auto flex flex-col gap-6 relative z-10 md:pt-28">
        <ProfileHero profile={profile} stats={stats} cityRank={cityRank} editable />

        <ProfileFriendsSection friends={friends} incomingRequests={incomingRequests} />

        <MercenaryOptIn initialSports={profile.mercenarySports} />

        <ProfileGoalsSection goals={goals} />

        <ProfileAchievementsSection achievements={achievements} />

        <ProfileVenuesSection venues={favoriteVenues} />

        <ProfileRankingsSection
          city={city}
          cityRank={cityRank}
          tier={tier}
          isTopTier={isTopTier}
          leaderboard={leaderboard}
        />

        <ProfileActivitySection entries={karmaHistory.slice(0, 5)} />

        <ProfileAccountSwitcher currentEmail={profile.email} />

        {canAccessManageHub(profile.role) && (
          <Link
            href="/manage"
            className="flex items-center justify-between py-3 px-1 text-on-surface hover:text-secondary transition-colors group"
          >
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-xl">stadium</span>
              <span className="font-headline-md text-sm">Manage venue</span>
            </span>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors">
              arrow_forward
            </span>
          </Link>
        )}

        <div className="flex justify-center pt-2">
          <SignOutButton flat />
        </div>
      </main>

    </>
  );
}
