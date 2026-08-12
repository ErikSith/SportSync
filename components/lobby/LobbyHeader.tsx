'use client';

import { Search } from 'lucide-react';
import { PageTitleRow } from '@/components/shared/PageTitleRow';
import type { HomeFilterVenue } from '@/lib/data/homepage';
import { LobbyType, type LobbyFilterTab } from '@/types/lobby';

const TABS: { id: LobbyFilterTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: LobbyType.SINGLE_PLAYER_1, label: '+1 Partner' },
  { id: LobbyType.TEAM_VS_TEAM, label: 'Team vs Team' },
  { id: LobbyType.RECURRING_SQUAD, label: 'Recurring' },
];

interface LobbyHeaderProps {
  activeTab: LobbyFilterTab;
  onTabChange: (tab: LobbyFilterTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
  city: string;
  venues: HomeFilterVenue[];
}

export function LobbyHeader({
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  city,
  venues,
}: LobbyHeaderProps) {
  return (
    <div className="space-y-4">
      <PageTitleRow
        city={city}
        venues={venues}
        title={
          <div className="min-w-0 space-y-1">
            <p className="font-label-caps text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Matchmaking
            </p>
            <h1 className="font-headline-md text-[28px] leading-tight tracking-wide text-white sm:text-3xl md:text-4xl">
              Lobby
            </h1>
          </div>
        }
        subtitle={
          <p className="font-body-md text-sm text-on-surface-variant md:text-[15px]">
            Create a lobby or join someone nearby who needs a partner.
          </p>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={[
                'shrink-0 rounded-full px-3.5 py-2 font-label-caps text-[10px] uppercase tracking-[0.12em] transition-colors active:scale-95',
                active
                  ? 'border border-primary-container/40 bg-primary-container/15 text-white'
                  : 'border border-white/10 bg-zinc-900/40 text-zinc-400 hover:border-white/15 hover:text-zinc-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search sport, venue, or player…"
          className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low py-2.5 pl-10 pr-3 text-sm text-on-surface outline-none placeholder:text-zinc-500 focus:border-outline-variant/40"
        />
      </label>
    </div>
  );
}
