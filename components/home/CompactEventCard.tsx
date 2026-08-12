'use client';

import { useState } from 'react';
import type { EventCardData } from '@/lib/data/events';
import { eventTypeBadge } from '@/lib/constants/events';
import { SportLabel } from '@/components/shared/SportLabel';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80';
const LAST_SPOTS_MAX_REMAINING = 2;

export interface CompactEventBadge {
  label: string;
  className: string;
}

interface CompactEventCardProps {
  event: EventCardData;
  badge: CompactEventBadge;
}

function coverBadge(event: EventCardData): { label: string; className: string; icon?: string } {
  if (event.status === 'live') {
    return { label: 'LIVE', className: 'bg-primary-container text-white' };
  }
  return eventTypeBadge(event.type);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function CompactEventCard({ event, badge }: CompactEventCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const typeBadge = coverBadge(event);
  const cover = event.coverUrl ?? DEFAULT_COVER;
  const isOfficial = event.type === 'official';

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className={[
          'glass-card group relative flex w-[min(260px,78vw)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border text-left',
          'transition-all duration-300 ease-out hover:-translate-y-1',
          isOfficial
            ? 'border-secondary/30 hover:border-secondary/60'
            : 'border-primary-container/25 hover:border-primary-container/60',
        ].join(' ')}
      >
        <div className="relative h-36 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            src={cover}
            alt={event.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 group-hover:from-black/90" />

          <div
            className={`absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 font-label-caps text-[10px] shadow-lg ${typeBadge.className}`}
          >
            {typeBadge.icon && (
              <span
                className="material-symbols-outlined text-[12px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {typeBadge.icon}
              </span>
            )}
            {typeBadge.label}
          </div>
          <span
            className={`absolute right-3 top-3 rounded-full px-2.5 py-1 font-label-caps text-[10px] shadow-lg ${badge.className}`}
          >
            {badge.label}
          </span>

          <div className="absolute inset-x-0 bottom-0 translate-y-2 px-3 pb-2.5 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 font-label-caps text-[10px] uppercase tracking-wide text-white/85">
                <span className="material-symbols-outlined text-[13px]">schedule</span>
                {formatTime(event.startsAt)}
                <span className="text-white/35">·</span>
                <SportLabel
                  sport={event.sport}
                  title={event.title}
                  iconSize={12}
                  labelClassName="font-label-caps text-[10px] uppercase tracking-wide text-white/85"
                />
              </span>
              <span className="inline-flex items-center gap-0.5 font-label-caps text-[10px] uppercase tracking-wider text-secondary">
                Open
                <span className="material-symbols-outlined text-[13px] transition-transform duration-300 group-hover:translate-x-0.5">
                  arrow_forward
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-grow flex-col gap-2 p-4">
          <h4 className="line-clamp-2 min-h-[2.5em] font-headline-md text-[16px] text-on-surface transition-colors group-hover:text-secondary">
            {event.title}
          </h4>
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            <span className="font-body-md text-xs">{event.city}</span>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-2">
            <span className="font-label-caps text-[10px] text-on-surface-variant">
              {event.startsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
            {event.price > 0 ? (
              <span className="font-headline-md text-sm text-secondary">€{event.price}</span>
            ) : (
              <span className="font-label-caps text-[10px] text-primary">FREE</span>
            )}
          </div>
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

export function distanceBadge(distanceKm: number): CompactEventBadge {
  return {
    label: distanceKm <= 1 ? 'NEARBY' : `${distanceKm}KM`,
    className: 'bg-secondary-container/90 text-secondary border border-secondary/30 backdrop-blur-md',
  };
}

export function startingSoonBadge(startsAt: Date): CompactEventBadge {
  const now = new Date();
  const isToday = startsAt.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = startsAt.toDateString() === tomorrow.toDateString();

  let label: string;
  if (isToday) label = 'TODAY';
  else if (isTomorrow) label = 'TOMORROW';
  else
    label = startsAt
      .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      .toUpperCase();

  return {
    label,
    className: 'bg-primary-container/90 text-white border border-primary/30 backdrop-blur-md',
  };
}

export function lastSpotsBadge(event: EventCardData): CompactEventBadge {
  if (!event.capacity || event.capacity <= 0) {
    return {
      label: 'FILLING UP',
      className: 'bg-error-container/90 text-error border border-error/30 backdrop-blur-md',
    };
  }
  const spotsLeft = event.capacity - event.registeredCount;
  const fillPct = Math.round((event.registeredCount / event.capacity) * 100);

  const label = spotsLeft <= LAST_SPOTS_MAX_REMAINING ? `${spotsLeft} SPOTS LEFT` : `${fillPct}% FULL`;

  return {
    label,
    className: 'bg-error-container/90 text-error border border-error/30 backdrop-blur-md',
  };
}
