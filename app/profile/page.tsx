import Link from 'next/link';
import { getPageViewer } from '@/lib/auth/viewer';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { getProfileDashboard } from '@/lib/data/profile-dashboard';
import { TopAppBar } from '@/components/home/TopAppBar';
import { ProfileTopSections } from '@/components/profile/ProfileTopSections';

export const runtime = 'edge';

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
  const displayName = profile.fullName ?? profile.username;
  const dashboard = await getProfileDashboard(profile, {
    includePrivateSocial: true,
  });

  return (
    <>
      <div className="ambient-glow bg-primary-container/10 w-[500px] h-[500px] top-0 left-[-200px]" />
      <div className="ambient-glow bg-secondary-container/5 w-[600px] h-[600px] bottom-[20%] right-[-100px]" />

      <TopAppBar avatarUrl={profile.avatarUrl} name={displayName} />

      <main className="pt-24 pb-28 px-container-margin-mobile md:px-container-margin-desktop max-w-lg md:max-w-2xl mx-auto flex flex-col gap-6 relative z-10 md:pt-28">
        <ProfileTopSections
          profile={profile}
          heroStats={dashboard.heroStats}
          stats={dashboard.stats}
          recentMatches={dashboard.recentMatches}
          karmaFallback={dashboard.karmaHistory}
          editable
          showStatsExpand
        />

        {canAccessManageHub(profile.role) ? (
          <Link
            href="/manage"
            className="glass-panel rounded-xl p-4 flex items-center justify-between border border-secondary/20 hover:border-secondary/40 transition-colors"
          >
            <span className="font-label-caps text-[11px] uppercase tracking-widest text-secondary">
              Manage venue
            </span>
            <span className="material-symbols-outlined text-secondary">arrow_forward</span>
          </Link>
        ) : null}
      </main>
    </>
  );
}
