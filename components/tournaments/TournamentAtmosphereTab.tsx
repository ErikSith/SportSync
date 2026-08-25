'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import type { TournamentCardData } from '@/lib/data/tournaments';
import { tournamentParticipationMode } from '@/lib/tournament-participation';
import { isFormFactoryListing } from '@/lib/media/listing-cover';
import { resolveSportAtmosphereCover } from '@/lib/venues/venue-media';
import { AtmosphereTabMedia } from '@/components/shared/AtmosphereTabMedia';
import { SportLabel } from '@/components/shared/SportLabel';
import { TournamentPreviewModal } from '@/components/tournaments/TournamentPreviewModal';
import { APP_TIMEZONE } from '@/lib/datetime/bratislava';
import { useT } from '@/components/i18n/LocaleProvider';

export const TOURNAMENT_TAB_H = 'h-[196px]';

const BRASS = '#c4a035';
const BRASS_SOFT = 'rgba(196, 160, 53, 0.14)';
const BRASS_LINE = 'rgba(196, 160, 53, 0.28)';

function formatDayHero(date: Date): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const dayKey = (d: Date) =>
    d.toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE }); // YYYY-MM-DD

  if (dayKey(date) === dayKey(now)) return 'Dnes';
  if (dayKey(date) === dayKey(tomorrow)) return 'Zajtra';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIMEZONE,
  });
}

function formatStartTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: APP_TIMEZONE,
  });
}

function entryLabel(fee: number, freeText: string): string {
  if (fee <= 0) return freeText;
  return `€${fee}`;
}

function statusMeta(
  status: string,
  t: ReturnType<typeof useT>,
): { label: string; live: boolean } {
  if (status === 'IN_PROGRESS') return { label: t('common.live'), live: true };
  if (status === 'REGISTRATION_OPEN') return { label: t('common.open'), live: false };
  return { label: t('common.cup'), live: false };
}

interface TournamentAtmosphereTabProps {
  tournament: TournamentCardData;
  index?: number;
}

export function TournamentAtmosphereTab({
  tournament,
  index = 0,
}: TournamentAtmosphereTabProps) {
  const t = useT();
  const [previewOpen, setPreviewOpen] = useState(false);
  const cover = isFormFactoryListing({
    source: tournament.source,
    sourceUrl: tournament.sourceUrl,
    ticketUrl: tournament.ticketUrl,
    venueName: tournament.venueName,
    name: tournament.name,
    coverUrl: tournament.coverUrl,
  })
    ? null
    : resolveSportAtmosphereCover(tournament.sport, tournament.coverUrl);
  const status = statusMeta(tournament.status, t);
  const venue = tournament.venueName ?? tournament.venueCity ?? 'Venue TBA';
  const filled = tournament.currentParticipants;
  const max = Math.max(1, tournament.maxParticipants);
  const fillPct = Math.min(100, Math.round((filled / max) * 100));
  const almostFull = fillPct >= 75 && !status.live;
  const isAggregated =
    tournament.isAggregated || Boolean(tournament.source) || Boolean(tournament.sourceUrl);
  const isSpectatorCup = tournamentParticipationMode(tournament) === 'spectator';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30, delay: Math.min(index, 8) * 0.03 }}
        className={`w-full ${TOURNAMENT_TAB_H}`}
        data-tournament-atmosphere-tab
      >
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="group relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-[#c4a035]/30 bg-[#14120e] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#c4a035]/50 hover:shadow-[0_14px_32px_rgba(196,160,53,0.16)]"
          aria-label={`${isSpectatorCup ? 'Otvoriť zápas' : 'Otvoriť turnaj'}: ${tournament.name}`}
        >
          <AtmosphereTabMedia src={cover} wash="brass" />

          <div className="relative z-10 grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] gap-1.5">
            <div className="flex h-5 items-center justify-between gap-2 overflow-hidden">
              <span
                className={[
                  'inline-flex h-5 shrink-0 items-center rounded-md px-1.5 font-label-caps text-[8px] uppercase tracking-[0.12em] leading-none',
                  status.live ? 'bg-error/90 text-on-error' : 'text-[#e8d59a]',
                ].join(' ')}
                style={
                  status.live
                    ? undefined
                    : { backgroundColor: BRASS_SOFT, border: `1px solid ${BRASS_LINE}` }
                }
              >
                {isAggregated ? t('common.source') : status.label}
              </span>
              <SportLabel
                sport={tournament.sport}
                iconSize={11}
                className="min-w-0 justify-end"
                labelClassName="text-right font-label-caps text-[8px] uppercase tracking-[0.12em] leading-none text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]"
              />
            </div>

            <div className="flex h-7 items-baseline gap-2 overflow-hidden">
              <time
                dateTime={tournament.startsAt.toISOString()}
                className="shrink-0 font-headline-md text-[20px] leading-none tracking-[-0.02em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]"
              >
                {formatDayHero(tournament.startsAt)}
              </time>
              <span className="shrink-0 font-label-caps text-[11px] leading-none tracking-wide text-[#e8d59a] drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)]">
                {formatStartTime(tournament.startsAt)}
              </span>
            </div>

            <h3 className="min-h-0 overflow-hidden font-headline-md text-[12px] font-semibold leading-[1.25] text-white/95 drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)] transition-colors group-hover:text-[#e8d59a] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {tournament.name}
            </h3>

            <p className="flex h-4 min-w-0 items-center gap-1 overflow-hidden font-body-md text-[11px] leading-none text-white/75 drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)]">
              <MapPin className="h-3 w-3 shrink-0" style={{ color: BRASS }} strokeWidth={2.25} />
              <span className="min-w-0 truncate">{venue}</span>
            </p>

            <div className="flex h-[28px] shrink-0 flex-col justify-end gap-1">
              {isSpectatorCup ? (
                <div className="flex h-[28px] items-end justify-between gap-2">
                  <span className="shrink-0 font-label-caps text-[10px] uppercase tracking-[0.1em] leading-none text-[#e8d59a]">
                    {t('common.watch')}
                  </span>
                  <span className="shrink-0 font-label-caps text-[10px] uppercase tracking-[0.1em] leading-none text-on-surface-variant">
                    {entryLabel(tournament.entryFee, t('common.free'))}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex h-3 items-center justify-between gap-2 overflow-hidden">
                    <span
                      className={`shrink-0 font-label-caps text-[10px] uppercase tracking-[0.1em] leading-none ${
                        almostFull ? 'text-error' : 'text-[#e8d59a]'
                      }`}
                    >
                      {filled}/{tournament.maxParticipants}
                    </span>
                    <span className="shrink-0 font-label-caps text-[10px] uppercase tracking-[0.1em] leading-none text-on-surface-variant">
                      {entryLabel(tournament.entryFee, t('common.free'))}
                    </span>
                  </div>
                  <div className="h-1 w-full shrink-0 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${fillPct}%`,
                        background: status.live
                          ? 'linear-gradient(90deg, #ff8a80, #ffb4ab)'
                          : almostFull
                            ? 'linear-gradient(90deg, #af8d11, #e09a3a)'
                            : `linear-gradient(90deg, #8a7020, ${BRASS})`,
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </button>
      </motion.div>

      <TournamentPreviewModal
        tournament={tournament}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
