'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EventIntent } from '@/lib/ai/event-intent';
import { EVENT_SPORTS } from '@/lib/constants/sports';
import { SUPPORTED_CITIES } from '@/lib/cities';

type Step = 'brief' | 'review' | 'publishing' | 'done';

interface TeamEventCreatorProps {
  defaultCity?: string | null;
}

const EXAMPLE_BRIEF =
  'We are the Bratislava Strikers football team. We need a friendly 11v11 match next Saturday at 18:00 in Bratislava for 22 players. Free entry, casual vibe.';

function formatPreviewDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TeamEventCreator({ defaultCity }: TeamEventCreatorProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('brief');
  const [teamName, setTeamName] = useState('');
  const [brief, setBrief] = useState('');
  const [intent, setIntent] = useState<EventIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const canGenerate = brief.trim().length >= 12;

  async function handleGenerate() {
    setError(null);
    setStep('review');

    const res = await fetch('/api/ai/events/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief,
        teamName: teamName.trim() || undefined,
        defaultCity: defaultCity ?? undefined,
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      error?: string;
      intent?: EventIntent;
      source?: 'openai' | 'heuristic';
    } | null;

    if (!res.ok || !body?.intent) {
      setStep('brief');
      setError(body?.error ?? 'Could not understand the brief. Try adding sport, city, date and player count.');
      return;
    }

    setIntent(body.intent);
  }

  async function handlePublish() {
    if (!intent) return;
    setError(null);
    setStep('publishing');

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intent),
    });

    const body = (await res.json().catch(() => null)) as { error?: string; eventId?: string } | null;

    if (!res.ok || !body?.eventId) {
      setStep('review');
      setError(body?.error ?? 'Could not publish event');
      return;
    }

    setCreatedEventId(body.eventId);
    setStep('done');
    router.push('/events');
  }

  function updateIntentField<K extends keyof EventIntent>(key: K, value: EventIntent[K]) {
    setIntent((current) => (current ? { ...current, [key]: value } : current));
  }

  if (step === 'done' && createdEventId) {
    return (
      <>
        <main className="min-h-screen flex items-center justify-center px-container-margin-mobile pb-8">
          <section className="glass-panel rounded-2xl p-8 w-full max-w-md text-center space-y-6 border border-primary/20">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary-container/20 flex items-center justify-center border border-primary-container/40">
              <span className="material-symbols-outlined text-primary-container text-[32px]">check_circle</span>
            </div>
            <div className="space-y-2">
              <h1 className="font-headline-md text-headline-md text-on-surface">Event published</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Your event is live. Reminders and capacity tracking are enabled.
              </p>
            </div>
            <Link
              href="/events"
              className="inline-flex w-full py-3 rounded-lg bg-primary-container text-white font-label-caps text-label-caps items-center justify-center gap-2"
            >
              VIEW EVENTS
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="fixed top-0 w-full bg-background/90 backdrop-blur-xl border-b border-white/5 z-50 shadow-2xl shadow-black/40 px-container-margin-mobile md:px-container-margin-desktop h-16 flex items-center justify-between">
        <Link href="/events" className="text-on-surface-variant hover:text-primary transition-colors flex items-center group">
          <span className="material-symbols-outlined mr-2 group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-label-caps text-label-caps uppercase hidden md:inline">Back</span>
        </Link>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Create Team Event</h1>
        <div className="w-10" />
      </header>

      <main className="pt-24 pb-32 px-container-margin-mobile md:px-container-margin-desktop max-w-3xl mx-auto min-h-screen">
        <section className="mb-8 space-y-3">
          <h2 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Describe what your team needs</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Tell us the sport, date, city, player count and vibe. We&apos;ll turn your brief into a community event.
          </p>
        </section>

        {step === 'brief' && (
          <section className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 border border-primary/20">
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="teamName">
                Team / crew name (optional)
              </label>
              <input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Bratislava Strikers"
                className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="brief">
                Event brief
              </label>
              <textarea
                id="brief"
                rows={8}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={EXAMPLE_BRIEF}
                className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-4 py-3 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none resize-y min-h-[180px]"
              />
              <button
                type="button"
                onClick={() => setBrief(EXAMPLE_BRIEF)}
                className="font-label-caps text-label-caps text-primary hover:text-primary-fixed-dim transition-colors"
              >
                Use example brief
              </button>
            </div>

            {error && <p className="font-body-md text-body-md text-error">{error}</p>}

            <button
              type="button"
              disabled={!canGenerate}
              onClick={() => void handleGenerate()}
              className="w-full py-4 rounded-lg bg-primary-container text-white font-label-caps text-label-caps glow-hover transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">edit_note</span>
              BUILD DRAFT
            </button>
          </section>
        )}

        {(step === 'review' || step === 'publishing') && (
          <section className="space-y-6">
            {!intent ? (
              <div className="glass-panel rounded-2xl p-8 text-center border border-primary/20">
                <span className="material-symbols-outlined text-primary text-[40px] animate-pulse">psychology</span>
                <p className="font-body-md text-body-md text-on-surface-variant mt-4">Building your event draft…</p>
              </div>
            ) : (
              <>
                <div className="glass-panel rounded-2xl p-5 border border-primary/20">
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Review the draft below. You can tweak fields before publishing.
                  </p>
                </div>

                <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-5 border border-white/10">
                  <div className="space-y-1">
                    <label className="font-label-caps text-label-caps text-tertiary uppercase">Title</label>
                    <input
                      value={intent.title}
                      onChange={(e) => updateIntentField('title', e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-label-caps text-label-caps text-tertiary uppercase">Sport</label>
                      <select
                        value={intent.sport}
                        onChange={(e) => updateIntentField('sport', e.target.value as EventIntent['sport'])}
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                      >
                        {EVENT_SPORTS.map((sport) => (
                          <option key={sport} value={sport}>
                            {sport.charAt(0) + sport.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-caps text-label-caps text-tertiary uppercase">City</label>
                      <select
                        value={intent.city}
                        onChange={(e) => updateIntentField('city', e.target.value)}
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                      >
                        {SUPPORTED_CITIES.map((city) => (
                          <option key={city.name} value={city.name}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 md:col-span-2">
                      <label className="font-label-caps text-label-caps text-tertiary uppercase">Start</label>
                      <input
                        type="datetime-local"
                        value={toDatetimeLocalValue(intent.startsAt)}
                        onChange={(e) => updateIntentField('startsAt', new Date(e.target.value).toISOString())}
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                      />
                      <p className="font-body-md text-sm text-on-surface-variant">{formatPreviewDate(intent.startsAt)}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-caps text-label-caps text-tertiary uppercase">Capacity</label>
                      <input
                        type="number"
                        min={2}
                        value={intent.capacity ?? ''}
                        onChange={(e) =>
                          updateIntentField('capacity', e.target.value ? Number(e.target.value) : null)
                        }
                        placeholder="Open"
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-label-caps text-label-caps text-tertiary uppercase">Entry fee (€)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={intent.price}
                      onChange={(e) => updateIntentField('price', Number(e.target.value))}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-label-caps text-label-caps text-tertiary uppercase">Description</label>
                    <textarea
                      rows={5}
                      value={intent.description}
                      onChange={(e) => updateIntentField('description', e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface resize-y"
                    />
                  </div>
                </div>

                <section className="glass-panel rounded-2xl p-6 border border-secondary/20">
                  <h3 className="font-headline-md text-headline-md text-secondary flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined">auto_mode</span>
                    After publish
                  </h3>
                  <ul className="space-y-3">
                    {intent.aiManagementPlan.map((item) => (
                      <li key={item} className="flex items-start gap-3 font-body-md text-body-md text-on-surface-variant">
                        <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5">check_circle</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>

                {error && <p className="font-body-md text-body-md text-error">{error}</p>}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('brief');
                      setIntent(null);
                    }}
                    className="flex-1 py-3 rounded-lg border border-outline-variant/40 text-on-surface font-label-caps text-label-caps"
                  >
                    EDIT BRIEF
                  </button>
                  <button
                    type="button"
                    disabled={step === 'publishing'}
                    onClick={() => void handlePublish()}
                    className="flex-1 py-3 rounded-lg bg-primary-container text-white font-label-caps text-label-caps glow-hover disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {step === 'publishing' ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        PUBLISHING…
                      </>
                    ) : (
                      <>
                        PUBLISH EVENT
                        <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </main>

    </>
  );
}
