import { notFound, redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { getProfileByUsername } from '@/lib/data/profile';
import { TopAppBar } from '@/components/home/TopAppBar';
import { t } from '@/lib/i18n/server';

export const runtime = 'edge';

interface PlayerProfilePageProps {
  params: { username: string };
}

/** Public player profiles are disabled — accounts stay private. */
export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const pageViewer = await getPageViewer();
  if (pageViewer.status === 'setup') {
    return <SetupNotice />;
  }

  const { profile: viewer } = pageViewer;
  const profile = await getProfileByUsername(params.username);

  if (profile && profile.id === viewer.id) {
    redirect('/profile');
  }

  // Hide other people's profiles for now.
  if (!profile) notFound();

  return (
    <>
      <div className="ambient-glow bg-primary-container/10 w-[500px] h-[500px] top-0 left-[-200px]" />
      <TopAppBar avatarUrl={null} name={viewer.fullName ?? viewer.username} />
      <main className="relative z-10 mx-auto flex max-w-lg flex-col gap-4 px-container-margin-mobile pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:pt-28">
        <section className="rounded-2xl border border-white/8 bg-surface-container/70 px-4 py-6 text-center">
          <p className="font-body-md text-sm text-on-surface-variant">{t('profile.publicDisabled')}</p>
        </section>
      </main>
    </>
  );
}