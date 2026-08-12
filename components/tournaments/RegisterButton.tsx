'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { trackSignal } from '@/lib/telemetry/track';

interface RegisterButtonProps {
  tournamentId: string;
  isRegistered: boolean;
  registrationStatus?: string | null;
  canRegister: boolean;
  isFull: boolean;
  entryFee?: number;
  venueId?: string | null;
  variant?: 'default' | 'compact';
  registerLabel?: string;
  registeredLabel?: string;
}

export function RegisterButton({
  tournamentId,
  isRegistered: initialRegistered,
  registrationStatus,
  canRegister,
  isFull,
  entryFee = 0,
  venueId,
  variant = 'default',
  registerLabel,
  registeredLabel = 'Joined ✓',
}: RegisterButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(registrationStatus);
  const [isRegistered, setIsRegistered] = useState(initialRegistered);
  const compact = variant === 'compact';

  useEffect(() => {
    setIsRegistered(initialRegistered);
    setStatus(registrationStatus);
  }, [initialRegistered, registrationStatus]);

  useEffect(() => {
    if (initialRegistered) return;
    void fetch(`/api/tournaments/${tournamentId}/register`)
      .then((r) => r.json())
      .then((body: { registered?: boolean; status?: string }) => {
        if (body.registered) {
          setIsRegistered(true);
          setStatus(body.status ?? 'CONFIRMED');
        }
      })
      .catch(() => {});
  }, [tournamentId, initialRegistered]);

  const defaultLabel =
    entryFee > 0 ? `Register · €${entryFee}` : 'Register';
  const joinLabel = registerLabel ?? defaultLabel;

  const idleClass = compact
    ? 'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-label-caps text-[12px] uppercase tracking-[0.16em] text-[#14120e] transition-all active:scale-[0.98] disabled:opacity-50'
    : 'w-full font-headline-md text-[16px] md:text-[18px] py-4 px-8 rounded-lg uppercase tracking-wider font-bold transition-all duration-300 glow-hover active:scale-[0.98] flex items-center justify-center gap-2 text-white disabled:opacity-50';

  const doneClass = compact
    ? 'flex w-full cursor-default items-center justify-center gap-2 rounded-xl border py-3.5 font-label-caps text-[12px] uppercase tracking-[0.16em] text-[#e8d59a]'
    : 'w-full md:w-auto flex-1 md:flex-none font-headline-md text-[16px] md:text-[18px] py-4 px-8 rounded-lg uppercase tracking-wider font-bold border border-secondary-fixed/40 text-secondary-fixed bg-secondary-container/10 cursor-default';

  if (isRegistered && status === 'PENDING' && entryFee > 0) {
    if (compact) {
      return (
        <div className="w-full space-y-2 text-center">
          <p className="font-body-md text-sm text-on-surface-variant">
            Pay entry fee at the venue — SportSync doesn&apos;t process payments.
          </p>
          <p className={doneClass} style={{ borderColor: 'rgba(196, 160, 53, 0.35)', backgroundColor: 'rgba(196, 160, 53, 0.1)' }}>
            Pending payment
          </p>
          {venueId ? (
            <a
              href={`/venues/${venueId}`}
              className="inline-flex font-label-caps text-[10px] uppercase tracking-[0.14em] text-[#c4a035] transition-colors hover:text-[#e8d59a]"
            >
              Go to venue →
            </a>
          ) : null}
        </div>
      );
    }
    return (
      <div className="w-full md:w-auto flex-1 md:flex-none text-center md:text-right space-y-2">
        <p className="font-body-md text-body-md text-on-surface-variant text-sm">
          Pay entry fee at the venue — SportSync doesn&apos;t process payments.
        </p>
        {venueId && (
          <a
            href={`/venues/${venueId}`}
            className="inline-flex items-center gap-2 font-label-caps text-label-caps text-secondary hover:text-primary transition-colors"
          >
            Go to venue
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </a>
        )}
      </div>
    );
  }

  if (isRegistered) {
    return (
      <button
        type="button"
        disabled
        className={doneClass}
        style={
          compact
            ? {
                borderColor: 'rgba(196, 160, 53, 0.35)',
                backgroundColor: 'rgba(196, 160, 53, 0.1)',
              }
            : undefined
        }
      >
        {status === 'PENDING' ? 'Pending ✓' : registeredLabel}
      </button>
    );
  }

  if (!canRegister || isFull) {
    if (compact) {
      return (
        <button
          type="button"
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-surface-container-high py-3.5 font-label-caps text-[12px] uppercase tracking-[0.16em] text-on-surface-variant opacity-70"
        >
          {isFull ? 'Cup full' : 'Registration closed'}
        </button>
      );
    }
    return (
      <p className="font-body-md text-body-md text-on-surface-variant text-center w-full">
        {isFull ? 'This tournament is full.' : 'Registration is closed.'}
      </p>
    );
  }

  async function register() {
    setError(null);
    const res = await fetch(`/api/tournaments/${tournamentId}/register`, { method: 'POST' });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      status?: string;
      externalUrl?: string | null;
    } | null;
    if (!res.ok) {
      // Aggregated cups — send the user to the organizer site instead of showing skill errors.
      if (body?.externalUrl) {
        window.location.assign(body.externalUrl);
        return;
      }
      setError(body?.error ?? 'Could not register');
      return;
    }
    setStatus(body?.status ?? 'CONFIRMED');
    setIsRegistered(true);
    trackSignal('tournament.register', { tournamentId, status: body?.status ?? 'CONFIRMED' });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex w-full flex-col items-stretch md:w-auto md:flex-none">
      <button
        type="button"
        onClick={() => void register()}
        disabled={isPending}
        className={idleClass}
        style={
          compact
            ? {
                background: `linear-gradient(135deg, #c4a035 0%, #e8d59a 55%, #c4a035 100%)`,
                border: '1px solid rgba(196, 160, 53, 0.45)',
              }
            : {
                background:
                  'linear-gradient(135deg, rgb(176, 47, 0) 0%, rgb(230, 74, 25) 50%, rgb(212, 175, 55) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
              }
        }
      >
        <span>{isPending ? (compact ? 'Joining…' : 'Registering…') : joinLabel}</span>
        {!compact && (
          <span className="material-symbols-outlined text-[20px] font-bold">arrow_forward</span>
        )}
      </button>
      {error && <p className="mt-2 text-center text-xs text-error">{error}</p>}
    </div>
  );
}
