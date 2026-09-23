'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { LobbyCardData, LobbyTypeCode } from '@/lib/data/lobbies';
import { sportDisplayLabel } from '@/lib/constants/sports';
import { sportIcon } from '@/lib/utils/sport-icons';
import { ListingCover } from '@/components/shared/ListingCover';
import { useT } from '@/components/i18n/LocaleProvider';

const REFRESH_MS = 45_000;
/** Home grid: 2 cols × 3 rows — full list stays on /lobby. */
const HOME_VISIBLE = 6;

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function sortLobbies(list: LobbyCardData[]): LobbyCardData[] {
  return [...list].sort(
    (a, b) =>
      asDate(a.scheduledAt).getTime() - asDate(b.scheduledAt).getTime() ||
      a.distanceKm - b.distanceKm ||
      b.spotsTotal - b.spotsFilled - (a.spotsTotal - a.spotsFilled),
  );
}

function formatWhen(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const day = isToday
    ? 'Dnes'
    : isTomorrow
      ? 'Zajtra'
      : date.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${day} · ${time}`;
}

function distanceLabel(km: number): string | null {
  if (km <= 0) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function lobbyTitle(
  lobby: LobbyCardData,
  labels: { needPlayer: string; teamChallenge: string; recurring: string },
): string {
  if (lobby.title?.trim()) return lobby.title.trim();
  const type = lobby.lobbyType as LobbyTypeCode | null;
  if (type === 'NEED_PLAYER' || lobby.mercenaryMode) {
    return `${sportDisplayLabel(lobby.sport)} · ${labels.needPlayer}`;
  }
  if (type === 'TEAM_CHALLENGE') {
    return `${sportDisplayLabel(lobby.sport)} · ${labels.teamChallenge}`;
  }
  if (type === 'RECURRING') {
    return `${sportDisplayLabel(lobby.sport)} · ${labels.recurring}`;
  }
  return sportDisplayLabel(lobby.sport);
}

function coverSrc(lobby: LobbyCardData): string | null {
  if (lobby.coverUrl) return lobby.coverUrl;
  const host = lobby.participants.find((p) => p.name === lobby.hostName);
  return host?.avatarUrl ?? lobby.participants[0]?.avatarUrl ?? null;
}

function LobbyRow({ lobby, index }: { lobby: LobbyCardData; index: number }) {
  const t = useT();
  const when = asDate(lobby.scheduledAt);
  const dist = distanceLabel(lobby.distanceKm);
  const title = lobbyTitle(lobby, {
    needPlayer: t('home.openLobbies.needPlayer'),
    teamChallenge: t('home.openLobbies.teamChallenge'),
    recurring: t('home.openLobbies.recurring'),
  });
  const place = lobby.venueName ?? lobby.city;
  const spots = `${lobby.spotsFilled}/${lobby.spotsTotal}`;
  const badge = dist ?? spots;
  const icon = sportIcon(lobby.sport, title);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ delay: Math.min(index, 8) * 0.02, duration: 0.18 }}
      className="min-w-0"
    >
      <Link
        href={`/lobby/${lobby.id}`}
        className={[
          'group flex h-full w-full items-center gap-2 rounded-xl border border-white/[0.06] bg-[#1F1F1F] px-2 py-1.5 text-left',
          'transition hover:border-[#FF5722]/35 hover:bg-[#262626] active:scale-[0.99]',
        ].join(' ')}
      >
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/[0.06]">
          <ListingCover className="h-full w-full object-cover" src={coverSrc(lobby)} alt="" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <span className="material-symbols-outlined shrink-0 text-[13px] text-[#FF5722]" aria-hidden>
              {icon}
            </span>
            <h4 className="truncate font-headline-md text-[12px] font-semibold text-on-surface group-hover:text-white">
              {title}
            </h4>
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1 font-body-md text-[10px] text-on-surface-variant">
            <span className="shrink-0 text-[#FF5722]">{formatWhen(when)}</span>
            <span className="shrink-0 text-white/20">·</span>
            <span className="truncate">{lobby.hostName}</span>
            <span className="shrink-0 text-white/20">·</span>
            <span className="shrink-0 tabular-nums">{spots}</span>
            {place ? (
              <>
                <span className="hidden shrink-0 text-white/20 sm:inline">·</span>
                <span className="hidden truncate sm:inline">{place}</span>
              </>
            ) : null}
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[#FF5722]/30 bg-[#FF5722]/10 px-1.5 py-0.5 font-label-caps text-[9px] uppercase tracking-wide text-[#FF5722]">
          {badge}
        </span>
      </Link>
    </motion.div>
  );
}

interface OpenLobbiesListProps {
  lobbies: LobbyCardData[];
}

export function OpenLobbiesList({ lobbies }: OpenLobbiesListProps) {
  const t = useT();
  const router = useRouter();
  /** null = show default home order; set only after user picks a sport chip */
  const [sportFilter, setSportFilter] = useState<string | null>(null);

  // Full joinable feed from the same source as `/lobby` — chips must mirror that page.
  const sportCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const lobby of lobbies) {
      const key = lobby.sport.toUpperCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([sport, count]) => ({ sport, count, label: sportDisplayLabel(sport) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'sk'));
  }, [lobbies]);

  useEffect(() => {
    if (sportFilter && !sportCounts.some((s) => s.sport === sportFilter)) {
      setSportFilter(null);
    }
  }, [sportFilter, sportCounts]);

  useEffect(() => {
    if (lobbies.length === 0) return;
    const id = window.setInterval(() => {
      router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [lobbies.length, router]);

  // Default: soonest overall. After chip click: filter that sport, then sort.
  const visible = useMemo(() => {
    const pool = sportFilter
      ? lobbies.filter((l) => l.sport.toUpperCase() === sportFilter)
      : lobbies;
    return sortLobbies(pool).slice(0, HOME_VISIBLE);
  }, [lobbies, sportFilter]);

  const filteredTotal = useMemo(() => {
    if (!sportFilter) return lobbies.length;
    return lobbies.filter((l) => l.sport.toUpperCase() === sportFilter).length;
  }, [lobbies, sportFilter]);

  if (lobbies.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-headline-md text-[15px] text-on-surface md:text-headline-md">
            <span className="material-symbols-outlined text-[#FF5722]" aria-hidden>
              groups
            </span>
            {t('home.openLobbies')}
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-label-caps text-[9px] tabular-nums text-on-surface-variant">
              {visible.length}
              {filteredTotal > visible.length ? `/${filteredTotal}` : ''}
            </span>
          </h3>
          <p className="mt-0.5 pl-8 font-body-md text-sm text-on-surface-variant">
            {t('home.openLobbiesSub')}
          </p>
        </div>
        <Link
          href="/lobby"
          className="group shrink-0 font-label-caps text-[10px] uppercase tracking-[0.12em] text-[#FF5722] hover:brightness-110"
        >
          {t('common.viewAll')}{' '}
          <span className="inline-block transition-transform group-hover:translate-x-0.5">›</span>
        </Link>
      </div>

      {sportCounts.length > 0 ? (
        <div
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={t('home.openLobbies.filterAria')}
        >
          <button
            type="button"
            role="tab"
            aria-selected={sportFilter === null}
            onClick={() => setSportFilter(null)}
            className={[
              'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1',
              'font-label-caps text-[9px] uppercase tracking-[0.08em] transition-colors',
              sportFilter === null
                ? 'border-[#FF5722]/45 bg-[#FF5722]/15 text-[#FF5722]'
                : 'border-white/10 bg-[#1F1F1F] text-on-surface-variant hover:border-white/20',
            ].join(' ')}
          >
            {t('home.openLobbies.filterAll')}
            <span className="tabular-nums opacity-70">{lobbies.length}</span>
          </button>
          {sportCounts.map(({ sport, count, label }) => {
            const active = sportFilter === sport;
            const icon = sportIcon(sport);
            return (
              <button
                key={sport}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSportFilter(active ? null : sport)}
                className={[
                  'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1',
                  'font-label-caps text-[9px] uppercase tracking-[0.08em] transition-colors',
                  active
                    ? 'border-[#FF5722]/45 bg-[#FF5722]/15 text-[#FF5722]'
                    : 'border-white/10 bg-[#1F1F1F] text-on-surface-variant hover:border-white/20',
                ].join(' ')}
              >
                <span className="material-symbols-outlined text-[13px]" aria-hidden>
                  {icon}
                </span>
                {label}
                <span className="tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((lobby, index) => (
            <LobbyRow key={lobby.id} lobby={lobby} index={index} />
          ))}
        </AnimatePresence>
        {visible.length === 0 ? (
          <p className="col-span-full px-1 py-3 font-body-md text-xs text-on-surface-variant">
            {t('home.openLobbies.filterEmpty')}
          </p>
        ) : null}
      </div>
    </section>
  );
}
