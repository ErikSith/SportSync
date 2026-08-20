import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { getProfileByUsername } from '@/lib/data/profile';
import { getProfileDashboard } from '@/lib/data/profile-dashboard';
import {
  friendshipRelation,
  getFriendshipBetween,
} from '@/lib/data/profile-friends';
import { TopAppBar } from '@/components/home/TopAppBar';
import { ProfileTopSections } from '@/components/profile/ProfileTopSections';
import { FriendActionButton } from '@/components/profile/FriendActionButton';

export const runtime = 'edge';

interface PlayerProfilePageProps {
  params: { username: string };
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

  const friendship = await getFriendshipBetween(viewer.id, profile.id);
  const relation = friendshipRelation(viewer.id, profile.id, friendship);
  const isFriend = relation === 'friends';

  const dashboard = await getProfileDashboard(profile, {
    includePrivateSocial: isFriend,
    includeIncomingRequests: false,
  });

  return (
    <>
      <div className="ambient-glow bg-primary-container/10 w-[500px] h-[500px] top-0 left-[-200px]" />

      <TopAppBar avatarUrl={viewer.avatarUrl} name={viewer.fullName ?? viewer.username} />

      <main className="relative z-10 mx-auto flex max-w-lg flex-col gap-5 px-container-margin-mobile pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:pt-28">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/profile"
            className="inline-flex min-h-11 items-center gap-1 rounded-full border border-white/10 bg-surface-container px-3 text-on-surface-variant transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="font-label-caps text-[10px] uppercase">Späť</span>
          </Link>
          <FriendActionButton
            targetUsername={profile.username}
            relation={relation}
            friendshipId={friendship?.id ?? null}
          />
        </div>

        <ProfileTopSections
          profile={profile}
          heroStats={dashboard.heroStats}
          stats={dashboard.stats}
          recentMatches={dashboard.recentMatches}
          karmaFallback={isFriend ? dashboard.karmaHistory : []}
          editable={false}
          showStatsExpand={isFriend}
        />
      </main>
    </>
  );
}
