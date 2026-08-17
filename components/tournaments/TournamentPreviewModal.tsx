'use client';

import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Trophy, Users, X } from 'lucide-react';
import type { TournamentCardData } from '@/lib/data/tournaments';
import { tournamentParticipationMode } from '@/lib/tournament-participation';
import { lobbyTierLabel } from '@/lib/utils/lobby';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { sourceDisplayName } from '@/lib/constants/event-sources';
import { SportLabel } from '@/components/shared/SportLabel';
import { RegisterButton } from '@/components/tournaments/RegisterButton';
import { TournamentExternalCta } from '@/components/tournaments/TournamentExternalCta';
import { formatAppDate, formatAppTime } from '@/lib/datetime/bratislava';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80';

const BRASS = '#c4a035';
const BRASS_SOFT = 'rgba(196, 160, 53, 0.14)';
const BRASS_LINE = 'rgba(196, 160, 53, 0.28)';
const BRASS_TEXT = '#e8d59a';

const FORMAT_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elimination',
  DOUBLE_ELIMINATION: 'Double Elimination',
  ROUND_ROBIN: 'Round Robin',
  GROUP_STAGE: 'Group Stage',
};

function formatWhen(date: Date): string {
  return formatAppDate(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatTime(date: Date): string {
  return formatAppTime(date);
}

function formatDateRange(startsAt: Date, endsAt: Date | null): string {
  const start = formatWhen(startsAt);
  if (!endsAt) return start;
  const sameDay =
    formatAppDate(startsAt, { year: 'numeric', month: '2-digit', day: '2-digit' }) ===
    formatAppDate(endsAt, { year: 'numeric', month: '2-digit', day: '2-digit' });
  if (sameDay) return start;
  return `${start} – ${formatAppDate(endsAt, {
    day: 'numeric',
    month: 'long',
  })}`;
}

function entryLabel(fee: number): string {
  if (fee <= 0) return 'Free';
  return `€${fee}`;
}

function statusMeta(status: string): { label: string; live: boolean } {
  if (status === 'IN_PROGRESS') return { label: 'Live', live: true };
  if (status === 'REGISTRATION_OPEN') return { label: 'Open', live: false };
  if (status === 'COMPLETED') return { label: 'Finished', live: false };
  return { label: 'Cup', live: false };
}

function skillLabel(min: number | null, max: number | null): string {
  const tier = lobbyTierLabel(max ?? min);
  if (min != null && max != null) return `${tier} · ${min}–${max}`;
  if (min != null) return `${tier} · ${min}+`;
  if (max != null) return `${tier} · up to ${max}`;
  return tier;
}

interface TournamentPreviewModalProps {
  tournament: TournamentCardData;
  open: boolean;
  onClose: () => void;
}

export function TournamentPreviewModal({
  tournament,
  open,
  onClose,
}: TournamentPreviewModalProps) {
  const titleId = useId();
  const cover = tournament.coverUrl ?? DEFAULT_COVER;
  const status = statusMeta(tournament.status);
  const filled = tournament.currentParticipants;
  const max = Math.max(1, tournament.maxParticipants);
  const fillPct = Math.min(100, Math.round((filled / max) * 100));
  const isFull = filled >= tournament.maxParticipants;
  const almostFull = fillPct >= 75 && !status.live;
  const deadlinePassed =
    tournament.registrationDeadline !== null &&
    tournament.registrationDeadline.getTime() <= Date.now();
  const externalUrl = tournament.sourceUrl ?? tournament.ticketUrl ?? null;
  const isAggregated =
    tournament.isAggregated || Boolean(tournament.source) || Boolean(externalUrl);
  const resolvedSourceName = sourceDisplayName(tournament.source);
  const canRegister =
    !isAggregated &&
    tournament.status === 'REGISTRATION_OPEN' &&
    !deadlinePassed &&
    !isFull;
  const isSpectatorCup = tournamentParticipationMode(tournament) === 'spectator';
  const venue =
    tournament.venueName && tournament.venueCity
      ? `${tournament.venueName} · ${tournament.venueCity}`
      : tournament.venueName ?? tournament.venueCity ?? 'Venue TBA';
  const formatLabel = FORMAT_LABELS[tournament.format] ?? tournament.format;

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-stretch justify-center overscroll-none sm:items-center sm:p-6"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 bg-black/80 backdrop-blur-md sm:bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-[121] flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-0 bg-[#14120e] sm:h-[min(88vh,680px)] sm:max-w-md sm:rounded-2xl sm:border sm:shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            style={{ borderColor: BRASS_LINE }}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-0.5 w-full shrink-0"
              style={{
                background: `linear-gradient(90deg, ${BRASS} 0%, #af8d11 45%, ${BRASS} 100%)`,
              }}
              aria-hidden
            />

            <div className="relative min-h-0 flex-1 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14120e] via-[#14120e]/55 to-black/30" />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${BRASS_SOFT} 0%, transparent 50%)`,
                }}
              />

              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
                <span
                  className={[
                    'rounded-full px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wide backdrop-blur-md',
                    status.live ? 'bg-error/90 text-on-error' : '',
                  ].join(' ')}
                  style={
                    status.live
                      ? undefined
                      : {
                          backgroundColor: BRASS_SOFT,
                          border: `1px solid ${BRASS_LINE}`,
                          color: BRASS_TEXT,
                        }
                  }
                >
                  {status.label}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-background/70 text-on-surface backdrop-blur-md transition-colors hover:border-[#c4a035]/40 hover:text-[#e8d59a]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>

              <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-label-caps text-[10px] uppercase tracking-[0.16em] drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
                  <SportLabel
                    sport={tournament.sport}
                    iconSize={14}
                    labelClassName="font-label-caps text-[10px] uppercase tracking-[0.16em] text-[#e8d59a]"
                  />
                  <span className="text-white/40">·</span>
                  <span style={{ color: BRASS }}>{formatLabel}</span>
                </p>
                <h2
                  id={titleId}
                  className="mt-1 line-clamp-2 font-headline-md text-[24px] leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)]"
                >
                  {tournament.name}
                </h2>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 overflow-hidden px-4 py-3">
              <div
                className="space-y-2 rounded-xl border p-3"
                style={{
                  borderColor: 'rgba(196, 160, 53, 0.18)',
                  backgroundColor: 'rgba(20, 18, 14, 0.65)',
                }}
              >
                <p className="flex items-center gap-2 font-body-md text-sm text-on-surface">
                  <Calendar className="h-4 w-4 shrink-0" style={{ color: BRASS }} strokeWidth={2.25} />
                  <span className="truncate">{formatDateRange(tournament.startsAt, tournament.endsAt)}</span>
                </p>
                <p className="flex items-center gap-2 font-body-md text-sm text-on-surface">
                  <Clock className="h-4 w-4 shrink-0" style={{ color: BRASS }} strokeWidth={2.25} />
                  Starts at {formatTime(tournament.startsAt)}
                </p>
                <p className="flex items-center gap-2 font-body-md text-sm text-on-surface">
                  <MapPin className="h-4 w-4 shrink-0" style={{ color: BRASS }} strokeWidth={2.25} />
                  <span className="truncate">{venue}</span>
                </p>
                <p className="flex items-center gap-2 font-body-md text-sm text-on-surface">
                  <Trophy className="h-4 w-4 shrink-0" style={{ color: BRASS }} strokeWidth={2.25} />
                  <span className="truncate">{skillLabel(tournament.skillLevelMin, tournament.skillLevelMax)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-x-4 font-label-caps text-[11px] uppercase tracking-[0.12em]">
                  <span className="flex items-center gap-1.5" style={{ color: almostFull ? undefined : BRASS_TEXT }}>
                    <Users className="h-3.5 w-3.5" strokeWidth={2.25} />
                    <span className={almostFull ? 'text-error' : undefined}>
                      {filled}/{tournament.maxParticipants} spots
                    </span>
                  </span>
                  <span style={{ color: BRASS }}>
                    Entry {entryLabel(tournament.entryFee)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
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
              </div>

              {tournament.description ? (
                <p className="line-clamp-2 font-body-md text-sm leading-relaxed text-on-surface-variant">
                  {tournament.description}
                </p>
              ) : null}
            </div>

            <div
              className="shrink-0 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
              style={{
                borderColor: 'rgba(196, 160, 53, 0.18)',
                backgroundColor: '#100e0b',
              }}
            >
              {externalUrl ? (
                <TournamentExternalCta
                  tournamentId={tournament.id}
                  sourceUrl={externalUrl}
                  sourceName={resolvedSourceName}
                  variant="compact"
                  label={
                    isSpectatorCup
                      ? 'Vstupenky / sledovať ↗'
                      : 'Registrovať sa na oficiálnej stránke ↗'
                  }
                />
              ) : isSpectatorCup ? (
                <a
                  href={`/tournaments/${tournament.id}`}
                  className="flex w-full items-center justify-center rounded-xl border border-[#c4a035]/30 bg-[#c4a035]/12 py-3.5 font-label-caps text-[12px] uppercase tracking-[0.16em] text-[#e8d59a] transition-colors hover:bg-[#c4a035]/18"
                >
                  Sledovať turnaj
                </a>
              ) : (
                <RegisterButton
                  tournamentId={tournament.id}
                  isRegistered={false}
                  canRegister={canRegister}
                  isFull={isFull}
                  entryFee={tournament.entryFee}
                  venueId={tournament.venueId}
                  variant="compact"
                  registerLabel="Join"
                  registeredLabel="Joined ✓"
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
