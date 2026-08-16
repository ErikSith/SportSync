'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type {
  GroupActivityData,
  GroupMemberData,
  SessionRsvpStatus,
} from '@/lib/data/sport-groups-shared';
import { formatSessionCost } from '@/lib/data/sport-groups-shared';
import { CrewAvatarStack } from '@/components/lobby/groups/CrewAvatarStack';

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatSessionWhen(value: Date | string): string {
  const date = asDate(value);
  const now = new Date();
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === now.toDateString()) return `Today, ${time}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;

  return `${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`;
}

interface CrewNextSessionCardProps {
  groupId: string;
  activity: GroupActivityData;
  members: GroupMemberData[];
  /** Soft capacity for attendance bar (e.g. 14). */
  capacity: number;
  /** Optional per-player cost in cents — null/0 → Free. */
  priceCents?: number | null;
  currency?: string;
  initialStatus?: SessionRsvpStatus | null;
}

export function CrewNextSessionCard({
  groupId,
  activity,
  members,
  capacity,
  priceCents = null,
  currency = 'EUR',
  initialStatus = null,
}: CrewNextSessionCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<SessionRsvpStatus | null>(initialStatus);
  const [goingLocal, setGoingLocal] = useState(activity.goingCount);
  const [error, setError] = useState<string | null>(null);

  const cap = Math.max(capacity, 2);
  const going = Math.min(cap, Math.max(0, goingLocal));
  const pct = Math.round((going / cap) * 100);
  const place =
    activity.destinationName ?? activity.venueName ?? activity.locationNote ?? 'Venue TBA';
  const preview = members.slice(0, Math.min(4, Math.max(going, 1)));
  const overflow = Math.max(0, going - preview.length);

  const priceLabel =
    priceCents != null && priceCents > 0
      ? `${formatSessionCost(priceCents, currency)} / player`
      : 'Free';

  async function setRsvp(next: SessionRsvpStatus) {
    setError(null);
    const prev = status;
    const prevGoing = goingLocal;

    setStatus(next);
    setGoingLocal((g) => {
      let nextGoing = g;
      if (prev === 'going' && next !== 'going') nextGoing = Math.max(0, g - 1);
      if (prev !== 'going' && next === 'going') nextGoing = Math.min(cap, g + 1);
      return nextGoing;
    });

    const res = await fetch(`/api/groups/${groupId}/sessions/${activity.id}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });

    if (!res.ok) {
      setStatus(prev);
      setGoingLocal(prevGoing);
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'RSVP failed');
      return;
    }

    startTransition(() => router.refresh());
  }

  function rsvpBtn(value: SessionRsvpStatus, label: string, icon: string) {
    const active = status === value;
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => void setRsvp(value)}
        className={`flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3.5 transition active:scale-[0.98] disabled:opacity-60 ${
          active
            ? 'bg-[#FF5722] text-white shadow-[0_10px_28px_rgba(255,87,34,0.4)]'
            : 'border border-white/[0.06] bg-[#2A2A2A] text-gray-400 hover:border-white/10 hover:text-gray-200'
        }`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            active ? 'bg-white/20' : 'bg-[#1F1F1F]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            {icon}
          </span>
        </span>
        <span className="text-[11px] font-bold">{label}</span>
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-white/[0.05] bg-[#1F1F1F] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white">Next Session</h3>
          <Link
            href={`/lobby/groups/${groupId}/sessions/${activity.id}`}
            className="mt-0.5 block truncate text-xs text-gray-500 hover:text-[#FF7F50]"
          >
            {activity.title}
          </Link>
        </div>
        <span className="shrink-0 rounded-full bg-[#FF5722]/15 px-2.5 py-1 text-[11px] font-bold text-[#FF7F50]">
          {priceLabel}
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        <li className="flex items-center gap-2.5 text-sm text-gray-300">
          <span className="material-symbols-outlined text-[18px] text-[#FF7F50]" aria-hidden>
            calendar_today
          </span>
          {formatSessionWhen(activity.scheduledAt)}
        </li>
        <li className="flex items-center gap-2.5 text-sm text-gray-300">
          <span className="material-symbols-outlined text-[18px] text-[#FF7F50]" aria-hidden>
            location_on
          </span>
          <span className="truncate">{place}</span>
        </li>
      </ul>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
            Attendance
          </span>
          <span className="text-[12px] font-bold text-white">
            <span className="text-[#FF7F50]">{going}</span>
            <span className="text-gray-500">/{cap}</span>
            <span className="ml-1 font-semibold text-gray-300">Confirmed</span>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#121212]">
          <div
            className="h-full rounded-full bg-[#FF5722] transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
        <div className="mt-3 flex items-center">
          <CrewAvatarStack people={preview} size="sm" />
          {overflow > 0 ? (
            <span className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#1F1F1F] bg-[#2A2A2A] text-[10px] font-bold text-gray-300">
              +{overflow}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex gap-2.5">
        {rsvpBtn('going', "I'm In", 'check')}
        {rsvpBtn('declined', 'Out', 'close')}
        {rsvpBtn('maybe', 'Maybe', 'help')}
      </div>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </section>
  );
}
