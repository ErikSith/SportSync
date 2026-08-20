import Link from 'next/link';
import { getPageViewer } from '@/lib/auth/viewer';
import { TopAppBar } from '@/components/home/TopAppBar';
import { MercenaryOptIn } from '@/components/profile/MercenaryOptIn';
import { ProfileAccountSwitcher } from '@/components/profile/ProfileAccountSwitcher';
import { SignOutButton } from '@/components/profile/SignOutButton';

export const runtime = 'edge';

export default async function ProfileSettingsPage() {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
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
            className="flex items-center gap-1 text-on-surface-variant hover:text-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="font-label-caps text-[10px] uppercase">Späť</span>
          </Link>
        </div>

        <h1 className="font-headline-md text-headline-md text-on-surface">Nastavenia Aplikácie</h1>

        <MercenaryOptIn initialSports={profile.mercenarySports} />

        <section className="glass-panel rounded-xl p-5 space-y-4">
          <h2 className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
            Účet
          </h2>
          <ProfileAccountSwitcher currentEmail={profile.email} />
          <SignOutButton />
        </section>
      </main>
    </>
  );
}
