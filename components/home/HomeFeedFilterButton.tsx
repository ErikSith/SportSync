'use client';

import { Suspense, useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BRATISLAVA_DISTRICTS, feedAreaLabel, type FeedAreaId } from '@/lib/cities';
import type { HomeFilterVenue } from '@/lib/data/homepage';
import {
  activeHomeFeedFilterCount,
  EMPTY_HOME_FEED_FILTERS,
  homeFeedFiltersFromStorage,
  parseHomeFeedFilters,
  saveHomeFeedFiltersToStorage,
  serializeHomeFeedFilters,
  type HomeFeedFilters,
} from '@/lib/home-feed-filters';
import { trackSignal } from '@/lib/telemetry/track';

interface HomeFeedPreferencesBarProps {
  venues: HomeFilterVenue[];
  city: string;
}

function filtersFromParams(searchParams: URLSearchParams): HomeFeedFilters {
  return parseHomeFeedFilters({
    sport: searchParams.get('sport') ?? undefined,
    venues: searchParams.get('venues') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    area: searchParams.get('area') ?? undefined,
  });
}

export function HomeFeedFilterHydrator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const stored = homeFeedFiltersFromStorage();
    if (!stored || activeHomeFeedFilterCount(stored) === 0) return;

    // Merge missing filter keys from storage (e.g. area) even when the URL
    // already has other params like mode=spectator or sport=TENNIS.
    const merged = new URLSearchParams(searchParams.toString());
    let changed = false;
    const storedParams = serializeHomeFeedFilters(stored);
    storedParams.forEach((value, key) => {
      if (!merged.has(key)) {
        merged.set(key, value);
        changed = true;
      }
    });
    // Drop legacy discovery URL flag — mix is always silent/on.
    if (merged.has('discovery')) {
      merged.delete('discovery');
      changed = true;
    }
    if (!changed) return;
    const qs = merged.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  return null;
}

/** Global hydrator — syncs stored preferences to the current page URL. */
export const PlayerFeedFilterHydrator = HomeFeedFilterHydrator;

function FilterSheet({
  open,
  onClose,
  draft,
  setDraft,
  onApply,
  onClear,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  draft: HomeFeedFilters;
  setDraft: React.Dispatch<React.SetStateAction<HomeFeedFilters>>;
  onApply: (filters: HomeFeedFilters) => void;
  onClear: () => void;
  isPending: boolean;
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const chip =
    'flex w-full items-center justify-center rounded-xl border px-2 py-2.5 text-center font-body-sm text-[11px] leading-tight transition-colors duration-200 active:scale-[0.98]';
  const chipIdle =
    'border-white/10 bg-transparent text-on-surface-variant hover:border-white/18 hover:bg-white/[0.03] hover:text-zinc-200';
  const chipOn = 'border-primary-container/40 bg-primary-container/10 text-white';

  const scopeTabs = [
    { id: 'near_me' as FeedAreaId, label: 'Near me' },
    { id: 'bratislava' as FeedAreaId, label: 'All Bratislava' },
  ] as const;
  const scopeActive = draft.area === 'near_me' || draft.area === 'bratislava';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="glass-panel relative z-[101] flex max-h-[min(88dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-feed-filter-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 px-5 pb-1 pt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 text-on-surface-variant transition-colors hover:text-primary"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
          <h3 id="home-feed-filter-title" className="font-headline-md text-[20px] text-on-surface">
            Your Feed
          </h3>
          <p className="mt-1 font-body-md text-xs text-on-surface-variant">
            Choose where you want to see events and activity.
          </p>
        </div>

        <div
          className="relative mx-5 shrink-0 border-b border-white/5"
          role="tablist"
          aria-label="Area scope"
        >
          <div className="flex w-full">
            {scopeTabs.map((opt) => {
              const selected = draft.area === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setDraft((prev) => ({ ...prev, area: opt.id }))}
                  className={`relative flex flex-1 items-center justify-center px-2 py-3 font-label-caps text-[10px] uppercase tracking-[0.12em] transition-colors duration-200 sm:text-[11px] ${
                    selected ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {opt.label}
                  {selected ? (
                    <span
                      className="absolute inset-x-3 bottom-0 h-px bg-primary-container/90 sm:inset-x-6"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-2xl border border-white/10 bg-transparent p-3 sm:p-3.5">
            <p className="mb-2.5 text-center font-label-caps text-[9px] uppercase tracking-[0.14em] text-tertiary">
              Mestské časti
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {BRATISLAVA_DISTRICTS.map((district) => {
                const selected = draft.area === district.id;
                return (
                  <button
                    key={district.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDraft((prev) => ({ ...prev, area: district.id }))}
                    className={`${chip} ${selected ? chipOn : chipIdle}`}
                    title={district.name}
                  >
                    <span className="line-clamp-2">{district.name}</span>
                  </button>
                );
              })}
            </div>
            {!scopeActive ? (
              <p className="mt-3 text-center font-body-sm text-[10px] text-primary-container/90">
                {feedAreaLabel(draft.area)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-white/5 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={onClear}
            className="flex-1 rounded-xl border border-outline/30 py-3 font-label-caps text-[11px] text-on-surface-variant transition-colors hover:text-on-surface"
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            disabled={isPending}
            className="flex-1 rounded-xl border border-primary-container/35 bg-zinc-900/90 py-3 font-label-caps text-[11px] text-white transition-all hover:border-primary-container/50 hover:bg-zinc-900 active:scale-95 disabled:opacity-60"
          >
            APPLY
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomeFeedPreferencesChip({ venues, city }: HomeFeedPreferencesBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<HomeFeedFilters>(EMPTY_HOME_FEED_FILTERS);

  const applied = filtersFromParams(searchParams);
  const activeCount = activeHomeFeedFilterCount(applied);
  const hasFilters = activeCount > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  function openSheet() {
    const fromUrl = filtersFromParams(searchParams);
    const stored = homeFeedFiltersFromStorage();
    setDraft({
      ...EMPTY_HOME_FEED_FILTERS,
      area: fromUrl.area !== 'bratislava' ? fromUrl.area : (stored?.area ?? fromUrl.area),
    });
    setOpen(true);
  }

  function applyFilters(next: HomeFeedFilters) {
    const current = filtersFromParams(searchParams);
    const mergedFilters: HomeFeedFilters = { ...current, area: next.area };
    saveHomeFeedFiltersToStorage(mergedFilters);
    trackSignal('filter.apply', {
      page: pathname,
      sports: mergedFilters.sports.join(','),
      venues: mergedFilters.venueIds.length,
      type: mergedFilters.type,
      area: mergedFilters.area,
    });
    const params = serializeHomeFeedFilters(mergedFilters);
    const merged = new URLSearchParams(searchParams.toString());
    for (const key of ['sport', 'venues', 'type', 'area', 'discovery']) merged.delete(key);
    params.forEach((value, key) => merged.set(key, value));
    const query = merged.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
    setOpen(false);
  }

  function clearFilters() {
    const current = filtersFromParams(searchParams);
    const mergedFilters: HomeFeedFilters = { ...current, area: 'bratislava' };
    saveHomeFeedFiltersToStorage(mergedFilters);
    const merged = new URLSearchParams(searchParams.toString());
    merged.delete('area');
    const query = merged.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
    setOpen(false);
  }

  const areaLabel = feedAreaLabel(applied.area);

  return (
    <>
      {/* Compact location + filter pill — top-right next to title only */}
      <button
        type="button"
        onClick={openSheet}
        disabled={isPending}
        aria-label="Change area and personalize feed"
        className="inline-flex max-w-[min(100%,11.5rem)] items-center gap-1 rounded-full border border-white/10 bg-zinc-900/80 py-1 pl-1.5 pr-2 text-zinc-400 transition-colors hover:border-white/15 hover:bg-zinc-900 hover:text-zinc-200 active:scale-[0.98] disabled:opacity-60"
      >
        <span
          className="material-symbols-outlined shrink-0 text-[13px] text-zinc-500"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden
        >
          location_on
        </span>
        <span className="min-w-0 truncate font-label-caps text-[9px] uppercase tracking-[0.1em]">
          {areaLabel || city}
        </span>
        <span className="h-2.5 w-px shrink-0 bg-white/10" aria-hidden />
        <span className="material-symbols-outlined shrink-0 text-[13px] text-zinc-500" aria-hidden>
          tune
        </span>
        {hasFilters ? (
          <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-primary-container/40 bg-zinc-950 px-1 font-label-caps text-[8px] leading-none text-primary-container">
            {activeCount}
          </span>
        ) : null}
      </button>

      {mounted ? (
        createPortal(
          <FilterSheet
            open={open}
            onClose={() => setOpen(false)}
            draft={draft}
            setDraft={setDraft}
            onApply={applyFilters}
            onClear={clearFilters}
            isPending={isPending}
          />,
          document.body,
        )
      ) : null}
    </>
  );
}

/** Compact location + filter pill — sits top-right next to page title text. */
export function HomeFeedPreferencesAside({ venues, city }: HomeFeedPreferencesBarProps) {
  return (
    <div className="flex shrink-0 justify-end">
      <Suspense
        fallback={
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/80 py-1 pl-2 pr-2.5">
            <span className="material-symbols-outlined text-[14px] text-zinc-600">location_on</span>
            <span className="font-label-caps text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              {city}
            </span>
          </div>
        }
      >
        <HomeFeedPreferencesChip venues={venues} city={city} />
      </Suspense>
    </div>
  );
}

/** Alias — same native bar (kept for older call sites). */
export function HomeFeedPreferencesStrip({ venues, city }: HomeFeedPreferencesBarProps) {
  return <HomeFeedPreferencesAside venues={venues} city={city} />;
}

/** @deprecated Use HomeFeedPreferencesStrip */
export const HomeFeedPreferencesBar = HomeFeedPreferencesStrip;

/** @deprecated Use HomeFeedPreferencesChip */
export const HomeFeedFilterButton = HomeFeedPreferencesChip;

export const PlayerPreferencesAside = HomeFeedPreferencesAside;
export const PlayerPreferencesChip = HomeFeedPreferencesChip;
