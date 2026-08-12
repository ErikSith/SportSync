'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TournamentIntent } from '@/lib/ai/tournament-intent';
import type { OrganizerVenueOption } from '@/lib/data/organizer-venues';
import { EVENT_SPORTS } from '@/lib/constants/sports';
import { SUPPORTED_CITIES } from '@/lib/cities';
import { FORMAT_LABELS, TOURNAMENT_FORMATS } from '@/lib/constants/tournaments';

type Step = 'brief' | 'review' | 'publishing';

interface TournamentCreatorProps {
  defaultCity?: string | null;
  organizerName?: string | null;
  role: string;
  venues: OrganizerVenueOption[];
  initialVenueId?: string | null;
}

const EXAMPLE_BRIEF =
  'Chcem turnaj v padeli, termín 2026-08-15 v Bratislave, úroveň intermediate, single elimination pre 16 hráčov, vstupné €25. Registrácia do 10. augusta.';

function formatPreviewDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
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

export function TournamentCreator({ defaultCity, organizerName, role, venues, initialVenueId }: TournamentCreatorProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('brief');
  const [brief, setBrief] = useState('');
  const [intent, setIntent] = useState<TournamentIntent | null>(null);
  const [venueId, setVenueId] = useState(initialVenueId ?? '');
  const [error, setError] = useState<string | null>(null);

  const isVenueOwner = role === 'VENUE_OWNER';
  const canGenerate = brief.trim().length >= 12;
  const venueRequired = isVenueOwner && venues.length > 0;
  const showVenuePicker = venues.length > 0;

  useEffect(() => {
    if (initialVenueId && venues.some((v) => v.id === initialVenueId)) {
      setVenueId(initialVenueId);
    } else if (venues.length === 1) {
      setVenueId(venues[0]!.id);
    }
  }, [venues, initialVenueId]);

  async function handleGenerate() {
    setError(null);

    if (venueRequired && !venueId) {
      setError('Select the venue hosting this tournament.');
      return;
    }

    setStep('review');

    const res = await fetch('/api/ai/tournaments/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, organizerName, defaultCity: defaultCity ?? undefined }),
    });

    const body = (await res.json().catch(() => null)) as {
      error?: string;
      intent?: TournamentIntent;
    } | null;

    if (!res.ok || !body?.intent) {
      setStep('brief');
      setError(body?.error ?? 'Could not parse the brief. Include sport, city, date and skill level.');
      return;
    }

    setIntent(body.intent);
  }

  async function handlePublish() {
    if (!intent) return;
    setError(null);

    if (venueRequired && !venueId) {
      setError('Select the venue hosting this tournament.');
      return;
    }

    setStep('publishing');

    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...intent, venueId: venueId || undefined }),
    });

    const body = (await res.json().catch(() => null)) as { error?: string; tournamentId?: string } | null;

    if (!res.ok || !body?.tournamentId) {
      setStep('review');
      setError(body?.error ?? 'Could not publish tournament');
      return;
    }

    router.push('/tournaments');
  }

  function updateIntentField<K extends keyof TournamentIntent>(key: K, value: TournamentIntent[K]) {
    setIntent((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <>
      <header className="fixed top-0 w-full bg-background/90 backdrop-blur-xl border-b border-white/5 z-50 shadow-2xl shadow-black/40 px-container-margin-mobile md:px-container-margin-desktop h-16 flex items-center justify-between">
        <Link href="/manage" className="text-on-surface-variant hover:text-primary transition-colors flex items-center group">
          <span className="material-symbols-outlined mr-2 group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-label-caps text-label-caps uppercase hidden md:inline">Back</span>
        </Link>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Create Tournament</h1>
        <div className="w-10" />
      </header>

      <main className="pt-24 pb-32 px-container-margin-mobile md:px-container-margin-desktop max-w-3xl mx-auto min-h-screen">
        <section className="mb-8 space-y-3">
          <h2 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Describe your tournament</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Sport, date, location, skill level and format — we&apos;ll draft the page, rules and open registration for you.
          </p>
        </section>

        {step === 'brief' && (
          <section className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 border border-secondary/20">
            {showVenuePicker && (
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="venue">
                  Venue {venueRequired ? '' : '(optional)'}
                </label>
                <select
                  id="venue"
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-secondary focus:outline-none"
                >
                  <option value="">Select venue…</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name} · {venue.city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isVenueOwner && venues.length === 0 && (
              <p className="font-body-md text-body-md text-error">
                No venues linked to your account. Contact support to register a venue before creating tournaments.
              </p>
            )}

            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="brief">
                Tournament brief
              </label>
              <textarea
                id="brief"
                rows={8}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={EXAMPLE_BRIEF}
                className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-4 py-3 text-on-surface font-body-md text-body-md focus:border-secondary focus:outline-none resize-y min-h-[180px]"
              />
              <button
                type="button"
                onClick={() => setBrief(EXAMPLE_BRIEF)}
                className="font-label-caps text-label-caps text-secondary hover:opacity-80 transition-colors"
              >
                Use example brief
              </button>
            </div>

            {error && <p className="font-body-md text-body-md text-error">{error}</p>}

            <button
              type="button"
              disabled={!canGenerate || (isVenueOwner && venues.length === 0)}
              onClick={() => void handleGenerate()}
              className="w-full py-4 rounded-lg bg-secondary text-on-secondary font-label-caps text-label-caps transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 border border-secondary-fixed/40"
            >
              <span className="material-symbols-outlined text-[20px]">edit_note</span>
              BUILD DRAFT
            </button>
          </section>
        )}

        {(step === 'review' || step === 'publishing') && (
          <section className="space-y-6">
            {!intent ? (
              <div className="glass-panel rounded-2xl p-8 text-center border border-secondary/20">
                <span className="material-symbols-outlined text-secondary text-[40px] animate-pulse">hourglass_top</span>
                <p className="font-body-md text-body-md text-on-surface-variant mt-4">Building your tournament draft…</p>
              </div>
            ) : (
              <>
                <div className="glass-panel rounded-2xl p-5 border border-secondary/20">
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Review the draft below. You can edit any field before publishing and opening registration.
                  </p>
                </div>

                <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-5 border border-white/10">
                  <div className="space-y-1">
                    <label className="font-label-caps text-label-caps text-tertiary uppercase">Tournament name</label>
                    <input
                      value={intent.name}
                      onChange={(e) => updateIntentField('name', e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                    />
                  </div>

                  {showVenuePicker && (
                    <div className="space-y-1">
                      <label className="font-label-caps text-label-caps text-tertiary uppercase">Venue</label>
                      <select
                        value={venueId}
                        onChange={(e) => setVenueId(e.target.value)}
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                      >
                        <option value="">Select venue…</option>
                        {venues.map((venue) => (
                          <option key={venue.id} value={venue.id}>
                            {venue.name} · {venue.city}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-label-caps text-label-caps text-tertiary uppercase">Sport</label>
                      <select
                        value={intent.sport}
                        onChange={(e) => updateIntentField('sport', e.target.value as TournamentIntent['sport'])}
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
                      <label className="font-label-caps text-label-caps text-tertiary uppercase">Format</label>
                      <select
                        value={intent.format}
                        onChange={(e) => updateIntentField('format', e.target.value as TournamentIntent['format'])}
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                      >
                        {TOURNAMENT_FORMATS.map((format) => (
                          <option key={format} value={format}>
                            {FORMAT_LABELS[format]}
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
                    <div className="space-y-1">
                      <label className="font-label-caps text-label-caps text-tertiary uppercase">Starts</label>
                      <input
                        type="datetime-local"
                        value={toDatetimeLocalValue(intent.startsAt)}
                        onChange={(e) => updateIntentField('startsAt', new Date(e.target.value).toISOString())}
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                      />
                      <p className="text-sm text-on-surface-variant">{formatPreviewDate(intent.startsAt)}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-caps text-label-caps text-tertiary uppercase">Registration deadline</label>
                      <input
                        type="datetime-local"
                        value={toDatetimeLocalValue(intent.registrationDeadline)}
                        onChange={(e) => updateIntentField('registrationDeadline', new Date(e.target.value).toISOString())}
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-caps text-label-caps text-tertiary uppercase">Max participants</label>
                      <input
                        type="number"
                        min={4}
                        value={intent.maxParticipants}
                        onChange={(e) => updateIntentField('maxParticipants', Number(e.target.value))}
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-label-caps text-label-caps text-tertiary uppercase">Skill level</label>
                      <input
                        value={intent.skillLevelLabel}
                        readOnly
                        className="w-full bg-surface-container/60 border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface-variant"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-caps text-label-caps text-tertiary uppercase">Entry fee (€)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={intent.entryFee}
                        onChange={(e) => updateIntentField('entryFee', Number(e.target.value))}
                        className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-label-caps text-label-caps text-tertiary uppercase">Rules preview</label>
                    <ul className="bg-surface-container/40 rounded-lg p-4 space-y-2 border border-white/5">
                      {intent.rules.map((rule) => (
                        <li key={rule} className="font-body-md text-body-md text-on-surface-variant flex gap-2">
                          <span className="material-symbols-outlined text-secondary text-[16px]">gavel</span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

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
                    className="flex-1 py-3 rounded-lg bg-secondary text-on-secondary font-label-caps text-label-caps disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {step === 'publishing' ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        PUBLISHING…
                      </>
                    ) : (
                      <>
                        PUBLISH TOURNAMENT
                        <span className="material-symbols-outlined text-[18px]">emoji_events</span>
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
