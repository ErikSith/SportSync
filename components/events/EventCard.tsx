'use client';

import { useState } from 'react';
import type { EventCardData } from '@/lib/data/events';
import { eventTypeBadge } from '@/lib/constants/events';
import { resolveTheme } from '@/lib/ai/theme-config-client';
import { SportLabel } from '@/components/shared/SportLabel';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';
import { ListingCover } from '@/components/shared/ListingCover';

function formatEventDate(date: Date): string {
  return date
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    .toUpperCase();
}

function formatEventTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function coverBadge(event: EventCardData): { label: string; className: string; icon?: string } {
  if (event.status === 'live') {
    return {
      label: 'LIVE',
      className: 'bg-primary-container text-white',
    };
  }
  return eventTypeBadge(event.type);
}

function modeBadge(event: EventCardData): { label: string; className: string } {
  if (event.participationMode === 'spectator') {
    return {
      label: 'WATCH',
      className: 'bg-surface-container-highest/90 text-secondary border border-secondary/30',
    };
  }
  return {
    label: 'JOIN',
    className: 'bg-surface-container-highest/90 text-primary border border-primary/30',
  };
}

export function EventCard({ event }: { event: EventCardData }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { label, className: badgeClass, icon } = coverBadge(event);
  const mode = modeBadge(event);
  const cover = event.coverUrl;
  const theme = resolveTheme(event.sportType, event.themeConfig);
  const accent = theme.accent;
  const distance =
    event.distanceKm != null && Number.isFinite(event.distanceKm)
      ? `${event.distanceKm}km`
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="group relative flex w-full flex-col rounded-xl overflow-hidden border border-outline-variant/15 bg-surface-container-low text-left transition-colors hover:border-outline-variant/35 active:scale-[0.98]"
      >
        <div
          className="absolute top-0 inset-x-0 h-0.5 z-10"
          style={{ backgroundColor: accent }}
          aria-hidden
        />

        <div className="relative aspect-[4/3] overflow-hidden">
          <ListingCover
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={cover}
            alt={event.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

          <div
            className={`absolute top-2 left-2 font-label-caps text-label-caps text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${badgeClass}`}
          >
            {icon && (
              <span
                className="material-symbols-outlined text-[10px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {icon}
              </span>
            )}
            {label}
          </div>

          <div
            className={`absolute top-2 right-2 font-label-caps text-label-caps text-[9px] px-1.5 py-0.5 rounded-full ${mode.className}`}
          >
            {mode.label}
          </div>

          <span
            className="absolute bottom-2 left-2 inline-flex items-center px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: accent }}
          >
            <SportLabel
              sport={event.sport}
              title={event.title}
              iconSize={11}
              labelClassName="font-label-caps text-[9px] uppercase tracking-wide text-white"
            />
          </span>
        </div>

        <div className="flex flex-col gap-1 p-2.5 flex-grow">
          <div className="flex items-center gap-1 font-label-caps text-label-caps text-[10px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[12px]">calendar_today</span>
            <span>
              {formatEventDate(event.startsAt)} · {formatEventTime(event.startsAt)}
            </span>
          </div>

          <h2 className="font-headline-md text-sm leading-snug text-on-background line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h2>

          <div className="mt-auto pt-1.5 flex items-start gap-1 text-on-surface-variant">
            <span className="material-symbols-outlined text-[12px] shrink-0 mt-0.5">location_on</span>
            <span className="font-body-md text-[11px] leading-tight line-clamp-1">
              {event.city}
              {distance ? ` · ${distance}` : ''}
            </span>
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
