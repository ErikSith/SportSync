'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { authedFetch } from '@/lib/auth/authed-fetch';
import { useT } from '@/components/i18n/LocaleProvider';

interface VenueFollowButtonProps {
  venueId: string;
  initialFollowing: boolean;
  isGuest: boolean;
}

export function VenueFollowButton({
  venueId,
  initialFollowing,
  isGuest,
}: VenueFollowButtonProps) {
  const t = useT();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isGuest) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 font-label-caps text-label-caps uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
      >
        <span className="material-symbols-outlined text-[18px]">favorite</span>
        {t('venue.followLogin')}
      </Link>
    );
  }

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const next = !following;
      setFollowing(next);
      try {
        const res = next
          ? await authedFetch('/api/venues/follows', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ venueId }),
            })
          : await authedFetch(`/api/venues/follows?venueId=${encodeURIComponent(venueId)}`, {
              method: 'DELETE',
            });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setFollowing(!next);
          setError(data.error ?? t('venue.followError'));
          return;
        }
      } catch {
        setFollowing(!next);
        setError(t('venue.followError'));
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={following}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-label-caps text-label-caps uppercase tracking-wider transition-colors disabled:opacity-60 ${
          following
            ? 'border-primary/50 bg-primary/20 text-primary'
            : 'border-white/20 bg-white/5 text-on-surface hover:border-primary/40 hover:text-primary'
        }`}
      >
        <span
          className="material-symbols-outlined text-[18px]"
          style={following ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          favorite
        </span>
        {following ? t('venue.following') : t('venue.follow')}
      </button>
      {error ? (
        <p className="text-xs text-error">{error}</p>
      ) : null}
    </div>
  );
}
