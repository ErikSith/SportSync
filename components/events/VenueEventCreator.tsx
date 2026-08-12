'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EventIntent } from '@/lib/ai/event-intent';
import type { OrganizerVenueOption } from '@/lib/data/organizer-venues';
import { EVENT_SPORTS } from '@/lib/constants/sports';
import { SUPPORTED_CITIES } from '@/lib/cities';

type Step = 'brief' | 'review' | 'publishing';

interface SponsorDraft {
  name: string;
  logoUrl: string;
  websiteUrl: string;
  tier: 'gold' | 'silver' | 'bronze' | 'partner';
}

interface EnrichmentPreview {
  promoCopy: string;
  socialPost: string;
  tags: string[];
}

interface VenueEventCreatorProps {
  defaultCity?: string | null;
  organizerName?: string | null;
  role: string;
  venues: OrganizerVenueOption[];
  initialVenueId?: string | null;
}

const EXAMPLE_BRIEF =
  'Open padel clinic next Friday at 17:00, €15 entry, max 16 players, beginner-friendly. Promote to nearby padel players.';

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

export function VenueEventCreator({
  defaultCity,
  organizerName,
  role,
  venues,
  initialVenueId,
}: VenueEventCreatorProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('brief');
  const [brief, setBrief] = useState('');
  const [intent, setIntent] = useState<EventIntent | null>(null);
  const [venueId, setVenueId] = useState(initialVenueId ?? '');
  const [error, setError] = useState<string | null>(null);

  // AI-Driven Event Factory extras (VISION.md pillar 3)
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState('');
  const [sponsors, setSponsors] = useState<SponsorDraft[]>([]);
  const [enrichment, setEnrichment] = useState<EnrichmentPreview | null>(null);

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
      setError('Select the venue hosting this event.');
      return;
    }

    setStep('review');

    const res = await fetch('/api/events/parse-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief,
        organizerName,
        defaultCity: defaultCity ?? undefined,
        mode: 'official',
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      error?: string;
      intent?: EventIntent;
    } | null;

    if (!res.ok || !body?.intent) {
      setStep('brief');
      setError(body?.error ?? 'Could not parse the brief. Include sport, date, price and player count.');
      return;
    }

    setIntent(body.intent);
  }

  async function handlePublish() {
    if (!intent) return;
    setError(null);

    if (venueRequired && !venueId) {
      setError('Select the venue hosting this event.');
      return;
    }

    setStep('publishing');

    // Venue owners publish through the AI-Driven Event Factory endpoint which
    // persists photos + sponsors and runs the enrichment pass.
    const target = venueId
      ? `/api/manage/venues/${venueId}/events`
      : '/api/ai/events/ingest';

    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: intent.title,
        sport: intent.sport,
        sportType: (intent as unknown as { sportType?: string }).sportType,
        description: intent.description,
        startsAt: intent.startsAt,
        price: intent.price,
        capacity: intent.capacity,
        priceCents: (intent as unknown as { priceCents?: number }).priceCents,
        currency: (intent as unknown as { currency?: string }).currency,
        eventDate: (intent as unknown as { eventDate?: string }).eventDate,
        startTime: (intent as unknown as { startTime?: string }).startTime,
        endTime: (intent as unknown as { endTime?: string | null }).endTime,
        maxParticipants: (intent as unknown as { maxParticipants?: number | null }).maxParticipants,
        entryRequirements: (intent as unknown as { entryRequirements?: string | null }).entryRequirements,
        themeConfig: (intent as unknown as { themeConfig?: unknown }).themeConfig,
        sponsorsJson: (intent as unknown as { sponsors?: unknown[] }).sponsors,
        rawBrief: brief,
        photos,
        sponsors,
        brief,
        organizerName,
        defaultCity: defaultCity ?? undefined,
        mode: 'official',
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      error?: string;
      eventId?: string;
      promoCopy?: string;
      socialPost?: string;
      tags?: string[];
    } | null;

    if (!res.ok || !body?.eventId) {
      setStep('review');
      setError(body?.error ?? 'Could not publish event');
      return;
    }

    setEnrichment({
      promoCopy: body.promoCopy ?? '',
      socialPost: body.socialPost ?? '',
      tags: body.tags ?? [],
    });

    router.push(`/events/${body.eventId}`);
  }

  function updateIntentField<K extends keyof EventIntent>(key: K, value: EventIntent[K]) {
    setIntent((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <>
      <header className="fixed top-0 w-full bg-background/90 backdrop-blur-xl border-b border-white/5 z-50 shadow-2xl shadow-black/40 px-container-margin-mobile md:px-container-margin-desktop h-16 flex items-center justify-between">
        <Link href="/manage" className="text-on-surface-variant hover:text-primary transition-colors flex items-center group">
          <span className="material-symbols-outlined mr-2 group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-label-caps text-label-caps uppercase hidden md:inline">Back</span>
        </Link>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Create Official Event</h1>
        <div className="w-10" />
      </header>

      <main className="pt-24 pb-32 px-container-margin-mobile md:px-container-margin-desktop max-w-3xl mx-auto min-h-screen">
        <section className="mb-8 space-y-3">
          <h2 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Describe your event</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Sport, date, pricing and capacity — we&apos;ll draft the official event page and enable AI management.
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
                No venues linked to your account. Contact support to register a venue before creating events.
              </p>
            )}

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
                <p className="font-body-md text-body-md text-on-surface-variant mt-4">Building your event draft…</p>
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
                    <label className="font-label-caps text-label-caps text-tertiary uppercase">Title</label>
                    <input
                      value={intent.title}
                      onChange={(e) => updateIntentField('title', e.target.value)}
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
                      <p className="text-sm text-on-surface-variant">{formatPreviewDate(intent.startsAt)}</p>
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

                  {/* AI-Driven Event Factory: photo gallery */}
                  <div className="space-y-2">
                    <label className="font-label-caps text-label-caps text-tertiary uppercase">Event photos</label>
                    <div className="flex gap-2">
                      <input
                        value={photoInput}
                        onChange={(e) => setPhotoInput(e.target.value)}
                        placeholder="https://…/poster.jpg"
                        className="flex-1 bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = photoInput.trim();
                          if (url && !photos.includes(url)) setPhotos((p) => [...p, url]);
                          setPhotoInput('');
                        }}
                        className="px-3 py-2 rounded-lg bg-secondary/20 text-secondary font-label-caps text-label-caps"
                      >
                        ADD
                      </button>
                    </div>
                    {photos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {photos.map((url) => (
                          <span
                            key={url}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-container border border-outline-variant/40 text-xs text-on-surface-variant"
                          >
                            <span className="material-symbols-outlined text-[14px]">image</span>
                            <span className="max-w-[140px] truncate">{url}</span>
                            <button
                              type="button"
                              onClick={() => setPhotos((p) => p.filter((x) => x !== url))}
                              className="text-error"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI-Driven Event Factory: sponsors */}
                  <div className="space-y-2">
                    <label className="font-label-caps text-label-caps text-tertiary uppercase">Sponsors</label>
                    {sponsors.map((s, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <input
                          value={s.name}
                          onChange={(e) =>
                            setSponsors((list) =>
                              list.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)),
                            )
                          }
                          placeholder="Brand name"
                          className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                        />
                        <input
                          value={s.logoUrl}
                          onChange={(e) =>
                            setSponsors((list) =>
                              list.map((item, i) => (i === idx ? { ...item, logoUrl: e.target.value } : item)),
                            )
                          }
                          placeholder="Logo URL"
                          className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                        />
                        <select
                          value={s.tier}
                          onChange={(e) =>
                            setSponsors((list) =>
                              list.map((item, i) =>
                                i === idx ? { ...item, tier: e.target.value as SponsorDraft['tier'] } : item,
                              ),
                            )
                          }
                          className="bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface"
                        >
                          <option value="gold">Gold</option>
                          <option value="silver">Silver</option>
                          <option value="bronze">Bronze</option>
                          <option value="partner">Partner</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setSponsors((list) => list.filter((_, i) => i !== idx))}
                          className="text-error justify-self-start"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setSponsors((list) => [
                          ...list,
                          { name: '', logoUrl: '', websiteUrl: '', tier: 'partner' },
                        ])
                      }
                      className="font-label-caps text-label-caps text-secondary hover:opacity-80 transition-colors"
                    >
                      + Add sponsor
                    </button>
                  </div>
                </div>

                <section className="glass-panel rounded-2xl p-6 border border-secondary/20">
                  <h3 className="font-headline-md text-headline-md text-secondary flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined">auto_mode</span>
                    AI will automate
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
                    className="flex-1 py-3 rounded-lg bg-secondary text-on-secondary font-label-caps text-label-caps disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {step === 'publishing' ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        PUBLISHING…
                      </>
                    ) : (
                      <>
                        PUBLISH EVENT
                        <span className="material-symbols-outlined text-[18px]">verified</span>
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
