'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { LOBBY_SPORTS } from '@/lib/constants/sports';
import type { RecurringScheduleData } from '@/lib/data/sport-groups-shared';
import { DAY_OF_WEEK_LABELS, formatDayTime } from '@/lib/data/sport-groups-shared';

interface RecurringSchedulePanelProps {
  groupId: string;
  defaultSport: string;
  schedules: RecurringScheduleData[];
}

export function RecurringSchedulePanel({ groupId, defaultSport, schedules }: RecurringSchedulePanelProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<'idle' | 'submitting'>('idle');
  const [generateState, setGenerateState] = useState<'idle' | 'running'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [sport, setSport] = useState(
    LOBBY_SPORTS.includes(defaultSport as (typeof LOBBY_SPORTS)[number])
      ? (defaultSport as (typeof LOBBY_SPORTS)[number])
      : LOBBY_SPORTS[0],
  );
  const [dayOfWeek, setDayOfWeek] = useState('3');
  const [timeOfDay, setTimeOfDay] = useState('18:00');
  const [locationNote, setLocationNote] = useState('');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !timeOfDay) {
      setError('Please fill in title and time.');
      return;
    }

    setFormState('submitting');

    const res = await fetch(`/api/groups/${groupId}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        sport,
        dayOfWeek: Number(dayOfWeek),
        timeOfDay,
        locationNote: locationNote.trim() || undefined,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setFormState('idle');
      setError(body?.error ?? 'Could not create schedule');
      return;
    }

    setFormState('idle');
    setOpen(false);
    setTitle('');
    setLocationNote('');
    router.refresh();
  }

  async function toggleActive(scheduleId: string, isActive: boolean) {
    await fetch(`/api/groups/${groupId}/schedules/${scheduleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    router.refresh();
  }

  async function deleteSchedule(scheduleId: string) {
    await fetch(`/api/groups/${groupId}/schedules/${scheduleId}`, { method: 'DELETE' });
    router.refresh();
  }

  async function runGenerate() {
    setGenerateState('running');
    setGeneratedMessage(null);
    const res = await fetch(`/api/groups/${groupId}/schedules/generate`, { method: 'POST' });
    const body = (await res.json().catch(() => null)) as { generated?: { title: string }[] } | null;
    setGenerateState('idle');

    if (res.ok) {
      const count = body?.generated?.length ?? 0;
      setGeneratedMessage(count > 0 ? `Planned ${count} new session${count === 1 ? '' : 's'}!` : 'Already up to date for this week.');
      router.refresh();
    }
  }

  const modal =
    open ? (
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        role="presentation"
        onClick={() => setOpen(false)}
      >
        <div
          className="glass-panel rounded-2xl p-6 md:p-8 w-full max-w-lg border border-secondary/10 space-y-6 max-h-[90vh] overflow-y-auto relative z-[101]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 id="schedule-title" className="font-headline-md text-headline-md text-on-surface">
              New Recurring Plan
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-on-surface-variant hover:text-primary transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="schedule-name">
                Title
              </label>
              <input
                id="schedule-name"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekly padel night"
                className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="schedule-sport">
                Sport
              </label>
              <select
                id="schedule-sport"
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
                <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="schedule-day">
                  Day
                </label>
                <select
                  id="schedule-day"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
                >
                  {DAY_OF_WEEK_LABELS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="schedule-time">
                  Time
                </label>
                <input
                  id="schedule-time"
                  type="time"
                  required
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  className="w-full bg-surface-container border-b border-outline-variant/40 px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none rounded-t-lg"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="schedule-location">
                Location note (optional)
              </label>
              <input
                id="schedule-location"
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
                onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-lg border border-outline-variant/40 text-on-surface-variant font-label-caps text-label-caps hover:bg-surface-container transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={formState === 'submitting'}
                className="flex-1 py-3 rounded-lg bg-primary-container text-white font-label-caps text-label-caps glow-hover transition-all disabled:opacity-50"
              >
                {formState === 'submitting' ? 'SAVING…' : 'SAVE PLAN'}
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null;

  return (
    <section className="glass-panel rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container text-[22px]">event_repeat</span>
          Automatic Planning
        </h3>
      </div>

      {schedules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-variant/50 p-4 text-center">
          <p className="font-body-md text-body-md text-on-surface-variant text-sm">No recurring plans yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {schedules.map((schedule) => (
            <li
              key={schedule.id}
              className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                schedule.isActive ? 'bg-surface-container/50 border-white/5' : 'bg-surface-container/20 border-white/5 opacity-60'
              }`}
            >
              <div className="min-w-0">
                <p className="font-body-md text-body-md text-on-surface font-semibold truncate">{schedule.title}</p>
                <p className="font-body-md text-body-md text-on-surface-variant text-xs">
                  {formatDayTime(schedule.dayOfWeek, schedule.timeOfDay)}
                  {schedule.locationNote ? ` • ${schedule.locationNote}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void toggleActive(schedule.id, !schedule.isActive)}
                  className="font-label-caps text-[10px] uppercase text-on-surface-variant hover:text-primary transition-colors"
                >
                  {schedule.isActive ? 'PAUSE' : 'RESUME'}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteSchedule(schedule.id)}
                  className="text-on-surface-variant hover:text-error transition-colors"
                  aria-label="Delete schedule"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {generatedMessage && <p className="font-body-md text-body-md text-secondary text-sm">{generatedMessage}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex-1 py-3 rounded-lg border border-secondary text-secondary font-label-caps text-label-caps hover:bg-secondary/10 transition-colors"
        >
          + NEW PLAN
        </button>
        <button
          type="button"
          onClick={() => void runGenerate()}
          disabled={generateState === 'running' || schedules.length === 0}
          className="flex-1 py-3 rounded-lg bg-primary-container text-white font-label-caps text-label-caps glow-hover transition-all disabled:opacity-50"
        >
          {generateState === 'running' ? 'RUNNING…' : 'GENERATE THIS WEEK'}
        </button>
      </div>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </section>
  );
}
