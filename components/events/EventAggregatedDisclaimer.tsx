'use client';

import { useId, useState } from 'react';

interface EventAggregatedDisclaimerProps {
  sourceName?: string | null;
  compact?: boolean;
}

export function EventAggregatedDisclaimer({
  sourceName,
  compact = false,
}: EventAggregatedDisclaimerProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="relative">
      {open ? (
        <aside
          id={panelId}
          role="note"
          className={
            compact
              ? 'absolute bottom-full left-0 z-20 mb-2 w-[min(100%,22rem)] max-w-[calc(100vw-2rem)] rounded-xl border border-orange-400/25 bg-[#1a1612] px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]'
              : 'absolute bottom-full left-0 z-20 mb-2 w-[min(100%,24rem)] max-w-[calc(100vw-2rem)] rounded-xl border border-orange-400/30 bg-[#1a1612] px-4 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]'
          }
        >
          <div className="flex gap-2.5">
            <span
              className="material-symbols-outlined shrink-0 text-orange-300/90"
              style={{ fontSize: compact ? 18 : 20, fontVariationSettings: "'FILL' 0" }}
              aria-hidden
            >
              info
            </span>
            <div className="min-w-0 space-y-1">
              <p
                className={
                  compact
                    ? 'font-body-md text-[12px] leading-relaxed text-on-surface-variant'
                    : 'font-body-md text-sm leading-relaxed text-on-surface-variant sm:text-[13px]'
                }
              >
                Informácie o tomto evente boli automaticky spracované z verejne zverejnených
                zdrojov organizátora. Aplikácia neprevádzkuje tento event ani neprijíma
                registrácie. Pre overenie voľných kapacít a definitívnu registráciu prejdite na
                oficiálnu stránku organizátora.
              </p>
              {sourceName ? (
                <p className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-orange-300/70">
                  Zdroj: {sourceName}
                </p>
              ) : null}
            </div>
          </div>
        </aside>
      ) : null}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-orange-400/30 bg-orange-400/[0.08] px-2.5 py-1.5 font-label-caps text-[10px] uppercase tracking-[0.14em] text-orange-200/90 transition-colors hover:border-orange-400/45 hover:bg-orange-400/[0.12]"
      >
        <span
          className="material-symbols-outlined text-[16px]"
          style={{ fontVariationSettings: "'FILL' 0" }}
          aria-hidden
        >
          info
        </span>
        Info
        <span
          className={`material-symbols-outlined text-[14px] transition-transform ${
            open ? '' : 'rotate-180'
          }`}
          aria-hidden
        >
          expand_more
        </span>
      </button>
    </div>
  );
}
