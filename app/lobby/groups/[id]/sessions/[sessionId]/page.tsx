import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { getSessionById, getBookingOptionsForCity } from '@/lib/data/sport-groups';
import { formatGroupSchedule, GROUP_SPORT_ICONS, sportDisplayLabel } from '@/lib/data/sport-groups-shared';
import { SessionCoordinationHub } from '@/components/lobby/groups/SessionCoordinationHub';

export const runtime = 'edge';

interface SessionDetailPageProps {
  params: { id: string; sessionId: string };
}

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
  }

  const { profile } = viewer;

  const session = await getSessionById(params.id, params.sessionId, profile.id);
  if (!session) notFound();

  const city = profile.city ?? 'Bratislava';
  const bookingOptions = await getBookingOptionsForCity(city);

  const icon = GROUP_SPORT_ICONS[session.sport.toUpperCase()] ?? 'event';

  return (
    <>
      <header className="fixed top-0 w-full bg-background/90 backdrop-blur-xl border-b border-white/5 z-50 shadow-2xl shadow-black/40 px-container-margin-mobile md:px-container-margin-desktop h-16 flex items-center justify-between">
        <Link
          href={`/lobby/groups/${params.id}`}
          className="text-on-surface-variant hover:text-primary transition-colors flex items-center group"
        >
          <span className="material-symbols-outlined mr-2 group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-label-caps text-label-caps uppercase hidden md:inline">Crew</span>
        </Link>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Session Plan</h1>
        <div className="w-10" />
      </header>

      <main className="pt-24 pb-32 px-container-margin-mobile md:px-container-margin-desktop max-w-4xl mx-auto min-h-screen relative">
        <div className="ambient-glow bg-primary-container/5 w-[600px] h-[600px] top-0 left-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 space-y-gutter">
          <section className="glass-panel rounded-xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="px-3 py-1 bg-primary-container/20 text-primary-container border border-primary-container/30 rounded-full font-label-caps text-label-caps uppercase tracking-wider backdrop-blur-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                {sportDisplayLabel(session.sport)}
              </span>
              <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant border border-white/10 rounded-full font-label-caps text-[10px] uppercase tracking-wider">
                {session.groupName}
              </span>
              <span className="px-3 py-1 bg-secondary-container/10 text-secondary border border-secondary/20 rounded-full font-label-caps text-[10px] uppercase tracking-wider">
                Private crew
              </span>
            </div>
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
              {session.title}
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {formatGroupSchedule(session.scheduledAt)} • Planned by {session.createdByName}
            </p>
          </section>

          <SessionCoordinationHub
            session={session}
            venueOptions={bookingOptions.venues}
            eventOptions={bookingOptions.events}
          />
        </div>
      </main>

    </>
  );
}
