'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { LOBBY_SPORTS } from '@/lib/constants/sports';

interface PlanActivityFormProps {
  groupId: string;
  defaultSport: string;
}

export function PlanActivityForm({ groupId, defaultSport }: PlanActivityFormProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<'idle' | 'submitting'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [sport, setSport] = useState(
    LOBBY_SPORTS.includes(defaultSport as (typeof LOBBY_SPORTS)[number])
      ? (defaultSport as (typeof LOBBY_SPORTS)[number])
      : LOBBY_SPORTS[0],
  );
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [locationNote, setLocationNote] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeModal();
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function resetForm() {
    setTitle('');
    setScheduledDate('');
    setScheduledTime('');
    setLocationNote('');
    setError(null);
    setFormState('idle');
  }

  function closeModal() {
    setOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !scheduledDate || !scheduledTime) {
      setError('Please fill in title, date, and time.');
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      setError('Invalid date or time.');
      return;
    }

    setFormState('submitting');

    const res = await fetch(`/api/groups/${groupId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        sport,
        scheduledAt: scheduledAt.toISOString(),
        locationNote: locationNote.trim() || undefined,
      }),
    });

    const body = (await res.json().catch(() => null)) as { error?: string; activityId?: string } | null;

    if (!res.ok) {
      setFormState('idle');
      setError(body?.error ?? 'Could not plan activity');
      return;
    }

    closeModal();
    if (body?.activityId) {
      router.push(`/lobby/groups/${groupId}/sessions/${body.activityId}`);
    } else {
      router.refresh();
    }
  }

  const modal = open ? (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="presentation"
      onClick={closeModal}
    >
      <div
        className="glass-panel rounded-2xl p-6 md:p-8 w-full max-w-lg border border-secondary/10 space-y-6 max-h-[90vh] overflow-y-auto relative z-[101]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-activity-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="plan-activity-title" className="font-headline-md text-headline-md text-on-surface">
            Plan Activity
          </h3>
          <button
            type="button"
            onClick={closeModal}
            className="text-on-surface-variant hover:text-primary transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant">
          Schedule a session, then coordinate RSVP, parking, destination, and payment with your crew.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1">
            <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="activity-title">
              Title
            </label>
            <input
              id="activity-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Saturday padel session"
              className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="activity-sport">
              Sport
            </label>
            <select
              id="activity-sport"
              value={sport}
              onChange={(e) => setSport(e.target.value as (typeof LOBBY_SPORTS)[number])}
              className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
            >
              {LOBBY_SPORTS.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0) + option.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="activity-date">
                Date
              </label>
              <input
                id="activity-date"
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-surface-container border-b border-outline-variant/40 px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none rounded-t-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="activity-time">
                Time
              </label>
              <input
                id="activity-time"
                type="time"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-surface-container border-b border-outline-variant/40 px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none rounded-t-lg"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="activity-location">
              Location note (optional)
            </label>
            <input
              id="activity-location"
              type="text"
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder="Padel Arena Bratislava"
              className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
            />
          </div>

          {error && <p className="font-body-md text-body-md text-error">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-3 rounded-lg border border-outline-variant/40 text-on-surface-variant font-label-caps text-label-caps hover:bg-surface-container transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={formState === 'submitting'}
              className="flex-1 py-3 rounded-lg bg-primary-container text-white font-label-caps text-label-caps glow-hover transition-all disabled:opacity-50"
            >
              {formState === 'submitting' ? 'SAVING…' : 'SAVE SESSION'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-4 rounded-lg bg-primary-container text-white font-label-caps text-label-caps glow-hover transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">event_available</span>
        PLAN ACTIVITY
      </button>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
