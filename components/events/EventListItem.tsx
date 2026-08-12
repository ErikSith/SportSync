'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { EventCardData } from '@/lib/data/events';
import { eventMatchesKids, eventMatchesWomen } from '@/lib/event-audience-filter';
import { sportIcon } from '@/lib/utils/sport-icons';
import { formatAppDayLabel, formatAppTime } from '@/lib/datetime/bratislava';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatStartTime(date: Date | string): string {
  return formatAppTime(asDate(date), undefined, 'sk-SK');
}

function priceLabel(event: EventCardData): string {
  if (event.priceCents > 0) {
    const euros = event.priceCents / 100;
    const formatted =
      euros % 1 === 0 ? String(euros) : euros.toFixed(2).replace('.', ',');
    return `${formatted} €`;
  }
  if (event.price > 0) return `${event.price} €`;
  return 'FREE';
}

function showForKids(event: EventCardData): boolean {
  return eventMatchesKids(event);
}

function showForWomen(event: EventCardData): boolean {
  return eventMatchesWomen(event);
}

function locationLabel(event: EventCardData): string {
  return event.venueName?.trim() || event.city?.trim() || 'Bratislava';
}

interface EventListItemProps {
  event: EventCardData;
}

export function EventListItem({ event }: EventListItemProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const startsAt = asDate(event.startsAt);
  const day = formatAppDayLabel(startsAt);
  const time = formatStartTime(startsAt);
  const place = locationLabel(event);
  const price = priceLabel(event);
  const icon = sportIcon(event.sport, event.title);

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-transparent px-3 py-3 text-left transition-colors duration-200 hover:border-white/18 hover:bg-white/[0.03] active:bg-white/[0.05] sm:gap-3.5 sm:px-3.5"
        aria-label={`${day} ${time} — ${event.title}`}
        data-event-list-item
      >
        <span className="flex w-[3.5rem] shrink-0 flex-col items-start gap-0.5 sm:w-14">
          <span className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-on-surface-variant">
            {day}
          </span>
          <time
            dateTime={startsAt.toISOString()}
            className="font-headline-md text-xl font-bold tabular-nums tracking-tight text-white leading-none"
          >
            {time}
          </time>
        </span>

        <span
          className="material-symbols-outlined shrink-0 text-[22px] text-primary-container/85"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
          aria-hidden
        >
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-headline-md text-base font-semibold tracking-wide text-white">
            {event.title}
          </span>
          <span className="mt-0.5 block truncate font-body-md text-[13px] text-on-surface-variant">
            {place}
            {showForWomen(event) ? (
              <>
                <span className="text-on-surface-variant/70"> • </span>
                <span className="text-primary-container/90">Pre ženy</span>
              </>
            ) : null}
            {showForKids(event) ? (
              <>
                <span className="text-on-surface-variant/70"> • </span>
                <span className="text-primary-container/90">Pre deti</span>
              </>
            ) : null}
            <span className="text-on-surface-variant/70"> • </span>
            {price}
          </span>
        </span>

        <ChevronDown
          className="h-4 w-4 shrink-0 text-on-surface-variant/70 transition-colors group-hover:text-on-surface-variant"
          strokeWidth={2}
          aria-hidden
        />
      </button>

      <EventPreviewModal
        event={event}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
