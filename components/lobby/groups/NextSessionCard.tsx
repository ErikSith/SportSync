import Link from 'next/link';
import type { GroupActivityData } from '@/lib/data/sport-groups-shared';
import { coordinationProgress, formatGroupSchedule } from '@/lib/data/sport-groups-shared';
import { VenueEventBookingLinks } from '@/components/shared/VenueEventBookingLinks';

interface NextSessionCardProps {
  groupId: string;
  activity: GroupActivityData;
  memberCount: number;
}

export function NextSessionCard({ groupId, activity, memberCount }: NextSessionCardProps) {
  const progress = coordinationProgress(activity, memberCount);

  const steps = [
    { label: 'RSVP', done: progress.rsvpPct >= 50, detail: `${activity.goingCount}/${memberCount} confirmed` },
    {
      label: 'Destination',
      done: progress.destinationDone,
      detail: activity.destinationName ?? activity.locationNote ?? 'Not set',
    },
    { label: 'Parking', done: progress.parkingDone, detail: activity.parkingNote ?? 'Not set' },
    {
      label: 'Book',
      done: progress.bookingLinked,
      detail: activity.venueName ?? activity.eventTitle ?? 'Link venue or event',
    },
  ];

  return (
    <section className="glass-panel rounded-xl p-6 md:p-8 border border-secondary/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary-container/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <p className="font-label-caps text-label-caps text-secondary uppercase mb-2">Next session — coordinate now</p>
            <h3 className="font-display-lg-mobile text-display-lg-mobile text-on-surface mb-1">{activity.title}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {formatGroupSchedule(activity.scheduledAt)}
            </p>
          </div>
          <Link
            href={`/lobby/groups/${groupId}/sessions/${activity.id}`}
            className="shrink-0 px-6 py-3 rounded-lg bg-primary-container text-white font-label-caps text-label-caps glow-hover transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            OPEN COORDINATION
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {steps.map((step) => (
            <div
              key={step.label}
              className={`p-4 rounded-lg border ${
                step.done ? 'bg-secondary/10 border-secondary/30' : 'bg-surface-container/50 border-white/5'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    step.done ? 'text-secondary' : 'text-on-surface-variant'
                  }`}
                >
                  {step.done ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface">{step.label}</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant text-sm line-clamp-2">{step.detail}</p>
            </div>
          ))}
        </div>

        <VenueEventBookingLinks
          venueId={activity.venueId}
          venueName={activity.venueName}
          eventId={activity.eventId}
          eventTitle={activity.eventTitle}
          compact
        />
      </div>
    </section>
  );
}
