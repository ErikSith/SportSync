import { redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { TopAppBar } from '@/components/home/TopAppBar';
import { PrivateAccountPanel } from '@/components/profile/PrivateAccountPanel';
import { ProfileNavRows } from '@/components/profile/ProfileNavRows';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { loginHref } from '@/lib/auth/login-href';

export const runtime = 'edge';

export default async function ProfilePage() {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  if (viewer.isGuest) {
    redirect(loginHref('/profile', { mode: 'sign-up' }));
  }

  const { profile } = viewer;

  // Venue owner workspace lives on /manage Ă˘â‚¬â€ť player/admin keep the normal profile.
  if (profile.role === 'VENUE_OWNER') {
    redirect('/manage');
  }

  const displayName = profile.fullName ?? profile.username;
  const showManage = canAccessManageHub(profile.role);

  return (
    <>
      <div className="ambient-glow top-0 left-[-200px] h-[420px] w-[420px] bg-primary-container/10" />

      <TopAppBar avatarUrl={null} name={displayName} />

      <main className="relative z-10 mx-auto flex max-w-lg flex-col gap-5 px-container-margin-mobile pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:max-w-xl md:gap-6 md:pt-28">
        <PrivateAccountPanel displayName={displayName} />

        <ProfileNavRows showManage={showManage} />
      </main>
    </>
  );
}
