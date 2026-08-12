import { Suspense } from 'react';
import Link from 'next/link';
import type { HomeFilterVenue } from '@/lib/data/homepage';
import { PlayerPreferencesAside } from '@/components/home/HomeFeedFilterButton';

interface LobbyPageHeaderProps {
  city: string;
  venues: HomeFilterVenue[];
}

export function LobbyPageHeader({ city, venues }: LobbyPageHeaderProps) {
  return (
    <header className="space-y-2.5">
      <div className="min-w-0">
        <h1 className="font-display-lg-mobile md:font-display-lg text-[28px] leading-8 md:text-display-lg md:leading-[56px] text-on-surface tracking-tight">
          Lobby
        </h1>
        <p className="mt-0.5 font-body-md text-sm text-on-surface-variant">
          Your crews and nearby open games
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/lobby/create"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-3.5 py-2 font-label-caps text-[10px] text-white hover:bg-primary-container/90 transition-colors active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Create Lobby / Match
        </Link>
        <Link
          href="/lobby/groups/create"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 font-label-caps text-[10px] text-on-surface-variant hover:text-on-surface hover:border-white/20 transition-colors active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-secondary text-[16px]">groups</span>
          Group
        </Link>
        <Suspense fallback={null}>
          <PlayerPreferencesAside venues={venues} city={city} />
        </Suspense>
      </div>
    </header>
  );
}
