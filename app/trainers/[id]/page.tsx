import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { formatCoachRating, getCoachById } from '@/lib/data/trainers';
import { TrainerDetailHero } from '@/components/trainers/TrainerDetailHero';
import { TrainerStatsGrid } from '@/components/trainers/TrainerStatsGrid';
import { TrainerPhilosophy } from '@/components/trainers/TrainerPhilosophy';
import { TrainerSpecializations } from '@/components/trainers/TrainerSpecializations';
import { TrainerSocialLinks } from '@/components/trainers/TrainerSocialLinks';
import { TrainerCredentials } from '@/components/trainers/TrainerCredentials';
import { TrainerLessonCard } from '@/components/trainers/TrainerLessonCard';
import { TrainerDetailActions } from '@/components/trainers/TrainerDetailActions';

export const runtime = 'edge';

interface TrainerDetailPageProps {
  params: { id: string };
}

export default async function TrainerDetailPage({ params }: TrainerDetailPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  const { profile, userId } = viewer;

  const coach = await getCoachById(params.id, userId ?? profile.id);
  if (!coach) notFound();

  const isElite = coach.karmaScore >= 50;
  const rating = formatCoachRating(coach.karmaScore);
  const sessionCount = Math.max(coach.totalSessions * 40, coach.isShowcase ? 500 : coach.totalSessions);

  return (
    <>
      <nav className="w-full top-0 sticky bg-surface/80 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-gutter py-4 z-50">
        <Link
          href="/trainers"
          className="hover:opacity-80 transition-opacity active:scale-95 transition-transform flex items-center"
          aria-label="Back to trainers"
        >
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </Link>
        <Link href="/" className="font-display-lg-mobile font-bold tracking-tighter gradient-text">
          SPORTSYNC
        </Link>
        <button type="button" className="hover:opacity-80 transition-opacity active:scale-95 flex items-center" aria-label="More options">
          <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
        </button>
      </nav>

      <main className="md:px-container-margin-desktop px-container-margin-mobile pt-6 md:pt-12 max-w-7xl mx-auto pb-32">
        <TrainerDetailHero
          name={coach.name}
          specialty={coach.specialty}
          city={coach.city}
          heroImage={coach.avatarUrl}
          isShowcase={coach.isShowcase}
          isElite={isElite}
          seasonPts={coach.seasonPts}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-12">
            <TrainerStatsGrid yearsExp={coach.yearsExp} sessionCount={sessionCount} rating={rating} />

            {coach.isShowcase && <TrainerPhilosophy />}

            <TrainerSpecializations sports={coach.sports} isShowcase={coach.isShowcase} />

            {coach.isShowcase && (
              <>
                <TrainerSocialLinks />
                <TrainerCredentials />
              </>
            )}

            {coach.lessons.length > 0 && (
              <section id="trainer-lessons" className="md:hidden scroll-mt-24">
                <h2 className="font-headline-md text-headline-md mb-4 text-on-surface">Upcoming Lessons</h2>
                <div className="space-y-4">
                  {coach.lessons.map((lesson) => (
                    <TrainerLessonCard key={lesson.id} lesson={lesson} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="hidden md:block md:col-span-1">
            <section id="trainer-lessons-desktop" className="glass-panel rounded-xl p-6 sticky top-24 scroll-mt-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline-md text-headline-md text-on-surface">Next Available</h2>
                <span className="material-symbols-outlined text-primary-container">calendar_month</span>
              </div>

              {coach.lessons.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  No upcoming sessions scheduled. Check back soon.
                </p>
              ) : (
                <div className="space-y-4">
                  {coach.lessons.map((lesson) => (
                    <TrainerLessonCard key={lesson.id} lesson={lesson} compact />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <TrainerDetailActions lessons={coach.lessons} coachEmail={coach.isShowcase ? 'marcus.vance@sportsync.app' : undefined} />
    </>
  );
}
