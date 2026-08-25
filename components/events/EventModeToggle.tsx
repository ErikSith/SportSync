'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import type { ParticipationMode } from '@/lib/data/events';
import { useT } from '@/components/i18n/LocaleProvider';

interface EventModeToggleProps {
  mode: ParticipationMode;
}

export function EventModeToggle({ mode }: EventModeToggleProps) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setMode = useCallback(
    (next: ParticipationMode) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'participate') {
        params.delete('mode');
      } else {
        params.set('mode', 'spectator');
      }
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const isSpectator = mode === 'spectator';

  return (
    <div
      className={`relative mx-auto w-full max-w-md rounded-2xl border border-outline-variant/20 bg-surface-container-low/80 p-1.5 backdrop-blur-sm ${
        pending ? 'opacity-80' : ''
      }`}
      role="tablist"
      aria-label={t('events.modeAria')}
    >
      <span
        className={`pointer-events-none absolute top-1.5 left-1.5 h-[calc(100%-12px)] w-[calc(50%-6px)] rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isSpectator
            ? 'translate-x-full bg-secondary shadow-[0_8px_24px_rgba(233,195,73,0.22)]'
            : 'translate-x-0 bg-primary-container shadow-[0_8px_24px_rgba(200,75,36,0.28)]'
        }`}
        aria-hidden
      />
      <div className="relative z-10 flex w-full">
        <button
          type="button"
          role="tab"
          aria-selected={!isSpectator}
          onClick={() => setMode('participate')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-label-caps text-[11px] uppercase tracking-[0.14em] transition-colors ${
            !isSpectator ? 'text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            sports
          </span>
          {t('common.join')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isSpectator}
          onClick={() => setMode('spectator')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-label-caps text-[11px] uppercase tracking-[0.14em] transition-colors ${
            isSpectator ? 'text-on-secondary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            visibility
          </span>
          {t('common.watch')}
        </button>
      </div>
    </div>
  );
}
