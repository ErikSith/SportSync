import Link from 'next/link';
import type { GroupActivityData } from '@/lib/data/sport-groups-shared';
import { formatGroupSchedule, GROUP_SPORT_ICONS, sportDisplayLabel } from '@/lib/data/sport-groups-shared';
import { VenueEventBookingLinks } from '@/components/shared/VenueEventBookingLinks';

interface GroupActivityListProps {
  activities: GroupActivityData[];
  groupId: string;
}

export function GroupActivityList({ activities, groupId }: GroupActivityListProps) {
  const now = new Date();
  const upcoming = activities.filter((a) => a.scheduledAt >= now);
  const past = activities.filter((a) => a.scheduledAt < now).reverse();

  return (
    <section className="glass-panel rounded-xl p-6">
      <h3 className="font-headline-md text-headline-md text-on-surface mb-6 flex justify-between items-center">
        Planned Sessions
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-normal">
          {upcoming.length} Upcoming
        </span>
      </h3>

      {upcoming.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-variant/50 p-6 text-center">
          <p className="font-body-md text-body-md text-on-surface-variant">
            No sessions on the calendar yet. Plan your first crew activity!
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {upcoming.map((activity) => {
            const icon = GROUP_SPORT_ICONS[activity.sport.toUpperCase()] ?? 'event';
            const destination = activity.destinationName ?? activity.locationNote;
            return (
              <li
                key={activity.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-surface-container/50 border border-white/5"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center border border-primary-container/30 shrink-0">
                    <span className="material-symbols-outlined text-primary-container text-[20px]">{icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-body-md text-body-md text-on-surface font-semibold">{activity.title}</p>
                    <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                      {sportDisplayLabel(activity.sport)} • {formatGroupSchedule(activity.scheduledAt)}
                      {destination ? ` • ${destination}` : ''}
                    </p>
                    <p className="font-body-md text-body-md text-on-surface-variant text-xs mt-1">
                      {activity.goingCount} going • Planned by {activity.createdByName}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <VenueEventBookingLinks
                    venueId={activity.venueId}
                    venueName={activity.venueName}
                    eventId={activity.eventId}
                    eventTitle={activity.eventTitle}
                    compact
                  />
                  <div className="flex items-center gap-3">
                  {activity.lobbyId && (
                    <Link
                      href={`/lobby/${activity.lobbyId}`}
                      className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors"
                    >
                      LOBBY
                    </Link>
                  )}
                  <Link
                    href={`/lobby/groups/${groupId}/sessions/${activity.id}`}
                    className="font-label-caps text-label-caps text-secondary hover:text-primary transition-colors"
                  >
                    COORDINATE
                  </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {past.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-4">Past sessions</p>
          <ul className="flex flex-col gap-2 opacity-70">
            {past.slice(0, 3).map((activity) => (
              <li key={activity.id} className="font-body-md text-body-md text-on-surface-variant text-sm">
                {activity.title} • {formatGroupSchedule(activity.scheduledAt)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
