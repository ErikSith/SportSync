'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { EventCardData } from '@/lib/data/events';
import type { FeaturedEventsResult } from '@/lib/data/homepage';
import type { FeedAreaId } from '@/lib/cities';
import { SportLabel } from '@/components/shared/SportLabel';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80';

function formatWhen(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  if (isToday) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${time}`;
}

function scopeLabel(area: FeedAreaId, areaLabel: string, distanceKm: number): string {
  if (area === 'near_me') {
    return distanceKm <= 1 ? 'Nearby' : `${distanceKm}km`;
  }
  if (area === 'bratislava') return 'BA';
  return areaLabel;
}

function featuredSubtitle(area: FeedAreaId, areaLabel: string): string {
  if (area === 'near_me') return 'Top official events near you';
  if (area === 'bratislava') return 'Top official events across Bratislava';
  return `Top official events in ${areaLabel}`;
}

function priceLabel(event: EventCardData): string {
  if (event.priceCents > 0) {
    return `€${(event.priceCents / 100).toFixed(event.priceCents % 100 === 0 ? 0 : 2)}`;
  }
  if (event.price > 0) return `€${event.price}`;
  return 'FREE';
}

function FeaturedEventItem({
  event,
  index,
  area,
  areaLabel,
}: {
  event: EventCardData;
  index: number;
  area: FeedAreaId;
  areaLabel: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const cover = event.coverUrl ?? DEFAULT_COVER;
  const price = priceLabel(event);
  const free = price === 'FREE';

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className={`glass-card group relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg border-l-[3px] px-2.5 py-2 text-left transition-colors ${
          index % 2 === 0 ? 'border-l-secondary' : 'border-l-primary-container'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        <div className="relative z-10 h-10 w-10 shrink-0 overflow-hidden rounded-md border border-secondary/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="h-full w-full object-cover" src={cover} alt="" />
        </div>

        <div className="relative z-10 min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h4 className="min-w-0 truncate font-headline-md text-[13px] font-semibold leading-tight text-on-surface transition-colors group-hover:text-secondary">
              {event.title}
            </h4>
            {event.status === 'live' && (
              <span className="shrink-0 rounded-full bg-error/90 px-1.5 py-0.5 font-label-caps text-[8px] uppercase tracking-wide text-on-error">
                Live
              </span>
            )}
          </div>

          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden font-label-caps text-[9px] uppercase tracking-[0.08em] text-on-surface-variant">
            <span className="shrink-0 text-secondary">Official</span>
            <span className="shrink-0 text-white/25">·</span>
            <SportLabel
              sport={event.sport}
              title={event.title}
              iconSize={11}
              className="min-w-0 shrink"
              labelClassName="font-label-caps text-[9px] uppercase tracking-[0.08em] text-on-surface-variant"
            />
            <span className="shrink-0 text-white/25">·</span>
            <span className="shrink-0 text-secondary">
              {scopeLabel(area, areaLabel, event.distanceKm)}
            </span>
            <span className="shrink-0 text-white/25">·</span>
            <span className="inline-flex min-w-0 shrink items-center gap-0.5 truncate">
              <span className="material-symbols-outlined text-[11px] text-primary-container">
                schedule
              </span>
              <span className="truncate text-on-surface">{formatWhen(event.startsAt)}</span>
            </span>
            <span className="hidden shrink-0 text-white/25 sm:inline">·</span>
            <span className="hidden min-w-0 items-center gap-0.5 truncate sm:inline-flex">
              <span className="material-symbols-outlined text-[11px]">location_on</span>
              <span className="truncate">{event.venueName ?? event.city}</span>
            </span>
          </div>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-1.5 pl-1">
          <span
            className={`font-label-caps text-[10px] uppercase tracking-wide ${
              free ? 'text-primary' : 'font-headline-md text-[12px] normal-case tracking-normal text-secondary'
            }`}
          >
            {price}
          </span>
          <span className="material-symbols-outlined text-[16px] text-outline transition-colors group-hover:text-secondary">
            arrow_forward
          </span>
        </div>
      </button>

      <EventPreviewModal
        event={event}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}

export function FeaturedSection({
  result,
  area,
  areaLabel,
}: {
  result: FeaturedEventsResult;
  area: FeedAreaId;
  areaLabel: string;
}) {
  const { events, showExtended, message } = result;

  if (events.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
            <span className="material-symbols-outlined text-primary">local_fire_department</span>
            Featured
          </h3>
          <p className="mt-0.5 font-body-md text-sm text-on-surface-variant">
            {featuredSubtitle(area, areaLabel)}
          </p>
        </div>
        <Link
          href="/events?type=official"
          className="group flex shrink-0 items-center gap-1 font-label-caps text-label-caps text-secondary transition-all hover:text-secondary-fixed"
        >
          VIEW ALL{' '}
          <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
            chevron_right
          </span>
        </Link>
      </div>

      {showExtended && (
        <div className="mb-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-outline-variant/30" />
          <span className="text-center font-label-caps text-label-caps text-[10px] uppercase text-secondary">
            {message ?? 'Nothing nearby? Check out matches 50km away.'}
          </span>
          <div className="h-px flex-1 bg-outline-variant/30" />
        </div>
      )}

      <div className="space-y-1.5">
        {events.map((event, index) => (
          <FeaturedEventItem
            key={event.id}
            event={event}
            index={index}
            area={area}
            areaLabel={areaLabel}
          />
        ))}
      </div>
    </section>
  );
}
