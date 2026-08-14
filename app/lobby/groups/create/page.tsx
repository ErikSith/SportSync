'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LOBBY_SPORTS } from '@/lib/constants/sports';

export const runtime = 'edge';

type FormState = 'idle' | 'submitting';

export default function CreateGroupPage() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [sport, setSport] = useState<(typeof LOBBY_SPORTS)[number]>(LOBBY_SPORTS[0]);
  const [description, setDescription] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter a crew name.');
      return;
    }

    setFormState('submitting');

    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        sport,
        description: description.trim() || undefined,
      }),
    });

    const body = (await res.json().catch(() => null)) as { error?: string; groupId?: string } | null;

    if (!res.ok) {
      setFormState('idle');
      setError(body?.error ?? 'Could not create crew');
      return;
    }

    if (body?.groupId) {
      router.push(`/lobby/groups/${body.groupId}`);
    }
  }

  return (
    <>
      <header className="fixed top-0 w-full bg-background/90 backdrop-blur-xl border-b border-white/5 z-50 shadow-2xl shadow-black/40 px-container-margin-mobile md:px-container-margin-desktop h-16 flex items-center justify-between">
        <Link href="/lobby" className="text-on-surface-variant hover:text-primary transition-colors flex items-center group">
          <span className="material-symbols-outlined mr-2 group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-label-caps text-label-caps uppercase hidden md:inline">Back</span>
        </Link>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Create Crew</h1>
        <div className="w-10" />
      </header>

      <main className="pt-24 pb-32 px-container-margin-mobile md:px-container-margin-desktop max-w-2xl mx-auto min-h-screen">
        <section className="mb-8">
          <h2 className="font-display-lg-mobile text-display-lg-mobile text-on-surface mb-2">My Crew</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Create a private closed crew — only people with your invite link can join.
          </p>
        </section>

        <form onSubmit={(e) => void handleSubmit(e)} className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 border border-secondary/10">
          <div className="space-y-1">
            <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="name">
              Crew name
            </label>
            <input
              id="name"
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekend Warriors"
              className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="sport">
              Primary sport
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
            <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="description">
              Description (optional)
            </label>
            <textarea
              id="description"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Our regular padel crew — casual vibes, competitive sets."
              className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none resize-none"
            />
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
                CREATE CREW
                <span className="material-symbols-outlined text-[18px]">groups</span>
              </>
            )}
          </button>
        </form>
      </main>

    </>
  );
}
