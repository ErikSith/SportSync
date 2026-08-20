'use client';

import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, X } from 'lucide-react';
import type { EventCardData } from '@/lib/data/events';
import { eventMatchesKids, eventMatchesWomen } from '@/lib/event-audience-filter';
import { eventTypeBadge } from '@/lib/constants/events';
import { sourceDisplayName } from '@/lib/constants/event-sources';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { SportLabel } from '@/components/shared/SportLabel';
import { EventRegisterButton } from '@/components/events/EventRegisterButton';
import { EventExternalCta } from '@/components/events/EventExternalCta';
import { EventAggregatedDisclaimer } from '@/components/events/EventAggregatedDisclaimer';
import { ReportEventDataButton } from '@/components/events/ReportEventDataButton';
import { alignStartsAtWithCopyTime, formatAppDate, formatAppTime } from '@/lib/datetime/bratislava';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80';

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

function eventInstant(event: EventCardData): Date {
  return alignStartsAtWithCopyTime(
    event.startsAt instanceof Date ? event.startsAt : new Date(event.startsAt),
    event.description,
  );
}

function priceLabel(event: EventCardData): string {
  if (event.priceCents > 0) {
    return `€${(event.priceCents / 100).toFixed(event.priceCents % 100 === 0 ? 0 : 2)}`;
  }
  if (event.price > 0) return `€${event.price}`;
  return 'Free';
}

function capacityMeta(event: EventCardData): { filled: number; total: number; pct: number } | null {
  const total = event.capacity ?? event.maxParticipants;
  if (total == null || total <= 0) return null;
  const filled = Math.min(event.registeredCount, total);
  return { filled, total, pct: Math.min(100, Math.round((filled / total) * 100)) };
}

interface EventPreviewModalProps {
  event: EventCardData;
  open: boolean;
  onClose: () => void;
}

export function EventPreviewModal({ event, open, onClose }: EventPreviewModalProps) {
  const titleId = useId();
  const cover = event.coverUrl ?? DEFAULT_COVER;
  const isLive = event.status === 'live';
  const typeBadge = isLive
    ? { label: 'LIVE', className: 'bg-error/90 text-on-error' }
    : eventTypeBadge(event.type);
  const capacity = capacityMeta(event);
  const isFull = capacity != null && capacity.filled >= capacity.total;
  const almostFull = capacity != null && capacity.pct >= 75 && !isLive && !isFull;
  const isSpectator = event.participationMode === 'spectator';
  const isAggregated = event.isAggregated;
  const externalUrl = event.sourceUrl ?? event.ticketUrl;
  const resolvedSourceName = sourceDisplayName(event.source, event.sourceName);
  const canRegister =
    !isAggregated && (event.status === 'open' || event.status === 'live');
  const venue =
    event.venueName && event.city
      ? `${event.venueName} · ${event.city}`
      : event.venueName ?? event.city;
  const price = priceLabel(event);
  const free = price === 'Free';

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
            className="relative z-[121] flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-0 bg-[#141210] sm:h-[min(88vh,680px)] sm:max-w-md sm:rounded-2xl sm:border sm:border-primary-container/25 sm:shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="h-0.5 w-full shrink-0 bg-gradient-to-r from-primary-container via-primary to-primary-container"
              aria-hidden
            />

            {/* Hero fills remaining phone height */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-[#141210]/55 to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary-container/20 to-transparent" />

              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
                <span
                  className={`rounded-full px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wide backdrop-blur-md ${typeBadge.className}`}
                >
                  {typeBadge.label}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-background/70 text-on-surface backdrop-blur-md transition-colors hover:border-primary-container/40 hover:text-primary"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>

              <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-label-caps text-[10px] uppercase tracking-[0.16em] text-primary drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
                  <SportLabel
                    sport={event.sport}
                    title={event.title}
                    iconSize={14}
                    labelClassName="font-label-caps text-[10px] uppercase tracking-[0.16em] text-primary"
                  />
                  {isSpectator ? (
                    <>
                      <span className="text-white/40">·</span>
                      <span>Watch</span>
                    </>
                  ) : null}
                  {eventMatchesWomen(event) ? (
                    <>
                      <span className="text-white/40">·</span>
                      <span>Pre ženy</span>
                    </>
                  ) : null}
                  {eventMatchesKids(event) ? (
                    <>
                      <span className="text-white/40">·</span>
                      <span>Pre deti</span>
                    </>
                  ) : null}
                  {event.distanceKm > 0 ? (
                    <>
                      <span className="text-white/40">·</span>
                      <span>{event.distanceKm} km</span>
                    </>
                  ) : null}
                </p>
                <h2
                  id={titleId}
                  className="mt-1 line-clamp-2 font-headline-md text-[24px] leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)]"
                >
                  {event.title}
                </h2>
              </div>
            </div>

            {/* Static body — no scroll */}
            <div className="flex shrink-0 flex-col gap-3 overflow-hidden px-4 py-3">
              <div className="space-y-2 rounded-xl border border-primary-container/20 bg-[#141210]/65 p-3">
                <p className="flex items-center gap-2 font-body-md text-sm text-on-surface">
                  <Calendar className="h-4 w-4 shrink-0 text-primary-container" strokeWidth={2.25} />
                  <span className="truncate">{formatWhen(eventInstant(event))}</span>
                </p>
                <p className="flex items-center gap-2 font-body-md text-sm text-on-surface">
                  <Clock className="h-4 w-4 shrink-0 text-primary-container" strokeWidth={2.25} />
                  Starts at {formatTime(eventInstant(event))}
                </p>
                <p className="flex items-center gap-2 font-body-md text-sm text-on-surface">
                  <MapPin className="h-4 w-4 shrink-0 text-primary-container" strokeWidth={2.25} />
                  <span className="truncate">{venue}</span>
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-x-4 font-label-caps text-[11px] uppercase tracking-[0.12em]">
                  {capacity ? (
                    <span
                      className={`flex items-center gap-1.5 ${
                        almostFull ? 'text-error' : 'text-on-surface-variant'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" strokeWidth={2.25} />
                      {capacity.filled}/{capacity.total} spots
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-on-surface-variant">
                      <Users className="h-3.5 w-3.5" strokeWidth={2.25} />
                      Open signup
                    </span>
                  )}
                  <span className={free ? 'text-primary-container' : 'text-primary'}>
                    Entry {price}
                  </span>
                </div>
                {capacity ? (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${capacity.pct}%`,
                        background: isLive
                          ? 'linear-gradient(90deg, #ff8a80, #ffb4ab)'
                          : almostFull
                            ? 'linear-gradient(90deg, #c84b24, #e09a3a)'
                            : 'linear-gradient(90deg, #8a3a20, #c84b24)',
                      }}
                    />
                  </div>
                ) : null}
              </div>

              {event.description ? (
                <p className="line-clamp-2 font-body-md text-sm leading-relaxed text-on-surface-variant">
                  {event.description}
                </p>
              ) : null}

              {isAggregated ? (
                <EventAggregatedDisclaimer sourceName={resolvedSourceName} compact />
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <ReportEventDataButton eventId={event.id} eventTitle={event.title} />
              </div>
            </div>

            <div className="shrink-0 border-t border-primary-container/20 bg-[#100e0b] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
              {isAggregated && externalUrl ? (
                <EventExternalCta
                  eventId={event.id}
                  sourceUrl={externalUrl}
                  sourceName={resolvedSourceName}
                  variant="compact"
                  label="Registrovať sa na oficiálnej stránke ↗"
                />
              ) : isSpectator && event.ticketUrl ? (
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 font-label-caps text-[12px] uppercase tracking-[0.16em] text-on-secondary transition-colors hover:bg-secondary-fixed-dim"
                >
                  Get tickets
                </a>
              ) : (
                <EventRegisterButton
                  eventId={event.id}
                  canRegister={canRegister}
                  isFull={isFull}
                  registerLabel={isSpectator ? 'Watch' : 'Join'}
                  registeredLabel={isSpectator ? 'Watching ✓' : 'Joined ✓'}
                  variant="compact"
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
