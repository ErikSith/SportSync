'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import type {
  GroupActivityData,
  GroupMemberData,
  SessionRsvpStatus,
} from '@/lib/data/sport-groups-shared';

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatSessionWhen(value: Date | string): string {
  const date = asDate(value);
  const now = new Date();
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return `Today ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return `Tmr ${time}`;
  return `${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })} ${time}`;
}

type RsvpTone = 'going' | 'declined';

interface RsvpAvatar {
  id: string;
  name: string;
  avatarUrl: string | null;
  tone: RsvpTone;
}

function peopleFromIds(ids: string[], members: GroupMemberData[], tone: RsvpTone): RsvpAvatar[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  return ids
    .map((id) => byId.get(id))
    .filter((m): m is GroupMemberData => Boolean(m))
    .map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl, tone }));
}

function RsvpAvatarRing({ person }: { person: RsvpAvatar }) {
  const ring = person.tone === 'going' ? 'ring-emerald-400' : 'ring-red-400';
  const title = `${person.name} · ${person.tone === 'going' ? 'In' : 'Out'}`;

  return (
    <span
      title={title}
      className={`relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-2 ${ring} ring-offset-1 ring-offset-[#1F1F1F]`}
    >
      {person.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.avatarUrl}
          alt={person.name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-[#262626] text-[7px] font-bold text-gray-300">
          {person.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function initialStatus(
  viewerId: string,
  goingUserIds: string[],
  declinedUserIds: string[],
): SessionRsvpStatus | null {
  if (goingUserIds.includes(viewerId)) return 'going';
  if (declinedUserIds.includes(viewerId)) return 'declined';
  return null;
}

interface CrewSessionMiniCardProps {
  groupId: string;
  activity: GroupActivityData;
  members: GroupMemberData[];
  viewerId: string;
  capacity: number;
}

/** Tiny session chip — RSVP + weekly pin (same row rolls forward). */
export function CrewSessionMiniCard({
  groupId,
  activity,
  members,
  viewerId,
  capacity,
}: CrewSessionMiniCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [repeatPending, setRepeatPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [pinnedLocal, setPinnedLocal] = useState(Boolean(activity.isPinned));
  const [status, setStatus] = useState<SessionRsvpStatus | null>(() =>
    initialStatus(viewerId, activity.goingUserIds ?? [], activity.declinedUserIds ?? []),
  );
  const [goingLocal, setGoingLocal] = useState(activity.goingCount);
  const [goingIds, setGoingIds] = useState(activity.goingUserIds ?? []);
  const [declinedIds, setDeclinedIds] = useState(activity.declinedUserIds ?? []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const going = activity.goingUserIds ?? [];
    const declined = activity.declinedUserIds ?? [];
    setGoingLocal(activity.goingCount);
    setGoingIds(going);
    setDeclinedIds(declined);
    setPinnedLocal(Boolean(activity.isPinned));
    setStatus(initialStatus(viewerId, going, declined));
  }, [
    activity.goingCount,
    activity.goingUserIds,
    activity.declinedUserIds,
    activity.isPinned,
    viewerId,
  ]);

  const cap = Math.max(capacity, 2);
  const going = Math.min(cap, Math.max(0, goingLocal));
  const pct = Math.round((going / cap) * 100);
  const place =
    activity.destinationName ?? activity.venueName ?? activity.locationNote ?? 'TBA';
  const canDelete = activity.createdById === viewerId;

  const rsvpPeople = useMemo(() => {
    const goingPeople = peopleFromIds(goingIds, members, 'going');
    const declinedPeople = peopleFromIds(declinedIds, members, 'declined');
    return [...goingPeople, ...declinedPeople].slice(0, 5);
  }, [goingIds, declinedIds, members]);

  async function togglePin() {
    setError(null);
    setRepeatPending(true);
    const next = !pinnedLocal;
    setPinnedLocal(next);

    try {
      const res = await fetch(`/api/groups/${groupId}/sessions/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: next }),
      });
      if (!res.ok) {
        setPinnedLocal(!next);
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Nepodarilo sa pinnúť session');
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setRepeatPending(false);
    }
  }

  async function deleteSession() {
    if (deletePending) return;
    const ok = window.confirm('Odstrániť túto session?');
    if (!ok) return;

    setError(null);
    setDeletePending(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/sessions/${activity.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? 'Nepodarilo sa odstrániť session');
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setDeletePending(false);
    }
  }

  async function setRsvp(next: SessionRsvpStatus) {
    setError(null);
    const prev = status;
    const prevGoing = goingLocal;
    const prevGoingIds = goingIds;
    const prevDeclinedIds = declinedIds;

    setStatus(next);
    setGoingLocal((g) => {
      let n = g;
      if (prev === 'going' && next !== 'going') n = Math.max(0, g - 1);
      if (prev !== 'going' && next === 'going') n = Math.min(cap, g + 1);
      return n;
    });
    setGoingIds((ids) => {
      const without = ids.filter((id) => id !== viewerId);
      return next === 'going' ? [...without, viewerId] : without;
    });
    setDeclinedIds((ids) => {
      const without = ids.filter((id) => id !== viewerId);
      return next === 'declined' ? [...without, viewerId] : without;
    });

    const res = await fetch(`/api/groups/${groupId}/sessions/${activity.id}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });

    if (!res.ok) {
      setStatus(prev);
      setGoingLocal(prevGoing);
      setGoingIds(prevGoingIds);
      setDeclinedIds(prevDeclinedIds);
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'RSVP failed');
      return;
    }

    startTransition(() => router.refresh());
  }

  function chip(value: SessionRsvpStatus, label: string, icon: string) {
    const active = status === value;
    return (
      <button
        type="button"
        disabled={pending}
        title={label}
        aria-label={label}
        aria-pressed={active}
        onClick={() => void setRsvp(value)}
        className={`flex h-7 flex-1 items-center justify-center rounded-lg transition active:scale-[0.96] disabled:opacity-50 ${
          active ? 'bg-[#FF5722] text-white' : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
        }`}
      >
        <span className="material-symbols-outlined text-[14px]" aria-hidden>
          {icon}
        </span>
      </button>
    );
  }

  return (
    <article className="flex w-[140px] shrink-0 flex-col rounded-xl border border-white/[0.06] bg-[#1F1F1F] p-2">
      <div className="mb-1 flex items-center justify-between gap-1">
        {canDelete ? (
          <button
            type="button"
            disabled={deletePending}
            onClick={() => void deleteSession()}
            title="Odstrániť session"
            aria-label="Odstrániť session"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] text-gray-500 transition hover:bg-red-500/15 hover:text-red-400 active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden>
              delete
            </span>
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" aria-hidden />
        )}

        <button
          type="button"
          disabled={repeatPending}
          onClick={() => void togglePin()}
          title={
            pinnedLocal
              ? 'Zrušiť pin — session sa už nebude opakovať'
              : 'Pinnúť — rovnaký termín každý týždeň'
          }
          aria-label={pinnedLocal ? 'Zrušiť týždenný pin' : 'Pinnúť na každý týždeň'}
          aria-pressed={pinnedLocal}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-50 ${
            pinnedLocal
              ? 'bg-[#FF5722]/20 text-[#FF7F50]'
              : 'bg-[#2A2A2A] text-gray-500 hover:text-[#FF7F50]'
          }`}
        >
          <span
            className="material-symbols-outlined text-[14px]"
            style={pinnedLocal ? { fontVariationSettings: "'FILL' 1" } : undefined}
            aria-hidden
          >
            autorenew
          </span>
        </button>
      </div>

      <p className="truncate text-[11px] font-bold leading-tight text-white">{activity.title}</p>
      <p className="mt-1 truncate text-[9px] text-gray-400">{formatSessionWhen(activity.scheduledAt)}</p>
      <p className="truncate text-[9px] text-gray-500">{place}</p>

      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="text-[9px] font-bold text-[#FF7F50]">
          {going}
          <span className="text-gray-500">/{cap}</span>
        </span>
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[#121212]">
          <div
            className="h-full rounded-full bg-[#FF5722] transition-all"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      <div className="mt-1.5 flex min-h-7 items-center">
        {rsvpPeople.length > 0 ? (
          <div className="flex items-center -space-x-1.5">
            {rsvpPeople.map((person) => (
              <RsvpAvatarRing key={`${person.tone}-${person.id}`} person={person} />
            ))}
          </div>
        ) : (
          <span className="text-[8px] text-gray-600">No RSVPs yet</span>
        )}
      </div>

      <div className="mt-1.5 flex gap-0.5">
        {chip('going', "I'm In", 'check')}
        {chip('declined', 'Out', 'close')}
        {chip('maybe', 'Maybe', 'help')}
      </div>
      {error ? <p className="mt-0.5 text-[8px] text-red-400">{error}</p> : null}
    </article>
  );
}
