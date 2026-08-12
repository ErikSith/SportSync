'use client';

import { useState } from 'react';
import type { TournamentCardData } from '@/lib/data/tournaments';
import { lobbyTierLabel } from '@/lib/utils/lobby';
import { SportLabel } from '@/components/shared/SportLabel';
import { TournamentPreviewModal } from '@/components/tournaments/TournamentPreviewModal';
import { formatAppDate } from '@/lib/datetime/bratislava';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80';

/** Fixed grid tile — matches event carousel card footprint. */
export const TOURNAMENT_CARD_HEIGHT = 'h-[420px]';

const FORMAT_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elim',
  DOUBLE_ELIMINATION: 'Double Elim',
  ROUND_ROBIN: 'Round Robin',
  GROUP_STAGE: 'Group Stage',
};

function formatTournamentDate(startsAt: Date, endsAt: Date | null): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const start = formatAppDate(startsAt, opts).toUpperCase();
  if (!endsAt) return start;
  const end = formatAppDate(endsAt, opts).toUpperCase();
  if (start === end) return start;
  return `${start} – ${end}`;
}

function countdownLabel(startsAt: Date): string {
  const diffMs = startsAt.getTime() - Date.now();
  if (diffMs <= 0) return 'Started';
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `In ${days} days`;
  return formatTournamentDate(startsAt, null);
}

function formatEntryFee(fee: number): string {
  if (fee === 0) return 'Free';
  return `€${fee.toLocaleString()}`;
}

export function TournamentCard({ tournament }: { tournament: TournamentCardData }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const cover = tournament.coverUrl ?? DEFAULT_COVER;
  const formatLabel = FORMAT_LABELS[tournament.format] ?? tournament.format;
  const isLive = tournament.status === 'IN_PROGRESS';
  const tier = lobbyTierLabel(tournament.skillLevelMax ?? tournament.skillLevelMin);
  const spotsLeft = Math.max(0, tournament.maxParticipants - tournament.currentParticipants);
  const fillPercent = Math.min(
    100,
    (tournament.currentParticipants / Math.max(1, tournament.maxParticipants)) * 100,
  );
  const location =
    tournament.venueName && tournament.venueCity
      ? `${tournament.venueName}, ${tournament.venueCity}`
      : tournament.venueName ?? tournament.venueCity ?? 'Venue TBA';

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className={[
          TOURNAMENT_CARD_HEIGHT,
          'flex w-full flex-col overflow-hidden rounded-2xl border border-secondary/20 bg-surface-container-high text-left transition-colors hover:border-secondary/55 group',
        ].join(' ')}
      >
        <div
          className="h-0.5 w-full shrink-0"
          style={{
            background: 'linear-gradient(90deg, rgb(233,195,73) 0%, rgb(176,47,0) 55%, rgb(233,195,73) 100%)',
          }}
          aria-hidden
        />

        <div className="relative h-[168px] shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={cover}
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-black/25 to-black/35" />

          <span
            className="material-symbols-outlined pointer-events-none absolute -bottom-3 -right-2 select-none text-[96px] text-secondary/15"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden
          >
            emoji_events
          </span>

          <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 backdrop-blur-md ${
                isLive
                  ? 'bg-error/90 text-on-error'
                  : 'border border-secondary/30 bg-background/75 text-secondary'
              }`}
            >
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {isLive ? 'sensors' : 'emoji_events'}
              </span>
              <span className="font-label-caps text-[10px] uppercase tracking-wide">
                {isLive ? 'Live' : tier}
              </span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/30 bg-background/75 px-2 py-1 text-on-surface backdrop-blur-md">
              <span className="font-label-caps text-[10px] uppercase tracking-wide">{formatLabel}</span>
            </span>
          </div>

          <span className="absolute bottom-3 left-3 inline-flex items-center rounded-full bg-secondary/90 px-2.5 py-1 backdrop-blur-sm">
            <SportLabel
              sport={tournament.sport}
              iconSize={13}
              labelClassName="font-label-caps text-[10px] uppercase tracking-wide text-on-secondary"
            />
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-secondary">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span className="font-label-caps text-[10px] uppercase tracking-wide">
              {countdownLabel(tournament.startsAt)}
              <span className="text-on-surface-variant">
                {' '}
                · {formatTournamentDate(tournament.startsAt, tournament.endsAt)}
              </span>
            </span>
          </div>

          <h3 className="min-h-[2.6em] font-headline-md text-[17px] leading-snug text-on-background line-clamp-2 transition-colors group-hover:text-secondary">
            {tournament.name}
          </h3>

          <div className="mt-2 flex min-h-[1.25rem] items-center gap-1 text-on-surface-variant">
            <span className="material-symbols-outlined shrink-0 text-[14px]">location_on</span>
            <span className="truncate font-label-caps text-[10px] uppercase tracking-wide">{location}</span>
          </div>

          <div className="mt-auto flex min-h-[96px] flex-col justify-end gap-2.5 border-t border-secondary/15 pt-3">
            <div className="grid min-h-[28px] grid-cols-2 gap-3 font-label-caps text-[10px] uppercase tracking-wide">
              <div>
                <p className="mb-0.5 text-on-surface-variant">Entry</p>
                <p className="text-secondary">{formatEntryFee(tournament.entryFee)}</p>
              </div>
              <div className="text-right">
                <p className="mb-0.5 text-on-surface-variant">Spots</p>
                <p className="text-on-surface">
                  {spotsLeft}/{tournament.maxParticipants}
                </p>
              </div>
            </div>

            <div className="h-1.5 w-full rounded-full bg-surface-container-lowest">
              <div
                className="h-1.5 rounded-full bg-secondary transition-[width]"
                style={{ width: `${fillPercent}%` }}
              />
            </div>

            <span
              className="self-stretch rounded-full border border-secondary/40 py-2 text-center font-label-caps text-[11px] uppercase tracking-wider text-white transition-colors group-hover:border-secondary"
              style={{
                background: 'linear-gradient(135deg, rgb(176, 47, 0) 0%, rgb(95, 21, 0) 100%)',
              }}
            >
              Enter Cup
            </span>
          </div>
        </div>
      </button>

      <TournamentPreviewModal
        tournament={tournament}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
