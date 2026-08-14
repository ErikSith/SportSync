import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { getGroupById } from '@/lib/data/sport-groups';
import { GROUP_SPORT_ICONS, sportDisplayLabel } from '@/lib/data/sport-groups-shared';
import { GroupMemberList } from '@/components/lobby/groups/GroupMemberList';
import { GroupInvitePanel } from '@/components/lobby/groups/GroupInvitePanel';
import { GroupActivityList } from '@/components/lobby/groups/GroupActivityList';
import { PlanActivityForm } from '@/components/lobby/groups/PlanActivityForm';
import { NextSessionCard } from '@/components/lobby/groups/NextSessionCard';
import { CrewLeaderboard } from '@/components/lobby/groups/CrewLeaderboard';
import { RecurringSchedulePanel } from '@/components/lobby/groups/RecurringSchedulePanel';

export const runtime = 'edge';

interface GroupDetailPageProps {
  params: { id: string };
}

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
  }

  const { profile } = viewer;

  const group = await getGroupById(params.id, profile.id);
  if (!group) notFound();

  const icon = GROUP_SPORT_ICONS[group.sport.toUpperCase()] ?? 'groups';
  const now = new Date();
  const nextActivity =
    group.activities.filter((a) => a.scheduledAt >= now).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0] ??
    null;

  return (
    <>
      <header className="fixed top-0 w-full bg-background/90 backdrop-blur-xl border-b border-white/5 z-50 shadow-2xl shadow-black/40 px-container-margin-mobile md:px-container-margin-desktop h-16 flex items-center justify-between">
        <Link href="/lobby" className="text-on-surface-variant hover:text-primary transition-colors flex items-center group">
          <span className="material-symbols-outlined mr-2 group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-label-caps text-label-caps uppercase hidden md:inline">Back</span>
        </Link>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Crew Hub</h1>
        <div className="w-10" />
      </header>

      <main className="pt-24 pb-32 px-container-margin-mobile md:px-container-margin-desktop max-w-7xl mx-auto min-h-screen relative">
        <div className="ambient-glow bg-primary-container/5 w-[600px] h-[600px] top-0 left-1/2 -translate-x-1/2 pointer-events-none" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter relative z-10">
          <div className="lg:col-span-8 flex flex-col gap-gutter">
            <section className="glass-panel rounded-xl p-6 md:p-10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low to-transparent" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="px-3 py-1 bg-primary-container/20 text-primary-container border border-primary-container/30 rounded-full font-label-caps text-label-caps uppercase tracking-wider backdrop-blur-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    {sportDisplayLabel(group.sport)}
                  </span>
                  <span className="px-3 py-1 bg-secondary-container/10 text-secondary border border-secondary/20 rounded-full font-label-caps text-[10px] uppercase tracking-wider">
                    {group.members.length} members
                  </span>
                  <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant border border-white/10 rounded-full font-label-caps text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    Private crew
                  </span>
                </div>
                <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg mb-2 text-on-surface">
                  {group.name}
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-4">
                  {group.description ??
                    `Closed group led by ${group.ownerName}. Coordinate sessions, parking, and venue booking in one place.`}
                </p>
              </div>
            </section>

            {nextActivity && (
              <NextSessionCard groupId={group.id} activity={nextActivity} memberCount={group.members.length} />
            )}

            <GroupActivityList activities={group.activities} groupId={group.id} />

            <section className="glass-panel rounded-xl p-6">
              <PlanActivityForm groupId={group.id} defaultSport={group.sport} />
            </section>

            <RecurringSchedulePanel
              groupId={group.id}
              defaultSport={group.sport}
              schedules={group.recurringSchedules}
            />
          </div>

          <div className="lg:col-span-4 flex flex-col gap-gutter">
            <CrewLeaderboard groupId={group.id} leaderboard={group.leaderboard} isOwner={group.isOwner} />
            <GroupMemberList members={group.members} />
            <GroupInvitePanel groupId={group.id} inviteCode={group.inviteCode} />
          </div>
        </div>
      </main>

    </>
  );
}
