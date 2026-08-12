'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { trackSignal } from '@/lib/telemetry/track';

interface BookButtonProps {
  lessonId: string;
  isBooked: boolean;
  bookingStatus?: string | null;
  isFull: boolean;
  isScheduled: boolean;
  price?: number;
  venueId?: string | null;
}

export function BookButton({
  lessonId,
  isBooked,
  bookingStatus,
  isFull,
  isScheduled,
  price = 0,
  venueId,
}: BookButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(bookingStatus);

  if (!isScheduled || isFull) {
    return (
      <span className="font-label-caps text-label-caps text-on-surface-variant px-4 py-2 rounded-lg bg-surface-container-high border border-white/5">
        {isFull ? 'FULL' : 'UNAVAILABLE'}
      </span>
    );
  }

  if (isBooked && status === 'PENDING' && price > 0) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="font-label-caps text-label-caps text-on-surface-variant text-[10px]">
          Pay at venue
        </span>
        {venueId ? (
          <a
            href={`/venues/${venueId}`}
            className="font-label-caps text-label-caps text-secondary hover:text-primary transition-colors"
          >
            View venue
          </a>
        ) : null}
      </div>
    );
  }

  if (isBooked) {
    return (
      <span className="font-label-caps text-label-caps text-secondary px-4 py-2 rounded-lg bg-secondary/10 border border-secondary/30">
        BOOKED
      </span>
    );
  }

  async function book() {
    setError(null);
    const res = await fetch(`/api/lessons/${lessonId}/book`, { method: 'POST' });
    const body = (await res.json().catch(() => null)) as { error?: string; status?: string } | null;
    if (!res.ok) {
      setError(body?.error ?? 'Could not book lesson');
      return;
    }
    setStatus(body?.status ?? 'BOOKED');
    trackSignal('lesson.book', { lessonId, status: body?.status ?? 'BOOKED' });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void book()}
        disabled={isPending}
        className="font-label-caps text-label-caps bg-primary-container text-white px-4 py-2 rounded-lg hover:bg-primary-container/90 transition-colors disabled:opacity-50 active:scale-95"
      >
        {isPending ? 'BOOKING…' : price > 0 ? `BOOK · €${price}` : 'BOOK'}
      </button>
      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  );
}
