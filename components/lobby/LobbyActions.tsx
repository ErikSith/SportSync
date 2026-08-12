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
    if (isHost) {
      return (
        <button
          type="button"
          disabled
          className="w-full md:w-auto flex-1 md:flex-none bg-surface-container-high text-on-surface-variant font-headline-md text-headline-md font-bold py-4 px-12 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed opacity-70"
        >
          YOU&apos;RE HOSTING
        </button>
      );
    }

    if (isJoined) {
      return (
        <button
          type="button"
          onClick={() => void leave()}
          disabled={isPending}
          className="w-full md:w-auto flex-1 md:flex-none bg-transparent border border-error/40 text-error font-headline-md text-headline-md font-bold py-4 px-12 rounded-lg hover:bg-error-container/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          LEAVE LOBBY
        </button>
      );
    }

    if (isFull) {
      return (
        <button
          type="button"
          disabled
          className="w-full md:w-auto flex-1 md:flex-none bg-surface-container-high text-on-surface-variant font-headline-md text-headline-md font-bold py-4 px-12 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed opacity-70"
        >
          LOBBY FULL
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void join()}
        disabled={isPending}
        className="w-full md:w-auto flex-1 md:flex-none bg-gradient-to-br from-primary-container to-secondary-container text-white font-headline-md text-headline-md font-bold py-4 px-12 rounded-lg hover:shadow-[0_0_20px_rgba(255,87,34,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <span>{mercenaryMode ? 'JOIN AS MERCENARY +1' : 'JOIN LOBBY'}</span>
        <span className="material-symbols-outlined">arrow_forward</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 w-full bg-surface-container-lowest/90 backdrop-blur-2xl border-t border-white/5 p-4 z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] pb-8 md:pb-4">
      <div className="max-w-7xl mx-auto px-container-margin-mobile md:px-container-margin-desktop flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="hidden md:block">
          {venueId ? (
            <Link
              href={`/venues/${venueId}`}
              className="inline-flex items-center gap-2 font-label-caps text-label-caps text-secondary hover:text-secondary-fixed transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">stadium</span>
              Book at {venueName ?? 'venue'}
            </Link>
          ) : (
            <p className="font-body-md text-body-md text-on-surface-variant text-sm">
              Book courts and tickets at the venue — not in SportSync.
            </p>
          )}
        </div>
        <div className="w-full md:w-auto flex flex-col items-stretch md:items-end">
          {isHost && needsPlayers && (
            <button
              type="button"
              onClick={() => void broadcastSos()}
              disabled={sosState === 'sending' || sosState === 'done'}
              className="w-full md:w-auto flex-1 md:flex-none mb-2 bg-gradient-to-br from-error to-secondary-container text-white font-headline-md text-headline-md font-bold py-3 px-8 rounded-lg hover:shadow-[0_0_20px_rgba(255,87,34,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <span className="material-symbols-outlined">campaign</span>
              {sosState === 'sending'
                ? 'BROADCASTING SOS…'
                : sosState === 'done'
                  ? `SOS SENT · ${sosCount ?? 0} MERCENARIES NOTIFIED`
                  : 'BROADCAST MERCENARY SOS'}
            </button>
          )}
          {renderButton()}
          {error && <p className="text-error text-xs mt-2 text-center md:text-right">{error}</p>}
        </div>
      </div>
    </div>
  );
}
