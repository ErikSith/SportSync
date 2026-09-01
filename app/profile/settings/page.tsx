import Link from 'next/link';
import { getPageViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import { TopAppBar } from '@/components/home/TopAppBar';
import { MercenaryOptIn } from '@/components/profile/MercenaryOptIn';
import { ProfileAccountSwitcher } from '@/components/profile/ProfileAccountSwitcher';
import { ProfileSettingsForm } from '@/components/profile/ProfileSettingsForm';
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

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const authEmailVerified = Boolean(auth.user?.email_confirmed_at);

  return (
    <>
      <TopAppBar avatarUrl={profile.avatarUrl} name={displayName} />

      <main className="relative z-10 mx-auto flex max-w-lg flex-col gap-5 bg-[#121212] px-container-margin-mobile pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:pt-28">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="flex items-center gap-1 text-gray-400 transition-colors hover:text-[#FF7F50]"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="font-label-caps text-[10px] uppercase">{t('common.back')}</span>
          </Link>
        </div>

        <h1 className="font-headline-md text-headline-md text-white">{t('profile.appSettings')}</h1>

        <ProfileSettingsForm profile={profile} authEmailVerified={authEmailVerified} />

        <MercenaryOptIn initialSports={profile.mercenarySports} />

        <section className="space-y-4 rounded-2xl border border-white/8 bg-[#1F1F1F] p-5">
          <h2 className="font-label-caps text-[10px] uppercase tracking-widest text-gray-400">
            {t('profile.account')}
          </h2>
          <ProfileAccountSwitcher currentEmail={profile.email} />
          <SignOutButton />
        </section>
      </main>
    </>
  );
}
