'use client';

import type { MatchActivityCard } from '@/lib/data/profile-shared';
import { sportDisplayLabel } from '@/lib/constants/sports';
import { initialsFromName } from '@/lib/utils/initials';

interface KarmaFallbackItem {
  id: string;
  type: string;
  delta: number;
  createdAt: string;
}

interface ProfileMatchActivityProps {
  matches: MatchActivityCard[];
  karmaFallback?: KarmaFallbackItem[];
}

function asDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function relativeTimeSk(value: string | Date): string {
  const date = asDate(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return '';
  const diffMs = Date.now() - ms;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return mins <= 1 ? 'Pred chvíľou' : `Pred ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? 'Pred hodinou' : `Pred ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Pred 1 dňom';
  if (days < 7) return `Pred ${days} dňami`;
  if (days < 14) return 'Pred týždňom';
  return `Pred ${Math.floor(days / 7)} týžd.`;
}

function resultLabel(result: MatchActivityCard['result']): { text: string; className: string } {
  if (result === 'win') return { text: 'Výhra', className: 'text-primary-container' };
  if (result === 'loss') return { text: 'Prehra', className: 'text-on-surface' };
  return { text: 'Remíza', className: 'text-on-surface-variant' };
}

export function ProfileMatchActivity({ matches, karmaFallback = [] }: ProfileMatchActivityProps) {
  return (
    <section className="space-y-3">
      <h2 className="font-headline-md text-[1.1rem] text-on-surface">Posledná aktivita</h2>

      {matches.length > 0 ? (
        <ul className="space-y-3">
          {matches.map((match) => {
            const outcome = resultLabel(match.result);
            return (
              <li
                key={match.id}
                className="relative overflow-hidden rounded-2xl border border-white/8 bg-surface-container"
              >
                <div
                  className="absolute inset-0 opacity-[0.18]"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg, rgba(200,75,36,0.45), transparent 55%), radial-gradient(circle at 80% 20%, rgba(233,195,73,0.2), transparent 50%)',
                  }}
                />
                <div className="relative space-y-2.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-black/35 px-2 py-1 font-label-caps text-[9px] uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
                      {sportDisplayLabel(match.sport)}
                    </span>
                    <span className="font-label-caps text-[9px] uppercase tracking-wide text-on-surface-variant">
                      {relativeTimeSk(match.createdAt)}
                    </span>
                  </div>
                  <div>
                    <p className="font-headline-md text-[1.05rem] text-on-surface">{match.title}</p>
                    {match.location ? (
                      <p className="mt-0.5 font-body-md text-xs text-on-surface-variant">{match.location}</p>
                    ) : null}
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <p className={`font-label-caps text-[12px] uppercase tracking-[0.14em] ${outcome.className}`}>
                      {outcome.text}
                      {match.scoreLabel ? (
                        <span className="ml-2 font-body-md text-sm normal-case tracking-normal text-on-surface">
                          {match.scoreLabel}
                        </span>
                      ) : null}
                    </p>
                    {match.participants.length > 0 ? (
                      <div className="flex -space-x-2">
                        {match.participants.slice(0, 4).map((p) => (
                          <div
                            key={p.id}
                            className="h-7 w-7 overflow-hidden rounded-full border-2 border-surface-container bg-surface-container-high"
                            title={p.name}
                          >
                            {p.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-[9px] text-on-surface-variant">
                                {initialsFromName(p.name)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : karmaFallback.length > 0 ? (
        <ul className="space-y-2">
          {karmaFallback.slice(0, 3).map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-2xl border border-white/5 bg-surface-container px-4 py-3"
            >
              <div>
                <p className="font-body-md text-sm text-on-surface">{entry.type.replace(/_/g, ' ')}</p>
                <p className="font-label-caps text-[9px] uppercase text-on-surface-variant">
                  {relativeTimeSk(entry.createdAt)}
                </p>
              </div>
              <span
                className={`font-label-caps text-[12px] ${
                  entry.delta >= 0 ? 'text-primary-container' : 'text-error'
                }`}
              >
                {entry.delta >= 0 ? '+' : ''}
                {entry.delta} karma
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 bg-surface-container/40 px-4 py-6 text-center font-body-md text-sm text-on-surface-variant">
          Zatiaľ žiadne odohrané zápasy. Po zápase sa tu zobrazia výsledky.
        </p>
      )}
    </section>
  );
}
