'use client';

/**
 * FRONTEND / UI AGENT — zobrazenie výstupu Classifier Agenta v taboch.
 *
 * Dátový tok (kontrakt z Python `SportEvent.model_dump()`):
 *   ScraperAgent → clean_text
 *   ClassifierAgent → SportEvent[]  (JSON nižšie)
 *   <SportsTabs events={...} />     ← tento súbor
 *
 * Tab 1: participation_type  ACTIVE | PASSIVE_SPECTATOR
 * Tab 2: target_audience     KIDS | WOMEN | ALL (MEN sa zobrazí pri „Všetci“ / vlastný filter)
 */

import { useMemo, useState } from 'react';

/** Zrkadlí Python `agents/models.py` → SportEvent */
export type ParticipationType = 'ACTIVE' | 'PASSIVE_SPECTATOR';
export type TargetAudience = 'KIDS' | 'WOMEN' | 'MEN' | 'ALL';

export interface SportEventCard {
  title: string;
  location: string;
  participation_type: ParticipationType;
  target_audience: TargetAudience[];
  category: string;
  description: string;
}

type ModeTab = ParticipationType;
type AudienceFilter = 'KIDS' | 'WOMEN' | 'ALL';

const MODE_TABS: Array<{ key: ModeTab; label: string }> = [
  { key: 'ACTIVE', label: 'Chcem športovať (Aktívne)' },
  { key: 'PASSIVE_SPECTATOR', label: 'Chcem sledovať (Divák)' },
];

const AUDIENCE_TABS: Array<{ key: AudienceFilter; label: string }> = [
  { key: 'KIDS', label: 'Pre deti' },
  { key: 'WOMEN', label: 'Pre ženy' },
  { key: 'ALL', label: 'Všetci' },
];

/** Farebné odznaky podľa cieľovej skupiny (Apex Elite tokeny). */
const AUDIENCE_BADGE: Record<TargetAudience, string> = {
  KIDS: 'bg-tertiary-container text-on-tertiary-container',
  WOMEN: 'bg-secondary-container text-on-secondary-container',
  MEN: 'bg-primary-container/80 text-on-primary-container',
  ALL: 'bg-surface-container-high text-on-surface-variant border border-white/10',
};

const AUDIENCE_LABEL: Record<TargetAudience, string> = {
  KIDS: 'Deti',
  WOMEN: 'Ženy',
  MEN: 'Muži',
  ALL: 'Všetci',
};

interface SportsTabsProps {
  /** JSON z Classifier Agenta — pole SportEvent */
  events: SportEventCard[];
  className?: string;
}

function matchesAudience(event: SportEventCard, filter: AudienceFilter): boolean {
  // „Všetci“ = žiadny audience filter (ukáž všetky karty v danom mode tabe)
  if (filter === 'ALL') return true;
  const tags = event.target_audience;
  // Explicitný tag ALEBO všeobecná ponuka (ALL) — deti/ženy majú čo robiť aj na open lekciách
  return tags.includes(filter) || tags.includes('ALL');
}

export function SportsTabs({ events, className = '' }: SportsTabsProps) {
  const [mode, setMode] = useState<ModeTab>('ACTIVE');
  const [audience, setAudience] = useState<AudienceFilter>('ALL');

  const filtered = useMemo(() => {
    return events.filter(
      (e) => e.participation_type === mode && matchesAudience(e, audience),
    );
  }, [events, mode, audience]);

  return (
    <section className={`w-full ${className}`} aria-label="Športoviská Bratislava">
      {/* --- Hlavný prepínač: Aktívne vs Divák (participation_type) --- */}
      <div
        className="relative w-full border-b border-white/5"
        role="tablist"
        aria-label="Typ účasti"
      >
        <div className="flex w-full">
          {MODE_TABS.map((tab) => {
            const selected = mode === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setMode(tab.key)}
                className={`relative flex flex-1 items-center justify-center px-2 py-3 text-center font-label-caps text-[10px] uppercase tracking-[0.12em] transition-colors duration-200 sm:text-[12px] ${
                  selected ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
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

      {/* --- Pod-taby: cieľová skupina (target_audience) --- */}
      <div
        className="mt-3 flex gap-1.5 overflow-x-auto overscroll-x-contain hide-scrollbar touch-pan-x py-0.5"
        role="tablist"
        aria-label="Cieľová skupina"
      >
        {AUDIENCE_TABS.map((tab) => {
          const selected = audience === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setAudience(tab.key)}
              className={`snap-start shrink-0 rounded-full px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wide whitespace-nowrap transition-colors ${
                selected
                  ? 'bg-tertiary-container text-on-tertiary-container'
                  : 'glass-card border border-tertiary/25 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* --- Karty zo Classifier JSON --- */}
      <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2">
        {filtered.map((event) => (
          <li key={`${event.title}-${event.location}-${event.category}`}>
            <article className="glass-card flex h-full flex-col gap-2 rounded-2xl border border-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-on-surface leading-snug">
                  {event.title}
                </h3>
                <span className="shrink-0 rounded-full bg-surface-container-highest px-2 py-0.5 font-label-caps text-[10px] uppercase tracking-wide text-primary-container">
                  {event.category}
                </span>
              </div>

              <p className="text-sm text-on-surface-variant">
                <span className="text-on-surface/80">{event.location}</span>
                <span className="mx-1.5 text-zinc-600" aria-hidden>
                  ·
                </span>
                {event.participation_type === 'ACTIVE' ? 'Aktívne' : 'Divák'}
              </p>

              <p className="text-sm leading-relaxed text-zinc-400 line-clamp-3">
                {event.description}
              </p>

              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                {event.target_audience.map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-full px-2 py-0.5 font-label-caps text-[10px] uppercase tracking-wide ${AUDIENCE_BADGE[tag]}`}
                  >
                    {AUDIENCE_LABEL[tag]}
                  </span>
                ))}
              </div>
            </article>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="mt-6 text-center text-sm text-zinc-500">
          V tomto filtri zatiaľ nie sú žiadne položky z Classifier Agenta.
        </p>
      ) : null}
    </section>
  );
}
