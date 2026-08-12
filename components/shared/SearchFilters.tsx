'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useState, useTransition } from 'react';
import { sportDisplayLabel } from '@/lib/constants/sports';
import { trackSignal } from '@/lib/telemetry/track';

interface SearchFiltersProps {
  sports: readonly string[];
  sportParam?: string;
  searchParam?: string;
  extraParams?: Record<string, string>;
  showTypeFilter?: boolean;
  typeParam?: string;
  typeOptions?: Array<{ value: string; label: string }>;
}

function SearchFiltersInner({
  sports,
  sportParam = 'sport',
  searchParam = 'q',
  extraParams = {},
  showTypeFilter = false,
  typeParam = 'type',
  typeOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'official', label: 'Official' },
    { value: 'community', label: 'Community' },
  ],
}: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get(searchParam) ?? '');

  const currentSport = searchParams.get(sportParam) ?? 'ALL';
  const currentType = searchParams.get(typeParam) ?? 'ALL';

  const navigate = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === 'ALL' || value === '') params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  function applySearch() {
    trackSignal('search.query', { query: searchValue, sport: currentSport });
    navigate({ [searchParam]: searchValue || null });
  }

  return (
    <div className={`space-y-4 ${isPending ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex gap-2">
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder="Search…"
          className="flex-1 bg-surface-container border border-outline-variant/40 rounded-lg px-4 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
        />
        <button
          type="button"
          onClick={applySearch}
          className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant/40 text-primary font-label-caps text-label-caps"
        >
          Search
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {sports.map((sport) => (
          <button
            key={sport}
            type="button"
            onClick={() => {
              trackSignal('filter.apply', { sport });
              navigate({ [sportParam]: sport === 'ALL' ? null : sport });
            }}
            className={`px-4 py-2 rounded-full font-label-caps text-label-caps whitespace-nowrap transition-all ${
              currentSport === sport || (sport === 'ALL' && currentSport === 'ALL')
                ? 'bg-primary-container text-white'
                : 'bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:border-primary/40'
            }`}
          >
            {sport === 'ALL' ? 'All Sports' : sportDisplayLabel(sport)}
          </button>
        ))}
      </div>

      {showTypeFilter && (
        <div className="flex gap-2">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                trackSignal('filter.apply', { type: opt.value });
                navigate({ [typeParam]: opt.value === 'ALL' ? null : opt.value });
              }}
              className={`px-4 py-2 rounded-lg font-label-caps text-label-caps transition-all ${
                currentType === opt.value || (opt.value === 'ALL' && !searchParams.get(typeParam))
                  ? 'bg-secondary-container/30 text-secondary border border-secondary/40'
                  : 'bg-surface-container text-on-surface-variant border border-outline-variant/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {Object.entries(extraParams).map(([key, val]) => (
        <input key={key} type="hidden" name={key} value={val} readOnly />
      ))}
    </div>
  );
}

export function SearchFilters(props: SearchFiltersProps) {
  return (
    <Suspense fallback={<div className="h-24 animate-pulse bg-surface-container rounded-xl" />}>
      <SearchFiltersInner {...props} />
    </Suspense>
  );
}
