'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { LobbyCardData } from '@/lib/data/lobbies';
import { formatLobbyLabel } from '@/lib/constants/lobbies';
import { lobbyTierLabel } from '@/lib/utils/lobby';
import { useT } from '@/components/i18n/LocaleProvider';

const SPORT_ICONS: Record<string, string> = {
  TENNIS: 'sports_tennis',
  PADEL: 'sports_tennis',
  SQUASH: 'sports_martial_arts',
  RUNNING: 'run_circle',
  FOOTBALL: 'sports_soccer',
  BASKETBALL: 'sports_basketball',
};

type LobbyCardVariant = 'discover' | 'active';

function formatScheduleSlot(date: Date): string {
  const now = new Date();
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === now.toDateString()) {
    return `Today, ${time}`;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${time}`;
  }

  const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day}, ${time}`;
}

function shortTier(skillLevel: number | null): string {
  return lobbyTierLabel(skillLevel).replace(/ TIER$/i, '');
}

function lookingStatus(lobby: LobbyCardData): { text: string; className: string } {
  if (lobby.status === 'full' || lobby.spotsFilled >= lobby.spotsTotal) {
    return { text: 'Full', className: 'text-error' };
  }
  const needed = lobby.spotsTotal - lobby.spotsFilled;
  return {
    text: needed === 1 ? 'Looking for 1 player' : `Looking for ${needed} players`,
    className: 'text-emerald-400',
  };
}

function AvatarStack({
  lobby,
  size = 'sm',
  showEmptySlots = false,
}: {
  lobby: LobbyCardData;
  size?: 'sm' | 'md';
  showEmptySlots?: boolean;
}) {
  const dim = size === 'sm' ? 'w-6 h-6 text-[8px]' : 'w-7 h-7 text-[9px]';
  const emptyCount = showEmptySlots
    ? Math.max(0, Math.min(lobby.spotsTotal - lobby.participants.length, 3))
    : lobby.spotsFilled < lobby.spotsTotal
      ? 1
      : 0;

  return (
    <div className="flex items-center -space-x-1.5">
      {lobby.participants.slice(0, 4).map((p) =>
        p.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.id}
            className={`${dim} rounded-full border-2 border-zinc-950 object-cover`}
            src={p.avatarUrl}
            alt={p.name}
          />
        ) : (
          <div
            key={p.id}
            className={`${dim} rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center font-label-caps text-on-surface`}
          >
            {p.name.slice(0, 2).toUpperCase()}
          </div>
        ),
      )}
      {Array.from({ length: emptyCount }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className={`${dim} rounded-md border border-dashed border-white/15 bg-zinc-900/80 flex items-center justify-center font-label-caps text-on-surface-variant`}
          title="Open spot"
        >
          {showEmptySlots && i === emptyCount - 1 && emptyCount > 1 ? (
            <span className="text-[7px] leading-none">Free</span>
          ) : (
            <span className="material-symbols-outlined text-[12px]">add</span>
          )}
        </div>
      ))}
    </div>
  );
}

function JoinButton({
  lobby,
  compact = false,
}: {
  lobby: LobbyCardData;
  compact?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isFull = lobby.status === 'full' || lobby.spotsFilled >= lobby.spotsTotal;
  const base = compact
    ? 'shrink-0 px-2.5 py-1.5 rounded-md font-label-caps text-[9px] transition-colors disabled:opacity-50 text-center'
    : 'w-full py-2.5 rounded-lg font-label-caps text-[10px] transition-colors disabled:opacity-50 text-center';

  if (lobby.isJoined || lobby.isHost) {
    return (
      <Link
        href={`/lobby/${lobby.id}`}
        className={`${base} border border-secondary/40 text-secondary hover:bg-secondary/10`}
      >
        {t('common.view')}
      </Link>
    );
  }

  if (isFull) {
    return (
      <Link
        href={`/lobby/${lobby.id}`}
        className={`${base} bg-zinc-900 text-on-surface-variant border border-white/10`}
      >
        {t('common.view')}
      </Link>
    );
  }

  async function join() {
    setError(null);
    const res = await fetch(`/api/lobbies/${lobby.id}/join`, { method: 'POST' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'Could not join lobby');
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className={compact ? 'shrink-0' : 'w-full'}>
      <button
        type="button"
        onClick={() => void join()}
        disabled={isPending}
        className={`${base} w-full bg-primary-container text-white hover:bg-primary-container/90`}
      >
        {isPending ? '…' : lobby.mercenaryMode ? t('common.joinPlus') : t('common.join')}
      </button>
      {error && <p className="text-error text-[10px] mt-0.5 max-w-[8rem]">{error}</p>}
    </div>
  );
}

function ShareButton({ lobbyId }: { lobbyId: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/lobby/${lobbyId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'SportSync Lobby', url });
        return;
      }
    } catch {
      /* fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-label-caps text-[9px] text-on-surface-variant hover:text-on-surface transition-colors"
    >
      <span className="material-symbols-outlined text-[14px]">ios_share</span>
      {copied ? t('common.copied') : t('common.share')}
    </button>
  );
}

function ActiveLobbyCard({ lobby }: { lobby: LobbyCardData }) {
  const status = lookingStatus(lobby);
  const venue = lobby.venueName ?? lobby.city;

  return (
    <article className="rounded-xl border border-white/10 bg-zinc-950/60 p-3 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-headline-md text-[13px] font-semibold text-on-surface truncate capitalize">
            {lobby.sport.toLowerCase()}
            <span className="text-on-surface-variant font-normal"> · {venue}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant truncate">
            {formatScheduleSlot(lobby.scheduledAt)}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-label-caps ${status.className}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {status.text}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <AvatarStack lobby={lobby} size="md" showEmptySlots />
        <div className="flex items-center gap-1 shrink-0">
          <ShareButton lobbyId={lobby.id} />
          <Link
            href={`/lobby/${lobby.id}`}
            className="rounded-md border border-white/10 px-2 py-1 font-label-caps text-[9px] text-on-surface-variant hover:text-on-surface hover:border-white/20 transition-colors"
          >
            Open
          </Link>
        </div>
      </div>
    </article>
  );
}

function DiscoverLobbyCard({ lobby }: { lobby: LobbyCardData }) {
  const icon = SPORT_ICONS[lobby.sport.toUpperCase()] ?? 'sports';
  const tier = shortTier(lobby.skillLevel);
  const progressPct = Math.min(100, Math.round((lobby.spotsFilled / lobby.spotsTotal) * 100));
  const venue = lobby.venueName ?? lobby.city;
  const title = `${lobby.sport.charAt(0)}${lobby.sport.slice(1).toLowerCase()} ${formatLobbyLabel(lobby.format)}`;

  return (
    <article className="rounded-xl border border-white/10 bg-zinc-950/60 p-3.5 space-y-2 glow-hover transition-all">
      {/* Top: title + skill | JOIN */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">{icon}</span>
          <div className="min-w-0">
            <h3 className="font-headline-md text-[13px] font-semibold text-on-surface truncate leading-tight">
              {title}
            </h3>
            <span className="mt-0.5 inline-block rounded-full border border-primary-container/30 bg-primary-container/10 px-1.5 py-px font-label-caps text-[9px] text-primary-container">
              {tier}
            </span>
          </div>
        </div>
        <JoinButton lobby={lobby} compact />
      </div>

      {/* Middle: venue + distance · time */}
      <div className="space-y-0.5 text-[11px] text-on-surface-variant leading-snug">
        <p className="flex items-center gap-1 min-w-0 truncate">
          <span className="material-symbols-outlined text-[13px] shrink-0 text-secondary/80">location_on</span>
          <span className="truncate">
            {venue}
            {lobby.distanceKm > 0 ? ` · ${lobby.distanceKm} km` : ''}
          </span>
        </p>
        <p className="flex items-center gap-1 min-w-0 truncate">
          <span className="material-symbols-outlined text-[13px] shrink-0 text-secondary/80">schedule</span>
          <span className="truncate">{formatScheduleSlot(lobby.scheduledAt)}</span>
        </p>
      </div>

      {/* Bottom: progress + avatars */}
      <div className="flex items-center gap-3 pt-0.5">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-label-caps text-[9px] text-on-surface-variant">
              {lobby.spotsFilled} / {lobby.spotsTotal} players
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-container transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <AvatarStack lobby={lobby} size="sm" />
      </div>
    </article>
  );
}

export function LobbyCard({
  lobby,
  variant = 'discover',
}: {
  lobby: LobbyCardData;
  variant?: LobbyCardVariant;
}) {
  if (variant === 'active') {
    return <ActiveLobbyCard lobby={lobby} />;
  }
  return <DiscoverLobbyCard lobby={lobby} />;
}
