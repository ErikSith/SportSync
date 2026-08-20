'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type {
  GearClaimData,
  GroupDetailData,
  GroupMemberData,
  SessionRsvpStatus,
} from '@/lib/data/sport-groups-shared';
import {
  DAY_OF_WEEK_LABELS,
  formatDayTime,
  formatSessionCost,
  GEAR_ITEM_LABELS,
  GROUP_SPORT_ICONS,
  perPersonCost,
} from '@/lib/data/sport-groups-shared';
import { TopAppBar } from '@/components/home/TopAppBar';
import { PlanActivityForm } from '@/components/lobby/groups/PlanActivityForm';
import { CrewLockerRoom } from '@/components/lobby/groups/CrewLockerRoom';
import { DeleteCrewButton } from '@/components/lobby/groups/DeleteCrewButton';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { PollRefresh } from '@/lib/realtime/usePollingRefresh';

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatSessionWhen(value: Date | string): string {
  const date = asDate(value);
  const now = new Date();
  const start = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const endDate = new Date(date.getTime() + 90 * 60_000);
  const end = endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const range = `${start} - ${end}`;

  if (date.toDateString() === now.toDateString()) return `Today, ${range}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${range}`;
  return `${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${range}`;
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 10);
  return `${parts[0]} ${parts[1]!.charAt(0)}.`;
}

type RosterTone = 'going' | 'declined' | 'maybe' | 'pending';

interface RosterPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  tone: RosterTone;
}

function buildRoster(
  members: GroupMemberData[],
  goingIds: string[],
  declinedIds: string[],
  maybeIds: string[],
): RosterPerson[] {
  const going = new Set(goingIds);
  const declined = new Set(declinedIds);
  const maybe = new Set(maybeIds);
  return members.map((m) => {
    let tone: RosterTone = 'pending';
    if (going.has(m.id)) tone = 'going';
    else if (declined.has(m.id)) tone = 'declined';
    else if (maybe.has(m.id)) tone = 'maybe';
    return { id: m.id, name: m.name, avatarUrl: m.avatarUrl, tone };
  });
}

function RosterAvatar({ person }: { person: RosterPerson }) {
  const badge =
    person.tone === 'going'
      ? { icon: 'check', className: 'bg-emerald-500' }
      : person.tone === 'declined'
        ? { icon: 'close', className: 'bg-red-500' }
        : { icon: 'schedule', className: 'bg-zinc-500' };

  return (
    <div className="flex w-[48px] flex-col items-center gap-0.5">
      <div className="relative">
        <div
          className={`h-10 w-10 overflow-hidden rounded-full ${
            person.tone === 'declined' ? 'grayscale opacity-70' : ''
          } ${
            person.tone === 'going'
              ? 'ring-2 ring-emerald-400'
              : person.tone === 'declined'
                ? 'ring-2 ring-red-400/80'
                : 'ring-2 ring-white/10'
          }`}
        >
          {person.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#2A2A2A] text-[10px] font-bold text-gray-300">
              {person.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#1F1F1F] text-white ${badge.className}`}
        >
          <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {badge.icon}
          </span>
        </span>
      </div>
      <span className="w-full truncate text-center text-[10px] font-medium text-gray-300">
        {shortName(person.name)}
      </span>
    </div>
  );
}

interface YourCrewsPageProps {
  group: GroupDetailData;
  viewerId: string;
  viewerName: string;
  viewerAvatarUrl: string | null;
  gearClaims: GearClaimData[];
}

export function YourCrewsPage({
  group,
  viewerId,
  viewerName,
  viewerAvatarUrl,
  gearClaims,
}: YourCrewsPageProps) {
  const router = useRouter();
  const [planOpen, setPlanOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  /** Full-viewport hub — no document scroll under ThumbButton body padding. */
  useBodyScrollLock(true);

  const now = Date.now();
  const nextActivity = useMemo(() => {
    const upcoming = group.activities
      .filter((a) => a.isPinned || asDate(a.scheduledAt).getTime() >= now)
      .sort((a, b) => asDate(a.scheduledAt).getTime() - asDate(b.scheduledAt).getTime());
    return upcoming[0] ?? null;
  }, [group.activities, now]);

  const schedule = group.recurringSchedules.find((s) => s.isActive) ?? group.recurringSchedules[0];
  const scheduleLabel = schedule
    ? formatDayTime(schedule.dayOfWeek, schedule.timeOfDay.slice(0, 5))
    : nextActivity
      ? `Next · ${DAY_OF_WEEK_LABELS[asDate(nextActivity.scheduledAt).getDay()]}`
      : 'No schedule yet';

  /** Denominator = crew size (people in the group). */
  const capacity = Math.max(1, group.members.length);
  const sportIcon = GROUP_SPORT_ICONS[group.sport.toUpperCase()] ?? 'groups';

  const [status, setStatus] = useState<SessionRsvpStatus | null>(() => {
    if (!nextActivity) return null;
    if (nextActivity.goingUserIds.includes(viewerId)) return 'going';
    if (nextActivity.declinedUserIds.includes(viewerId)) return 'declined';
    if (nextActivity.maybeUserIds.includes(viewerId)) return 'maybe';
    return null;
  });
  const [goingLocal, setGoingLocal] = useState(nextActivity?.goingCount ?? 0);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  useEffect(() => {
    if (!nextActivity) return;
    setGoingLocal(nextActivity.goingCount);
    if (nextActivity.goingUserIds.includes(viewerId)) setStatus('going');
    else if (nextActivity.declinedUserIds.includes(viewerId)) setStatus('declined');
    else if (nextActivity.maybeUserIds.includes(viewerId)) setStatus('maybe');
    else setStatus(null);
  }, [nextActivity, viewerId]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      const t = e.target as Node | null;
      if (menuRef.current && t && !menuRef.current.contains(t)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [menuOpen]);

  /** Roster tones follow RSVP; viewer status applied optimistically. */
  const roster = useMemo(() => {
    if (!nextActivity) {
      return group.members.map((m) => ({
        id: m.id,
        name: m.name,
        avatarUrl: m.avatarUrl,
        tone: 'pending' as const,
      }));
    }

    let goingIds = nextActivity.goingUserIds.filter((id) => id !== viewerId);
    let declinedIds = nextActivity.declinedUserIds.filter((id) => id !== viewerId);
    let maybeIds = nextActivity.maybeUserIds.filter((id) => id !== viewerId);

    if (status === 'going') goingIds = [...goingIds, viewerId];
    else if (status === 'declined') declinedIds = [...declinedIds, viewerId];
    else if (status === 'maybe') maybeIds = [...maybeIds, viewerId];

    // Going first, then maybe, pending, declined — matches confirmation focus in the design.
    const people = buildRoster(group.members, goingIds, declinedIds, maybeIds);
    const order: Record<RosterTone, number> = { going: 0, maybe: 1, pending: 2, declined: 3 };
    return [...people].sort((a, b) => order[a.tone] - order[b.tone]);
  }, [group.members, nextActivity, status, viewerId]);

  const place =
    nextActivity?.destinationName ??
    nextActivity?.venueName ??
    nextActivity?.locationNote ??
    schedule?.locationNote ??
    'Venue TBA';

  const perPlayer =
    nextActivity && nextActivity.totalCostCents && nextActivity.totalCostCents > 0
      ? perPersonCost(nextActivity.totalCostCents, Math.max(1, goingLocal), nextActivity.costCurrency)
      : formatSessionCost(null);

  const claimByItem = new Map(gearClaims.map((c) => [c.item, c]));

  async function setRsvp(next: SessionRsvpStatus) {
    if (!nextActivity) return;
    setRsvpError(null);
    const prev = status;
    const prevGoing = goingLocal;
    setStatus(next);
    setGoingLocal((g) => {
      let n = g;
      if (prev === 'going' && next !== 'going') n = Math.max(0, g - 1);
      if (prev !== 'going' && next === 'going') n = Math.min(capacity, g + 1);
      return n;
    });

    const res = await fetch(`/api/groups/${group.id}/sessions/${nextActivity.id}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });

    if (!res.ok) {
      setStatus(prev);
      setGoingLocal(prevGoing);
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setRsvpError(body?.error ?? 'RSVP failed');
      return;
    }
    startTransition(() => router.refresh());
  }

  function rsvpBtn(value: SessionRsvpStatus, label: string, icon: string) {
    const active = status === value;
    return (
      <button
        type="button"
        disabled={pending || !nextActivity}
        onClick={() => void setRsvp(value)}
        className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 transition-transform active:scale-[0.97] disabled:opacity-50 ${
          active
            ? 'bg-[#FF5722] text-white shadow-[0_8px_20px_rgba(255,87,34,0.3)]'
            : 'border border-white/10 bg-[#2A2A2A] text-gray-300'
        }`}
      >
        <span className="material-symbols-outlined text-[16px]">{icon}</span>
        <span className="text-[10px] font-bold">{label}</span>
      </button>
    );
  }

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/lobby/groups/join/${group.inviteCode}`
      : `/lobby/groups/join/${group.inviteCode}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      /* ignore */
    }
    setMenuOpen(false);
  }

  return (
    <>
      <PollRefresh intervalMs={15000} />
      <div
        data-scroll-lock-allow
        className="fixed inset-0 z-40 flex flex-col overflow-hidden overscroll-none bg-[#121212] text-white"
      >
        <TopAppBar avatarUrl={viewerAvatarUrl} name={viewerName} />

        <main className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-2 overflow-hidden px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.25rem+env(safe-area-inset-top,0px))]">
          <header className="flex shrink-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-headline-md text-[1.4rem] leading-tight tracking-wide text-white">
                Your Crews
              </h1>
              <p className="mt-0.5 truncate text-[11px] text-gray-400">
                Manage teams, squads, and regular sessions.
              </p>
            </div>
            <Link
              href="/lobby/groups/create"
              aria-label="Create crew"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FF5722] text-white shadow-[0_6px_18px_rgba(255,87,34,0.35)] transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </Link>
          </header>

          <article className="shrink-0 overflow-hidden rounded-[1.1rem] border border-white/[0.06] bg-[#1F1F1F]">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FF5722]/15 text-[#FF7F50]">
                <span className="material-symbols-outlined text-[20px]">{sportIcon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[14px] font-bold text-white">{group.name}</h2>
                <p className="truncate text-[11px] text-gray-400">{scheduleLabel}</p>
              </div>
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  aria-label="Crew menu"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition active:scale-90 hover:bg-white/5"
                >
                  <span className="material-symbols-outlined text-[22px]">more_horiz</span>
                </button>
                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+4px)] z-20 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#2A2A2A] shadow-2xl"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setPlanOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm text-white active:bg-white/5"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#FF7F50]">event</span>
                      Propose session
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void copyInvite()}
                      className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm text-white active:bg-white/5"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#FF7F50]">link</span>
                      Copy invite
                    </button>
                    {group.isOwner ? (
                      <div className="border-t border-white/5 p-2">
                        <DeleteCrewButton groupId={group.id} groupName={group.name} variant="danger" />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {nextActivity ? (
              <div className="space-y-2 border-t border-white/[0.05] px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-label-caps text-[9px] uppercase tracking-[0.16em] text-[#FF7F50]">
                      Next session
                    </p>
                    <p className="mt-0.5 text-[14px] font-bold leading-snug text-white">
                      {formatSessionWhen(nextActivity.scheduledAt)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                      <span className="material-symbols-outlined text-[13px] text-[#FF7F50]">location_on</span>
                      <span className="truncate">{place}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold leading-none text-white">
                      {goingLocal}
                      <span className="text-gray-500">/{capacity}</span>
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-gray-400">Confirmed</p>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-[11px] font-semibold text-white">Are you in?</p>
                  <div className="flex gap-1.5">
                    {rsvpBtn('going', "I'm In", 'check')}
                    {rsvpBtn('declined', 'Out', 'close')}
                    {rsvpBtn('maybe', 'Maybe', 'help')}
                  </div>
                  {rsvpError ? <p className="mt-1 text-[11px] text-red-400">{rsvpError}</p> : null}
                </div>
              </div>
            ) : (
              <div className="border-t border-white/[0.05] px-3 py-3 text-center">
                <p className="text-[11px] text-gray-400">No upcoming session yet.</p>
                <button
                  type="button"
                  onClick={() => setPlanOpen(true)}
                  className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#FF5722] px-3 text-[12px] font-bold text-white active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Propose session
                </button>
              </div>
            )}
          </article>

          <section className="shrink-0 rounded-[1.1rem] border border-white/[0.06] bg-[#1F1F1F] px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <h3 className="text-[12px] font-bold text-white">Roster Status</h3>
              <Link
                href={
                  nextActivity
                    ? `/lobby/groups/${group.id}/sessions/${nextActivity.id}`
                    : `/lobby/groups/${group.id}`
                }
                className="text-[12px] font-semibold text-[#FF7F50] active:opacity-80"
              >
                View All ({group.members.length})
              </Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {roster.slice(0, 8).map((person) => (
                <RosterAvatar key={person.id} person={person} />
              ))}
            </div>
          </section>

          <CrewLockerRoom
            groupId={group.id}
            viewerName={viewerName}
            viewerAvatarUrl={viewerAvatarUrl}
            teaser
          />

          <div className="grid shrink-0 grid-cols-2 gap-2">
            <section className="rounded-[1rem] border border-white/[0.06] bg-[#1F1F1F] px-2.5 py-2">
              <div className="mb-1 flex items-center gap-1 text-gray-400">
                <span className="material-symbols-outlined text-[14px]">payments</span>
                <span className="font-label-caps text-[8px] uppercase tracking-[0.14em]">
                  Split costs
                </span>
              </div>
              <p className="text-base font-bold leading-none text-white">{perPlayer}</p>
              <p className="mt-0.5 text-[9px] text-gray-500">per player</p>
            </section>

            <section className="rounded-[1rem] border border-white/[0.06] bg-[#1F1F1F] px-2.5 py-2">
              <div className="mb-1 flex items-center gap-1 text-gray-400">
                <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                <span className="font-label-caps text-[8px] uppercase tracking-[0.14em]">
                  Equipment
                </span>
              </div>
              <ul className="space-y-0.5 text-[11px]">
                {(['ball', 'bibs'] as const).map((item) => {
                  const claim = claimByItem.get(item);
                  const label = GEAR_ITEM_LABELS[item].label;
                  return (
                    <li key={item} className="flex justify-between gap-2">
                      <span className="text-gray-400">{label}:</span>
                      <span className={claim ? 'font-semibold text-white' : 'font-semibold text-[#FF7F50]'}>
                        {claim ? claim.name.split(' ')[0] : 'Needed'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </main>
      </div>

      <PlanActivityForm
        groupId={group.id}
        defaultSport={group.sport}
        hideTrigger
        open={planOpen}
        onOpenChange={setPlanOpen}
      />
    </>
  );
}
