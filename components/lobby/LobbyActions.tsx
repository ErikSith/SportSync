'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LobbyActionsProps {
  lobbyId: string;
  isHost: boolean;
  isJoined: boolean;
  mercenaryMode: boolean;
  status: string;
  spotsFilled: number;
  spotsTotal: number;
  venueId?: string | null;
  venueName?: string | null;
  websiteUrl?: string | null;
  compact?: boolean;
  /** Render inline (Event/Tournament modal footer) instead of fixed bottom bar. */
  embedded?: boolean;
  onMembershipChange?: (next: {
    isJoined: boolean;
    isHost?: boolean;
    spotsFilled?: number;
    status?: string;
  }) => void;
}

export function LobbyActions({
  lobbyId,
  isHost,
  isJoined,
  mercenaryMode,
  status,
  spotsFilled,
  spotsTotal,
  venueId,
  venueName,
  websiteUrl,
  compact = false,
  embedded = false,
  onMembershipChange,
}: LobbyActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sosState, setSosState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [sosCount, setSosCount] = useState<number | null>(null);

  const isFull = status === 'full' || spotsFilled >= spotsTotal;
  const needsPlayers = !isFull;

  async function join() {
    setError(null);
    const res = await fetch(`/api/lobbies/${lobbyId}/join`, { method: 'POST' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'Could not join lobby');
      return;
    }
    onMembershipChange?.({
      isJoined: true,
      spotsFilled: Math.min(spotsTotal, spotsFilled + 1),
      status: spotsFilled + 1 >= spotsTotal ? 'full' : status,
    });
    startTransition(() => router.refresh());
  }

  async function leave() {
    setError(null);
    const res = await fetch(`/api/lobbies/${lobbyId}/leave`, { method: 'DELETE' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'Could not leave lobby');
      return;
    }
    onMembershipChange?.({
      isJoined: false,
      spotsFilled: Math.max(0, spotsFilled - 1),
      status: 'open',
    });
    startTransition(() => router.refresh());
  }

  async function broadcastSos() {
    setError(null);
    setSosState('sending');
    const res = await fetch(`/api/lobbies/mercenary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lobbyId }),
    });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      candidatesFound?: number;
      suggestionsCreated?: number;
    } | null;

    if (!res.ok) {
      setSosState('error');
      setError(body?.error ?? 'Could not broadcast mercenary SOS');
      return;
    }
    setSosState('done');
    setSosCount(body?.candidatesFound ?? 0);
    startTransition(() => router.refresh());
  }

  function renderButton() {
    const btnBase =
      embedded || compact
        ? 'w-full rounded-xl py-3.5 px-6 font-label-caps text-[12px] uppercase tracking-[0.16em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50'
        : 'w-full md:w-auto flex-1 md:flex-none font-headline-md text-headline-md font-bold py-4 px-12 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50';

    if (isHost) {
      return (
        <button
          type="button"
          disabled
          className={`${btnBase} cursor-not-allowed border border-white/10 bg-surface-container-high text-on-surface-variant opacity-70`}
        >
          Hostíš toto lobby
        </button>
      );
    }

    if (isJoined) {
      return (
        <button
          type="button"
          onClick={() => void leave()}
          disabled={isPending}
          className={`${btnBase} border border-error/40 bg-transparent text-error hover:bg-error-container/10`}
        >
          Opustiť lobby
        </button>
      );
    }

    if (isFull) {
      return (
        <button
          type="button"
          disabled
          className={`${btnBase} cursor-not-allowed border border-white/10 bg-surface-container-high text-on-surface-variant opacity-70`}
        >
          Lobby plné
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void join()}
        disabled={isPending}
        className={
          embedded
            ? `${btnBase} bg-secondary text-on-secondary hover:bg-secondary-fixed-dim`
            : `${btnBase} bg-gradient-to-br from-primary-container to-secondary-container text-white hover:shadow-[0_0_20px_rgba(255,87,34,0.4)]`
        }
      >
        <span>{mercenaryMode ? 'Pridať sa ako +1' : 'Pridať sa'}</span>
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </button>
    );
  }

  if (embedded) {
    return (
      <div className="flex w-full flex-col items-stretch gap-2">
        {isHost && needsPlayers ? (
          <button
            type="button"
            onClick={() => void broadcastSos()}
            disabled={sosState === 'sending' || sosState === 'done'}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-error to-secondary-container px-4 py-2.5 font-label-caps text-[11px] uppercase tracking-[0.14em] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-70"
          >
            <span className="material-symbols-outlined text-[18px]">campaign</span>
            {sosState === 'sending'
              ? 'Vysielam SOS…'
              : sosState === 'done'
                ? `SOS odoslané · ${sosCount ?? 0}`
                : 'Mercenary SOS'}
          </button>
        ) : null}
        {renderButton()}
        {error ? <p className="text-center text-xs text-error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={[
        'fixed bottom-0 left-0 z-50 w-full border-t border-white/5 bg-surface-container-lowest/95 backdrop-blur-2xl',
        compact
          ? 'p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_-12px_32px_rgba(0,0,0,0.65)]'
          : 'p-4 pb-8 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] md:pb-4',
      ].join(' ')}
    >
      <div
        className={[
          'mx-auto flex max-w-md flex-col gap-2',
          compact ? '' : 'max-w-7xl px-container-margin-mobile md:max-w-7xl md:flex-row md:items-center md:justify-between md:px-container-margin-desktop',
        ].join(' ')}
      >
        {!compact ? (
          <div className="hidden md:flex md:flex-wrap md:items-center md:gap-3">
            {websiteUrl ? (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[#FF5722]/35 bg-[#FF5722]/15 px-3 py-2 font-label-caps text-[10px] uppercase tracking-wide text-[#FF5722] transition hover:bg-[#FF5722]/25"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                Rezervovať kurt
              </a>
            ) : null}
            {venueId ? (
              <Link
                href={`/venues/${venueId}`}
                className="inline-flex items-center gap-2 font-label-caps text-label-caps text-secondary transition-colors hover:text-secondary-fixed"
              >
                <span className="material-symbols-outlined text-[18px]">stadium</span>
                {venueName ?? 'Športovisko'}
              </Link>
            ) : !websiteUrl ? (
              <p className="font-body-md text-sm text-on-surface-variant">
                Rezerváciu kurtu dohodnite priamo so športoviskom.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex w-full flex-col items-stretch">
          {isHost && needsPlayers ? (
            <button
              type="button"
              onClick={() => void broadcastSos()}
              disabled={sosState === 'sending' || sosState === 'done'}
              className={[
                'mb-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-error to-secondary-container font-bold text-white transition-all active:scale-[0.98] disabled:opacity-70',
                compact ? 'px-4 py-2.5 text-xs' : 'px-8 py-3 font-headline-md text-headline-md',
              ].join(' ')}
            >
              <span className="material-symbols-outlined text-[18px]">campaign</span>
              {sosState === 'sending'
                ? 'BROADCASTING SOS…'
                : sosState === 'done'
                  ? `SOS SENT · ${sosCount ?? 0}`
                  : 'BROADCAST MERCENARY SOS'}
            </button>
          ) : null}
          {renderButton()}
          {error ? <p className="mt-1.5 text-center text-xs text-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
