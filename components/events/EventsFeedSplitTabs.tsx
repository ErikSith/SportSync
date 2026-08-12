'use client';

import { useCallback, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { EventsFeedTab } from '@/lib/feed/events-feed-tab';

export type { EventsFeedTab } from '@/lib/feed/events-feed-tab';
export { parseEventsFeedTab } from '@/lib/feed/events-feed-tab';

const TABS: Array<{ key: EventsFeedTab; label: string }> = [
  { key: 'matches', label: 'Eventy & Zápasy' },
  { key: 'schedules', label: 'Rozpisy & Lekcie' },
];

interface EventsFeedSplitTabsProps {
  active: EventsFeedTab;
}

export function EventsFeedSplitTabs({ active }: EventsFeedSplitTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setTab = useCallback(
    (next: EventsFeedTab) => {
      if (next === active) return;
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'matches') params.delete('feed');
      else params.set('feed', 'schedules');
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [active, pathname, router, searchParams],
  );

  return (
    <div
      className={`relative w-full border-b border-white/5 ${pending ? 'opacity-85' : ''}`}
      role="tablist"
      aria-label="Typ feedu"
    >
      <div className="flex w-full">
        {TABS.map((tab) => {
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(tab.key)}
              className={`relative flex flex-1 items-center justify-center px-2 py-3 font-label-caps text-[11px] uppercase tracking-[0.12em] transition-colors duration-200 sm:text-[12px] ${
                selected
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
              {selected ? (
                <span
                  className="absolute inset-x-4 bottom-0 h-px bg-primary-container/90 sm:inset-x-8"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
