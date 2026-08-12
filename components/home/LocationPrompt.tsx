'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SUPPORTED_CITIES } from '@/lib/cities';

/**
 * Shown when the profile has no home coordinate yet. Covers both paths from
 * the SportSync location rule: GPS permission granted, or GPS denied /
 * unsupported -> manual city picker.
 */
export function LocationPrompt({ variant = 'default' }: { variant?: 'default' | 'inline' }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState(SUPPORTED_CITIES[0]?.name ?? 'Bratislava');

  async function persist(payload: { source: 'gps'; latitude: number; longitude: number } | { source: 'city'; city: string }) {
    setError(null);
    const res = await fetch('/api/profile/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError('Could not save your location. Please try again.');
      return;
    }
    startTransition(() => router.refresh());
  }

  function useGps() {
    if (!('geolocation' in navigator)) {
      setError('Your browser does not support GPS. Pick your city below instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void persist({
          source: 'gps',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setError('Location access was denied. Pick your city below instead.');
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  if (variant === 'inline') {
    return (
      <section className="glass-panel rounded-xl px-4 py-3 border border-secondary/10 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="material-symbols-outlined text-primary shrink-0">location_on</span>
          <p className="font-body-md text-sm text-on-surface-variant">
            Set your location to discover open lobbies within 20km.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={useGps}
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-primary-container text-white font-label-caps text-[10px] hover:brightness-110 transition-all disabled:opacity-50"
          >
            Enable GPS
          </button>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-surface-container border border-outline-variant/40 rounded-lg px-2 py-2 text-on-surface font-body-md text-sm focus:border-primary-container focus:outline-none max-w-[140px]"
          >
            {SUPPORTED_CITIES.map((option) => (
              <option key={option.name} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void persist({ source: 'city', city })}
            disabled={isPending}
            className="px-3 py-2 rounded-lg border border-secondary/30 text-secondary font-label-caps text-[10px] hover:border-secondary/60 transition-all disabled:opacity-50"
          >
            Set
          </button>
        </div>
        {error && <p className="font-body-md text-sm text-error sm:w-full">{error}</p>}
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-2xl p-6 border border-secondary/10 space-y-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary">location_on</span>
        <h3 className="font-headline-md text-headline-md text-on-surface">Set your location</h3>
      </div>
      <p className="font-body-md text-body-md text-tertiary-container">
        We use your location to find matches and events within 20km. No GPS? Pick your city instead.
      </p>

      <button
        onClick={useGps}
        disabled={isPending}
        className="w-full py-3 rounded-lg bg-primary-container text-white font-label-caps text-label-caps hover:brightness-110 transition-all disabled:opacity-50"
      >
        USE MY GPS LOCATION
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-outline-variant/30" />
        <span className="font-label-caps text-label-caps text-outline">OR</span>
        <div className="h-px flex-1 bg-outline-variant/30" />
      </div>

      <div className="flex gap-3">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="flex-1 bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
        >
          {SUPPORTED_CITIES.map((option) => (
            <option key={option.name} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => void persist({ source: 'city', city })}
          disabled={isPending}
          className="px-4 py-2 rounded-lg border border-secondary/30 text-secondary font-label-caps text-label-caps hover:border-secondary/60 transition-all disabled:opacity-50"
        >
          CONFIRM
        </button>
      </div>

      {error && <p className="font-body-md text-body-md text-error">{error}</p>}
    </section>
  );
}
