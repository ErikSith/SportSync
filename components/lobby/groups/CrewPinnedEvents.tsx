'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { GroupActivityData, GroupMemberData } from '@/lib/data/sport-groups-shared';
import { CrewAvatarStack } from '@/components/lobby/groups/CrewAvatarStack';

const SK_DAYS = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];

/** RSC → client boundary may stringify Dates; always coerce. */
function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatCrewWhen(value: Date | string): string {
  const date = asDate(value);
  const now = new Date();
  const time = date.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === now.toDateString()) {
    return `Dnes ${time}`;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Zajtra ${time}`;
  }

  return `${SK_DAYS[date.getDay()] ?? ''} ${time}`.trim();
}

interface CrewPinnedEventsProps {
  groupId: string;
  activities: GroupActivityData[];
  members: GroupMemberData[];
  /** Assumed squad size for private session slot UI (default 10). */
  squadSize?: number;
}

export function CrewPinnedEvents({
  groupId,
  activities,
  members,
  squadSize = 10,
}: CrewPinnedEventsProps) {
  const now = Date.now();
  const upcoming = activities
    .filter((a) => asDate(a.scheduledAt).getTime() >= now)
    .sort((a, b) => asDate(a.scheduledAt).getTime() - asDate(b.scheduledAt).getTime());

  const official = upcoming.filter((a) => a.eventId != null);
  const privateSessions = upcoming.filter((a) => a.eventId == null);

  const hasAny = official.length > 0 || privateSessions.length > 0;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">Pripnuté &amp; najbližšie</h3>
          <p className="mt-0.5 text-xs text-gray-400">Oficiálne turnaje a privátne akcie crew</p>
        </div>
      </div>

      {!hasAny && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#1F1F1F] px-4 py-8 text-center">
          <p className="text-sm font-bold text-white">Zatiaľ nič pripnuté</p>
          <p className="mt-1 text-xs text-gray-400">
            Navrhni akciu alebo pinni turnaj z appky — zobrazí sa tu.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {official.map((activity) => (
          <li key={activity.id}>
            <OfficialTournamentCard activity={activity} members={members} />
          </li>
        ))}
        {privateSessions.map((activity) => (
          <li key={activity.id}>
            <PrivateActionCard
              groupId={groupId}
              activity={activity}
              members={members}
              squadSize={squadSize}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OfficialTournamentCard({
  activity,
  members,
}: {
  activity: GroupActivityData;
  members: GroupMemberData[];
}) {
  const place = activity.venueName ?? activity.locationNote ?? activity.destinationName ?? 'Miesto TBA';
  const goingPreview = members.slice(0, Math.min(5, Math.max(activity.goingCount, 2)));

  return (
    <article className="rounded-2xl border border-[#FF5722]/25 bg-[#1F1F1F] p-4">
      <span className="inline-flex items-center gap-1 rounded-lg bg-[#FF5722]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FF7F50]">
        🏆 Official Tournament
      </span>
      <h4 className="mt-3 text-base font-bold text-white">
        {activity.eventTitle ?? activity.title}
      </h4>
      <p className="mt-1 text-xs text-gray-400">
        {formatCrewWhen(activity.scheduledAt)}
        <span className="mx-1.5 text-white/20">•</span>
        {place}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            Prihlásení z Crew
          </p>
          <CrewAvatarStack people={goingPreview} />
        </div>
        {activity.eventId ? (
          <Link
            href={`/events/${activity.eventId}`}
            className="shrink-0 rounded-xl bg-[#FF5722] px-3.5 py-2.5 text-center text-xs font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            Zobraziť Turnaj / Prihlásiť sa
          </Link>
        ) : (
          <span className="shrink-0 rounded-xl bg-[#FF5722]/40 px-3.5 py-2.5 text-xs font-bold text-white/70">
            Turnaj
          </span>
        )}
      </div>
    </article>
  );
}

function PrivateActionCard({
  groupId,
  activity,
  members,
  squadSize,
}: {
  groupId: string;
  activity: GroupActivityData;
  members: GroupMemberData[];
  squadSize: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const going = Math.min(activity.goingCount + (joined ? 1 : 0), squadSize);
  const missing = Math.max(0, squadSize - going);
  const place = activity.venueName ?? activity.locationNote ?? activity.destinationName ?? 'Miesto TBA';
  const preview = members.slice(0, Math.min(going, squadSize));

  async function joinOneClick() {
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/sessions/${activity.id}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'going' }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'Nepodarilo sa pridať');
      return;
    }

    setJoined(true);
    startTransition(() => router.refresh());
  }

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-[#1F1F1F] p-4">
      {missing > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
          🔴 Chýbajú {missing} {missing === 1 ? 'hráč' : 'hráči'}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Kompletná zostava
        </span>
      )}

      <h4 className="mt-3 text-base font-bold text-white">{activity.title}</h4>
      <p className="mt-1 text-xs text-gray-400">
        {formatCrewWhen(activity.scheduledAt)}
        <span className="mx-1.5 text-white/20">•</span>
        {place}
      </p>

      <div className="mt-4">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
          Sloty {going}/{squadSize}
        </p>
        <CrewAvatarStack people={preview} slots={Math.min(squadSize, 10)} />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={pending || joined || missing === 0}
          onClick={() => void joinOneClick()}
          className="flex-1 rounded-xl bg-[#FF5722] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {joined ? 'Si v hre ✓' : pending ? 'Pridávam…' : 'Pridať sa (1-Click)'}
        </button>
        <Link
          href={`/lobby/groups/${groupId}/sessions/${activity.id}`}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-center text-xs font-bold text-gray-300 transition hover:border-[#FF5722]/40 hover:text-white"
        >
          Detail
        </Link>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </article>
  );
}
