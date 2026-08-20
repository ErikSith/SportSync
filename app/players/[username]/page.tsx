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
