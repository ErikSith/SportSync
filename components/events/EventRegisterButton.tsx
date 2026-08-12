'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { trackSignal } from '@/lib/telemetry/track';

interface EventRegisterButtonProps {
  eventId: string;
  canRegister: boolean;
  isFull: boolean;
  initialRegistered?: boolean;
  initialStatus?: string | null;
  registerLabel?: string;
  registeredLabel?: string;
  /** `compact` = modal / sheet CTAs */
  variant?: 'default' | 'compact';
}

export function EventRegisterButton({
  eventId,
  canRegister,
  isFull,
  initialRegistered = false,
  initialStatus = null,
  registerLabel = 'REGISTER FOR EVENT',
  registeredLabel = 'REGISTERED ✓',
  variant = 'default',
}: EventRegisterButtonProps) {
  const compact = variant === 'compact';
  const idleClass = compact
    ? 'w-full rounded-xl bg-inverse-primary py-3.5 font-label-caps text-[12px] uppercase tracking-[0.16em] text-white transition-all hover:bg-primary-container active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2'
    : 'w-full md:w-auto bg-inverse-primary text-white font-headline-md text-headline-md py-4 px-12 rounded-lg hover:bg-primary-container transition-all shadow-2xl border border-secondary/40 active:scale-[0.98] flex items-center justify-center gap-2 font-bold tracking-wide disabled:opacity-50';
  const doneClass = compact
    ? 'w-full rounded-xl border border-secondary/40 bg-secondary-container/20 py-3.5 font-label-caps text-[12px] uppercase tracking-[0.16em] text-secondary-fixed cursor-default flex items-center justify-center gap-2'
    : 'w-full md:w-auto bg-secondary-container/20 text-secondary-fixed font-headline-md text-headline-md py-4 px-12 rounded-lg border border-secondary/40 flex items-center justify-center gap-2 font-bold tracking-wide cursor-default';
  const blockedClass = compact
    ? 'w-full rounded-xl border border-white/10 bg-surface-container-high py-3.5 font-label-caps text-[12px] uppercase tracking-[0.16em] text-on-surface-variant cursor-not-allowed opacity-70 flex items-center justify-center gap-2'
    : 'w-full md:w-auto bg-surface-container-high text-on-surface-variant font-headline-md text-headline-md py-4 px-12 rounded-lg border border-white/10 flex items-center justify-center gap-2 font-bold tracking-wide cursor-not-allowed opacity-70';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(initialRegistered);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (initialRegistered) return;
    void fetch(`/api/events/${eventId}/register`)
      .then((r) => r.json())
      .then((body: { registered?: boolean; status?: string }) => {
        if (body.registered) {
          setIsRegistered(true);
          setStatus(body.status ?? 'confirmed');
        }
      })
      .catch(() => {});
  }, [eventId, initialRegistered]);

  if (isRegistered) {
    const label = status === 'waitlisted' ? 'ON WAITLIST ✓' : registeredLabel;
    return (
      <button type="button" disabled className={doneClass}>
        {label}
      </button>
    );
  }

  if (!canRegister || isFull) {
    return (
      <button type="button" disabled className={blockedClass}>
        {isFull ? 'EVENT FULL' : 'REGISTRATION CLOSED'}
      </button>
    );
  }

  async function register() {
    setError(null);
    const res = await fetch(`/api/events/${eventId}/register`, { method: 'POST' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'Could not register');
      return;
    }
    const body = (await res.json()) as { status?: string };
    setStatus(body.status ?? 'confirmed');
    setIsRegistered(true);
    trackSignal('event.register', { eventId, status: body.status ?? 'confirmed' });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex w-full flex-col items-stretch md:w-auto">
      <button
        type="button"
        onClick={() => void register()}
        disabled={isPending}
        className={idleClass}
      >
        {isPending ? (compact ? 'Joining…' : 'REGISTERING…') : registerLabel}
        {!compact && <span className="material-symbols-outlined">arrow_forward</span>}
      </button>
      {error && <p className="mt-2 text-center text-xs text-error">{error}</p>}
    </div>
  );
}
