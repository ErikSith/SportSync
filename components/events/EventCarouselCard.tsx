'use client';

import { useState } from 'react';
import type { EventCardData } from '@/lib/data/events';
import { eventTypeBadge } from '@/lib/constants/events';
import { resolveTheme } from '@/lib/ai/theme-config-client';
import { SportLabel } from '@/components/shared/SportLabel';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';
import { ListingCover } from '@/components/shared/ListingCover';
import { useT } from '@/components/i18n/LocaleProvider';
import type { EventType } from '@/lib/constants/events';

/** Fixed carousel tile — every card shares the same width + height. */
export const CAROUSEL_CARD_WIDTH = 'w-[min(272px,82vw)] sm:w-[300px]';
export const CAROUSEL_CARD_HEIGHT = 'h-[400px] sm:h-[420px]';

function formatEventDate(date: Date): string {
  return date
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase();
}

function formatEventTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
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

export function EventCarouselCard({
  event,
  accent = 'player',
}: {
  event: EventCardData;
  accent?: 'player' | 'spectator';
}) {
  const t = useT();
  const [previewOpen, setPreviewOpen] = useState(false);
  const isSpectator = event.participationMode === 'spectator' || accent === 'spectator';
  const isLive = event.status === 'live';
  const cover = event.coverUrl;
  const theme = resolveTheme(event.sportType, event.themeConfig);
  const typeBadge = isLive
    ? { label: t('common.live').toUpperCase(), className: 'bg-error/90 text-on-error', icon: undefined as string | undefined }
    : { ...eventTypeBadge(event.type), label: typeBadgeLabel(event.type, t) };
  const capacity = capacityMeta(event);
  const distance =
    event.distanceKm != null && Number.isFinite(event.distanceKm)
      ? `${event.distanceKm} km`
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className={[
          CAROUSEL_CARD_WIDTH,
          CAROUSEL_CARD_HEIGHT,
          'flex flex-col overflow-hidden rounded-2xl bg-surface-container-high border border-outline-variant/15 group text-left',
          'transition-[border-color,box-shadow,transform] duration-300',
          isSpectator
            ? 'hover:border-secondary/45 hover:shadow-[0_16px_40px_rgba(233,195,73,0.12)]'
            : 'hover:border-primary-container/50 hover:shadow-[0_16px_40px_rgba(200,75,36,0.16)]',
          'hover:-translate-y-0.5',
        ].join(' ')}
      >
        <div className="relative h-[172px] shrink-0 overflow-hidden">
          <ListingCover
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={cover}
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-black/25 to-black/35" />

          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-error/90 px-2.5 py-1 text-on-error backdrop-blur-md">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-on-error" />
                <span className="font-label-caps text-[10px] uppercase tracking-wide">{t('common.live')}</span>
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 backdrop-blur-md ${
                  isSpectator
                    ? 'bg-background/80 text-secondary border border-secondary/25'
                    : 'bg-background/80 text-primary-container border border-primary-container/25'
                }`}
              >
                {typeBadge.icon && (
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {typeBadge.icon}
                  </span>
                )}
                <span className="font-label-caps text-[10px] uppercase tracking-wide">
                  {typeBadge.label}
                </span>
              </span>
            )}
            <span className="rounded-full bg-background/75 px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wide text-on-surface backdrop-blur-md border border-white/10">
              {priceLabel(event, t('common.free'))}
            </span>
          </div>

          <span
            className="absolute bottom-3 left-3 inline-flex items-center rounded-full px-2.5 py-1 backdrop-blur-sm"
            style={{ backgroundColor: `${theme.accent}e6` }}
          >
            <SportLabel
              sport={event.sport}
              title={event.title}
              iconSize={13}
              labelClassName="font-label-caps text-[10px] uppercase tracking-wide text-white"
            />
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3.5">
          <div className="mb-2 flex items-center gap-3 text-on-surface-variant">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`material-symbols-outlined text-[15px] ${
                  isSpectator ? 'text-secondary' : 'text-primary-container'
                }`}
              >
                calendar_today
              </span>
              <span className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface">
                {isLive ? t('events.startedAt', { time: formatEventTime(event.startsAt) }) : formatEventDate(event.startsAt)}
              </span>
            </span>
            {!isLive && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`material-symbols-outlined text-[15px] ${
                    isSpectator ? 'text-secondary' : 'text-primary-container'
                  }`}
                >
                  schedule
                </span>
                <span className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface">
                  {formatEventTime(event.startsAt)}
                </span>
              </span>
            )}
          </div>

          <h3 className="min-h-[2.6em] font-headline-md text-[17px] leading-snug text-on-background line-clamp-2 transition-colors group-hover:text-primary-container">
            {event.title}
          </h3>

          <div className="mt-2 flex min-h-[1.25rem] items-center gap-1.5 text-on-surface-variant">
            <span className="material-symbols-outlined shrink-0 text-[15px]">location_on</span>
            <span className="truncate font-body-md text-xs">
              {event.venueName ?? event.city}
              {distance ? ` · ${distance}` : ''}
            </span>
          </div>

          <div className="mt-auto flex min-h-[92px] flex-col justify-end gap-3 border-t border-outline-variant/20 pt-3">
            {isSpectator ? (
              <div className="flex min-h-[28px] items-center justify-between gap-2 font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
                <span className="inline-flex items-center gap-1 truncate">
                  <span className="material-symbols-outlined text-[14px]">confirmation_number</span>
                  {t('events.ticket')} {priceLabel(event, t('common.free'))}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                  {capacity ? t('events.going', { n: capacity.filled }) : t('common.open')}
                </span>
              </div>
            ) : capacity ? (
              <div className="w-full min-h-[28px]">
                <div className="mb-1.5 flex justify-between font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
                  <span>{t('common.spots')}</span>
                  <span className="text-on-surface">
                    {capacity.filled}/{capacity.total}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-container-lowest">
                  <div
                    className="h-1.5 rounded-full bg-primary-container transition-[width]"
                    style={{ width: `${Math.min(100, capacity.pct)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[28px] items-center font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">group</span>
                  {t('events.openSignup')}
                </span>
              </div>
            )}

            <span
              className={`self-stretch rounded-xl py-2.5 text-center font-label-caps text-[11px] uppercase tracking-[0.14em] transition-colors ${
                isSpectator
                  ? 'bg-secondary text-on-secondary group-hover:bg-secondary-fixed-dim'
                  : 'bg-primary-container text-on-primary-container group-hover:bg-primary group-hover:text-on-primary'
              }`}
            >
              {isSpectator ? t('common.watch') : t('events.joinEvent')}
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
