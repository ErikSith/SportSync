'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import type { EventCardData } from '@/lib/data/events';
import { isFormFactoryListing } from '@/lib/media/listing-cover';
import { resolveSportAtmosphereCover } from '@/lib/venues/venue-media';
import { AtmosphereTabMedia } from '@/components/shared/AtmosphereTabMedia';
import { SportLabel } from '@/components/shared/SportLabel';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';
import {
  alignStartsAtWithCopyTime,
  formatAppDayLabel,
  formatAppTime,
} from '@/lib/datetime/bratislava';

export const EVENT_TAB_RAIL_W = 'w-[min(168px,72vw)] sm:w-[176px]';
export const EVENT_TAB_H = 'h-[176px] sm:h-[188px]';

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatStartTime(date: Date | string): string {
  return formatAppTime(asDate(date));
}

function priceLabel(event: EventCardData): string {
  if (event.priceCents > 0) {
    return `€${(event.priceCents / 100).toFixed(event.priceCents % 100 === 0 ? 0 : 2)}`;
  }
  if (event.price > 0) return `€${event.price}`;
  return 'Free';
}

interface EventAtmosphereTabProps {
  event: EventCardData;
  index?: number;
  /** `rail` = fixed width for horizontal scroller; `fill` = stretch in a grid cell */
  layout?: 'rail' | 'fill';
}

export function EventAtmosphereTab({
  event,
  index = 0,
  layout = 'rail',
}: EventAtmosphereTabProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const cover = isFormFactoryListing(event)
    ? null
    : resolveSportAtmosphereCover(event.sport, event.coverUrl);
  const free = priceLabel(event) === 'Free';
  const venue = event.venueName ?? event.city;
  const startsAt = alignStartsAtWithCopyTime(asDate(event.startsAt), event.description);
  const sizeClass =
    layout === 'fill'
      ? `w-full ${EVENT_TAB_H}`
      : `${EVENT_TAB_RAIL_W} ${EVENT_TAB_H} shrink-0 snap-start`;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30, delay: Math.min(index, 8) * 0.03 }}
        className={sizeClass}
        data-coming-up-tab
        data-event-atmosphere-tab
      >
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="group relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-outline-variant/20 bg-[#141210] p-3 text-left shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_36px_rgba(0,0,0,0.45)] active:scale-95"
          aria-label={`Otvoriť event: ${event.title}`}
        >
          <AtmosphereTabMedia src={cover} wash="coral" />

          <div className="relative z-10 grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] gap-1.5">
            <div className="flex h-4 items-center gap-1.5 overflow-hidden">
              <span className="shrink-0 font-label-caps text-[9px] uppercase tracking-[0.14em] leading-none text-primary drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]">
                {formatAppDayLabel(startsAt)}
              </span>
              <span className="shrink-0 text-white/35 leading-none">·</span>
              <SportLabel
                sport={event.sport}
                title={event.title}
                iconSize={11}
                className="min-w-0"
                labelClassName="font-label-caps text-[9px] uppercase tracking-[0.12em] leading-none text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]"
              />
              {event.isAggregated ? (
                <>
                  <span className="shrink-0 text-white/35 leading-none">·</span>
                  <span className="shrink-0 truncate font-label-caps text-[8px] uppercase tracking-[0.1em] leading-none text-secondary">
                    Zdroj
                  </span>
                </>
              ) : null}
            </div>

            <time
              dateTime={startsAt.toISOString()}
              className="flex h-7 sm:h-8 items-center overflow-hidden font-headline-md text-[22px] sm:text-[26px] leading-none tracking-[-0.03em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]"
            >
              {formatStartTime(startsAt)}
            </time>

            <h3 className="min-h-0 overflow-hidden font-headline-md text-[12px] font-semibold leading-[1.25] text-white/95 drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)] transition-colors group-hover:text-primary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {event.title}
            </h3>

            <p className="flex h-4 min-w-0 items-center gap-1 overflow-hidden font-body-md text-[11px] leading-none text-white/75 drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)]">
              <MapPin className="h-3 w-3 shrink-0 text-primary-container" strokeWidth={2.25} />
              <span className="min-w-0 truncate">{venue}</span>
            </p>

            <div className="flex h-4 shrink-0 items-center overflow-hidden">
              <span
                className={`font-label-caps text-[10px] uppercase tracking-[0.12em] leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)] ${
                  free ? 'text-primary-container' : 'text-primary'
                }`}
              >
                {priceLabel(event)}
              </span>
            </div>
          </div>
        </button>
      </motion.div>

      <EventPreviewModal
        event={event}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
