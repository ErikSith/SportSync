'use client';

import Link from 'next/link';
import type { GroupActivityData, GroupMemberData } from '@/lib/data/sport-groups-shared';
import { CrewAvatarStack } from '@/components/lobby/groups/CrewAvatarStack';

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatWhen(value: Date | string): string {
  const date = asDate(value);
  const now = new Date();
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return `Today ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString('en-GB', { weekday: 'short' })} ${time}`;
}

interface CrewPinnedOfficialProps {
  groupId: string;
  activities: GroupActivityData[];
  members: GroupMemberData[];
  onPinClick: () => void;
}

/** Official / tournament pins + CTA to pin from app events. */
export function CrewPinnedOfficial({
  groupId,
  activities,
  members,
  onPinClick,
}: CrewPinnedOfficialProps) {
  const now = Date.now();
  const official = activities
    .filter((a) => a.eventId != null && asDate(a.scheduledAt).getTime() >= now)
    .sort((a, b) => asDate(a.scheduledAt).getTime() - asDate(b.scheduledAt).getTime());

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-white">Pinned from App</h3>
        <button
          type="button"
          onClick={onPinClick}
          className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-[#2A2A2A] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-200 transition hover:border-[#FF5722]/40 hover:text-[#FF7F50]"
        >
          📌 Pin Event/Tournament
        </button>
      </div>

      {official.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#1F1F1F] px-4 py-5 text-center">
          <p className="text-xs text-gray-400">
            Pin an official event or tournament so the whole crew can join together.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {official.map((activity) => {
            const place =
              activity.venueName ?? activity.locationNote ?? activity.destinationName ?? 'TBA';
            const preview = members.slice(0, Math.min(4, Math.max(2, activity.goingCount)));
            return (
              <li
                key={activity.id}
                className="rounded-2xl border border-[#FF5722]/25 bg-[#1F1F1F] p-4"
              >
                <span className="inline-flex rounded-lg bg-[#FF5722]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FF7F50]">
                  🏆 Official / Tournament
                </span>
                <h4 className="mt-2.5 text-base font-bold text-white">
                  {activity.eventTitle ?? activity.title}
                </h4>
                <p className="mt-1 text-xs text-gray-400">
                  {formatWhen(activity.scheduledAt)}
                  <span className="mx-1.5 text-white/20">•</span>
                  {place}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <CrewAvatarStack people={preview} size="sm" />
                  {activity.eventId ? (
                    <Link
                      href={`/events/${activity.eventId}`}
                      className="shrink-0 rounded-xl bg-[#FF5722] px-3 py-2 text-[11px] font-bold text-white transition hover:brightness-110"
                    >
                      View / Join
                    </Link>
                  ) : (
                    <Link
                      href={`/lobby/groups/${groupId}/sessions/${activity.id}`}
                      className="shrink-0 rounded-xl bg-[#FF5722] px-3 py-2 text-[11px] font-bold text-white"
                    >
                      Open
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
