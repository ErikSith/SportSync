'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LOBBY_FORMATS, LOBBY_FORMAT_LABELS, type LobbyFormat } from '@/lib/constants/lobbies';
import { LOBBY_SPORTS } from '@/lib/constants/sports';
import { SUPPORTED_CITIES } from '@/lib/cities';

type FormState = 'idle' | 'submitting' | 'success';

export default function CreateLobbyPage() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [createdLobbyId, setCreatedLobbyId] = useState<string | null>(null);

  const [sport, setSport] = useState<(typeof LOBBY_SPORTS)[number]>(LOBBY_SPORTS[0]);
  const [format, setFormat] = useState<LobbyFormat>(LOBBY_FORMATS[0]);
  const [city, setCity] = useState(SUPPORTED_CITIES[0]?.name ?? 'Bratislava');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [spotsTotal, setSpotsTotal] = useState(4);
  const [mercenaryMode, setMercenaryMode] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!scheduledDate || !scheduledTime) {
      setError('Please pick a date and time.');
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      setError('Invalid date or time.');
      return;
    }

    setFormState('submitting');

    const res = await fetch('/api/lobbies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport,
        format,
        city,
        scheduledAt: scheduledAt.toISOString(),
        spotsTotal,
        mercenaryMode,
      }),
    });

    const body = (await res.json().catch(() => null)) as { error?: string; lobbyId?: string } | null;

    if (!res.ok) {
      setFormState('idle');
      setError(body?.error ?? 'Could not create lobby');
      return;
    }

    if (body?.lobbyId) {
      setCreatedLobbyId(body.lobbyId);
      setFormState('success');
      router.refresh();
      router.push(`/lobby/${body.lobbyId}`);
    }
  }

  if (formState === 'success' && createdLobbyId) {
    return (
      <>
        <main className="min-h-screen flex items-center justify-center px-container-margin-mobile pb-8 relative overflow-hidden">
          <div className="ambient-glow bg-primary-container/10 w-[400px] h-[400px] top-1/4 left-1/2 -translate-x-1/2" />
          <section className="glass-panel rounded-2xl p-8 w-full max-w-md text-center space-y-6 relative z-10 border border-secondary/10">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary-container/20 flex items-center justify-center border border-primary-container/40">
              <span className="material-symbols-outlined text-primary-container text-[32px]">check_circle</span>
            </div>
            <div className="space-y-2">
              <h1 className="font-headline-md text-headline-md text-on-surface">Lobby created!</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Your match is live. Head to the lobby to manage your roster.
              </p>
            </div>
            <Link
              href={`/lobby/${createdLobbyId}`}
              className="inline-flex w-full py-3 rounded-lg bg-primary-container text-white font-label-caps text-label-caps hover:brightness-110 transition-all items-center justify-center gap-2"
            >
              VIEW LOBBY
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
        <Link href="/lobby" className="text-on-surface-variant hover:text-primary transition-colors flex items-center group">
          <span className="material-symbols-outlined mr-2 group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-label-caps text-label-caps uppercase hidden md:inline">Back</span>
        </Link>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Create Lobby</h1>
        <div className="w-10" />
      </header>

      <main className="pt-24 pb-32 px-container-margin-mobile md:px-container-margin-desktop max-w-2xl mx-auto min-h-screen">
        <section className="mb-8">
          <h2 className="font-display-lg-mobile text-display-lg-mobile text-on-surface mb-2">New Match</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Configure your session and find elite partners nearby.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 border border-secondary/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="sport">
                Sport
              </label>
              <select
                id="sport"
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

            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="format">
                Format
              </label>
              <select
                id="format"
                value={format}
                onChange={(e) => setFormat(e.target.value as LobbyFormat)}
                className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
              >
                {LOBBY_FORMATS.map((option) => (
                  <option key={option} value={option}>
                    {LOBBY_FORMAT_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="city">
              City
            </label>
            <select
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
            >
              {SUPPORTED_CITIES.map((option) => (
                <option key={option.name} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="date">
                Date
              </label>
              <input
                id="date"
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-surface-container border-b border-outline-variant/40 px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none rounded-t-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="time">
                Time
              </label>
              <input
                id="time"
                type="time"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-surface-container border-b border-outline-variant/40 px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none rounded-t-lg"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="spots">
              Total spots
            </label>
            <input
              id="spots"
              type="number"
              min={2}
              max={10}
              required
              value={spotsTotal}
              onChange={(e) => setSpotsTotal(Number(e.target.value))}
              className="w-full bg-surface-container border-b border-outline-variant/40 px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none rounded-t-lg"
            />
          </div>

          <div className="space-y-4 pt-2">
            <label className="flex items-center justify-between p-4 rounded-lg bg-surface-container border border-primary-container/20 cursor-pointer">
              <div>
                <p className="font-body-md text-body-md text-on-surface font-medium flex items-center gap-2">
                  Mercenary mode
                  <span className="material-symbols-outlined text-primary-container text-[18px]">bolt</span>
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant text-sm">Broadcast to nearby players for emergency +1</p>
              </div>
              <input
                type="checkbox"
                checked={mercenaryMode}
                onChange={(e) => setMercenaryMode(e.target.checked)}
                className="w-5 h-5 rounded border-outline-variant bg-surface-container-high text-primary-container focus:ring-primary-container"
              />
            </label>
          </div>

          {error && <p className="font-body-md text-body-md text-error">{error}</p>}

          <button
            type="submit"
            disabled={formState === 'submitting'}
            className="w-full py-4 rounded-lg bg-primary-container text-white font-label-caps text-label-caps glow-hover transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {formState === 'submitting' ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                CREATING…
              </>
            ) : (
              <>
                CREATE LOBBY
                <span className="material-symbols-outlined text-[18px]">add</span>
              </>
            )}
          </button>
        </form>
      </main>

    </>
  );
}
