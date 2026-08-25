'use client';

import { useState } from 'react';
import type { EventCardData } from '@/lib/data/events';
import { eventTypeBadge } from '@/lib/constants/events';
import { sportDisplayLabel } from '@/lib/constants/sports';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';
import { ListingCover } from '@/components/shared/ListingCover';
import { useT } from '@/components/i18n/LocaleProvider';
import type { EventType } from '@/lib/constants/events';

function formatShortWhen(date: Date): string {
  const day = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time}`;
}

function capacityMeta(event: EventCardData): { filled: number; total: number; pct: number } | null {
  const total = event.capacity ?? event.maxParticipants;
  if (total == null || total <= 0) return null;
  const filled = Math.min(event.registeredCount, total);
  return { filled, total, pct: Math.round((filled / total) * 100) };
}

function priceLabel(event: EventCardData, freeText: string): string {
  if (event.priceCents > 0) {
    return `€${(event.priceCents / 100).toFixed(event.priceCents % 100 === 0 ? 0 : 2)}`;
  }
  if (event.price > 0) return `€${event.price}`;
  return freeText;
}

function typeBadgeLabel(type: EventType, t: ReturnType<typeof useT>): string {
  return type === 'official'
    ? t('common.official').toUpperCase()
    : t('common.community').toUpperCase();
}

export function EventActionRow({ event }: { event: EventCardData }) {
  const t = useT();
  const [previewOpen, setPreviewOpen] = useState(false);
  const isSpectator = event.participationMode === 'spectator';
  const cover = event.coverUrl;
  const capacity = capacityMeta(event);
  const typeBadge = eventTypeBadge(event.type);
  const badgeLabel = typeBadgeLabel(event.type, t);

  return (
    <>
      <article
        className={`group flex flex-col gap-4 rounded-2xl border border-outline-variant/15 bg-surface-container-high/90 p-3.5 transition-[border-color,box-shadow] duration-300 sm:flex-row sm:items-center ${
          isSpectator
            ? 'hover:border-secondary/35 hover:shadow-[0_12px_32px_rgba(233,195,73,0.08)]'
            : 'hover:border-primary-container/40 hover:shadow-[0_12px_32px_rgba(200,75,36,0.1)]'
        }`}
      >
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-surface-container sm:h-[104px] sm:w-[104px]"
        >
          <ListingCover className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" src={cover} alt="" />
          <span
            className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-label-caps text-[9px] uppercase tracking-wide backdrop-blur-md ${typeBadge.className}`}
          >
            {typeBadge.icon && (
              <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {typeBadge.icon}
              </span>
            )}
            {badgeLabel}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <button type="button" onClick={() => setPreviewOpen(true)} className="min-w-0 text-left">
              <h3 className="font-headline-md text-[16px] leading-snug text-on-background line-clamp-1 transition-colors group-hover:text-primary-container">
                {event.title}
              </h3>
            </button>
            <span className="shrink-0 rounded-md border border-outline-variant/25 bg-surface-container px-2 py-1 font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
              {sportDisplayLabel(event.sport)}
            </span>
          </div>

          <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1.5 text-on-surface-variant">
            <span className="inline-flex items-center gap-1 font-label-caps text-[11px] uppercase tracking-wide">
              <span
                className={`material-symbols-outlined text-[14px] ${
                  isSpectator ? 'text-secondary' : 'text-primary-container'
                }`}
              >
                schedule
              </span>
              <span className="text-on-surface">{formatShortWhen(event.startsAt)}</span>
            </span>
            <span className="inline-flex items-center gap-1 font-label-caps text-[11px] uppercase tracking-wide">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              <span className="max-w-[140px] truncate">{event.venueName ?? event.city}</span>
            </span>
            {capacity && (
              <span className="inline-flex items-center gap-1 font-label-caps text-[11px] uppercase tracking-wide">
                <span
                  className={`material-symbols-outlined text-[14px] ${
                    isSpectator ? 'text-secondary' : 'text-primary-container'
                  }`}
                >
                  group
                </span>
                {capacity.filled}/{capacity.total}
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-label-caps text-[11px] uppercase tracking-wide text-on-surface">
              {priceLabel(event, t('common.free'))}
            </span>
          </div>

          {capacity && !isSpectator && (
            <div className="mb-1 h-1.5 w-full max-w-xs rounded-full bg-surface-container-lowest">
              <div
                className="h-1.5 rounded-full bg-primary-container"
                style={{ width: `${Math.min(100, capacity.pct)}%` }}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className={`w-full shrink-0 rounded-xl px-5 py-2.5 text-center font-label-caps text-[11px] uppercase tracking-[0.14em] transition-colors sm:w-auto ${
            isSpectator
              ? 'bg-secondary text-on-secondary hover:bg-secondary-fixed-dim'
              : 'bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary'
          }`}
        >
          {isSpectator ? t('common.watch') : t('common.join')}
        </button>
      </article>

      <EventPreviewModal
        event={event}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
}
