import { getPageViewer } from '@/lib/auth/viewer';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { getProfileDashboard } from '@/lib/data/profile-dashboard';
import { TopAppBar } from '@/components/home/TopAppBar';
import { ProfileTopSections } from '@/components/profile/ProfileTopSections';
import { ProfileNavRows } from '@/components/profile/ProfileNavRows';
import { SetupNotice } from '@/components/i18n/SetupNotice';

export const runtime = 'edge';

export default async function ProfilePage() {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  const { profile } = viewer;
  const displayName = profile.fullName ?? profile.username;
  const showManage = canAccessManageHub(profile.role);
  const dashboard = await getProfileDashboard(profile, {
    includePrivateSocial: true,
  });

  return (
    <>
      <div className="ambient-glow top-0 left-[-200px] h-[420px] w-[420px] bg-primary-container/10" />

      <TopAppBar avatarUrl={profile.avatarUrl} name={displayName} />

      <main className="relative z-10 mx-auto flex max-w-lg flex-col gap-5 px-container-margin-mobile pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:max-w-xl md:gap-6 md:pt-28">
        <ProfileTopSections
          profile={profile}
          heroStats={dashboard.heroStats}
          stats={dashboard.stats}
          recentMatches={dashboard.recentMatches}
          karmaFallback={dashboard.karmaHistory}
          editable
          showStatsExpand
        />

        <ProfileNavRows showManage={showManage} />
      </main>
    </>
  );
}
