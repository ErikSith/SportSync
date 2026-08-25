import Link from 'next/link';
import { getPageViewer } from '@/lib/auth/viewer';
import { TopAppBar } from '@/components/home/TopAppBar';
import { MercenaryOptIn } from '@/components/profile/MercenaryOptIn';
import { ProfileAccountSwitcher } from '@/components/profile/ProfileAccountSwitcher';
import { SignOutButton } from '@/components/profile/SignOutButton';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { t } from '@/lib/i18n/server';

export const runtime = 'edge';

export default async function ProfileSettingsPage() {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  const { profile } = viewer;
  const displayName = profile.fullName ?? profile.username;

  return (
    <>
      <TopAppBar avatarUrl={profile.avatarUrl} name={displayName} />

      <main className="relative z-10 mx-auto flex max-w-lg flex-col gap-5 px-container-margin-mobile pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:pt-28">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="flex items-center gap-1 text-on-surface-variant transition-colors hover:text-primary-container"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="font-label-caps text-[10px] uppercase">{t('common.back')}</span>
          </Link>
        </div>

        <h1 className="font-headline-md text-headline-md text-on-surface">{t('profile.appSettings')}</h1>

        <MercenaryOptIn initialSports={profile.mercenarySports} />

        <section className="glass-panel space-y-4 rounded-xl p-5">
          <h2 className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
            {t('profile.account')}
          </h2>
          <ProfileAccountSwitcher currentEmail={profile.email} />
          <SignOutButton />
        </section>
      </main>
    </>
  );
}
