'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import type { EventCardData } from '@/lib/data/events';
import { isFormFactoryListing } from '@/lib/media/listing-cover';
import { isSportAvatarUrl, resolveTabCover, type SportAvatarTab } from '@/lib/media/sport-avatars';
import { AtmosphereTabMedia } from '@/components/shared/AtmosphereTabMedia';
import { SportLabel } from '@/components/shared/SportLabel';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';
import {
  alignStartsAtWithCopyTime,
  formatAppDayLabel,
  formatAppDayRangeLabel,
  formatAppTime,
} from '@/lib/datetime/bratislava';
import { useT } from '@/components/i18n/LocaleProvider';

export const EVENT_TAB_RAIL_W = 'w-[min(168px,72vw)] sm:w-[176px]';
export const EVENT_TAB_H = 'h-[176px] sm:h-[188px]';
export const EVENT_TAB_FILL_H = 'h-[196px]';

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatStartTime(date: Date | string): string {
  return formatAppTime(asDate(date));
}

function isFreeEvent(event: EventCardData): boolean {
  return !(event.priceCents > 0 || event.price > 0);
}

function priceLabel(event: EventCardData, freeText: string): string {
  if (event.priceCents > 0) {
    return `€${(event.priceCents / 100).toFixed(event.priceCents % 100 === 0 ? 0 : 2)}`;
  }
  if (event.price > 0) return `€${event.price}`;
  return freeText;
}

interface EventAtmosphereTabProps {
  event: EventCardData;
  index?: number;
  /** `rail` = fixed width for horizontal scroller; `fill` = stretch in a grid cell */
  layout?: 'rail' | 'fill';
  /** Visual accent — programs pages use teal to match BrandAppBar. */
  accent?: 'events' | 'programs';
  /**
   * Which SportSync mascot pack to use (Tournament / Event / Workshop folders).
   * Defaults to `event`. Programs → Workshopy should pass `workshop`.
   */
  avatarTab?: SportAvatarTab;
}

const ACCENT = {
  events: {
    wash: 'red' as const,
    border: 'border-[#E53935]/30 hover:border-[#E53935]/55',
    shadow: 'hover:shadow-[0_14px_32px_rgba(229,57,53,0.18)]',
    bg: 'bg-[#141010]',
    soft: 'text-[#ffc9c6]',
    strong: 'text-[#E53935]',
    pin: 'text-[#E53935]',
    titleHover: 'group-hover:text-[#ffc9c6]',
  },
  programs: {
    wash: 'teal' as const,
    border: 'border-teal-400/30 hover:border-teal-400/55',
    shadow: 'hover:shadow-[0_14px_32px_rgba(45,212,191,0.16)]',
    bg: 'bg-[#101413]',
    soft: 'text-teal-200',
    strong: 'text-teal-300',
    pin: 'text-teal-300',
    titleHover: 'group-hover:text-teal-200',
  },
};

export function EventAtmosphereTab({
  event,
  index: _index = 0,
  layout = 'rail',
  accent = 'events',
  avatarTab,
}: EventAtmosphereTabProps) {
  const t = useT();
  const [previewOpen, setPreviewOpen] = useState(false);
  const a = ACCENT[accent];
  const tab: SportAvatarTab = avatarTab ?? 'event';
  // No Unsplash court/venue stand-ins — mascot when shipped for this tab, else cover / gradient.
  const listingCover = isFormFactoryListing(event) ? null : event.coverUrl;
  const cover = resolveTabCover({
    tab,
    sport: event.sport,
    coverUrl: listingCover,
  });
  const hasAvatar = isSportAvatarUrl(cover);
  const free = isFreeEvent(event);
  const venue = event.venueName ?? event.city;
  const timeKnown = event.timeKnown !== false;
  const startsAt = timeKnown
    ? alignStartsAtWithCopyTime(asDate(event.startsAt), event.description)
    : asDate(event.startsAt);
  const sizeClass =
    layout === 'fill'
      ? `w-full ${EVENT_TAB_FILL_H}`
      : `${EVENT_TAB_RAIL_W} ${EVENT_TAB_H} shrink-0 snap-start`;
  const price = priceLabel(event, t('common.free'));
  const textMax = hasAvatar ? 'max-w-[55%]' : '';

  return (
    <>
      <div
        className={sizeClass}
        data-coming-up-tab
        data-event-atmosphere-tab
        data-accent={accent}
      >
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className={[
            'group relative flex h-full w-full flex-col overflow-hidden rounded-xl border p-3 text-left',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200',
            'hover:-translate-y-0.5 active:scale-95',
            a.bg,
            a.border,
            a.shadow,
          ].join(' ')}
          aria-label={`Otvoriť event: ${event.title}`}
        >
          <AtmosphereTabMedia src={cover} wash={a.wash} />

          <div className="relative z-10 grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] gap-1.5">
            <div className={`flex h-4 items-center gap-1.5 overflow-hidden ${textMax}`}>
              {timeKnown ? (
                <span
                  className={`shrink-0 font-label-caps text-[9px] uppercase tracking-[0.14em] leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)] ${a.soft}`}
                >
                  {formatAppDayLabel(startsAt)}
                </span>
              ) : null}
              {timeKnown ? <span className="shrink-0 text-white/35 leading-none">·</span> : null}
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
                  <span
                    className={`shrink-0 truncate font-label-caps text-[8px] uppercase tracking-[0.1em] leading-none opacity-80 ${a.soft}`}
                  >
                    Zdroj
                  </span>
                </>
              ) : null}
            </div>

            <time
              dateTime={
                timeKnown ? startsAt.toISOString() : startsAt.toISOString().slice(0, 10)
              }
              className={`flex h-7 sm:h-8 items-center overflow-hidden font-headline-md text-[22px] sm:text-[26px] leading-none tracking-[-0.03em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] ${textMax}`}
            >
              {timeKnown
                ? formatStartTime(startsAt)
                : formatAppDayRangeLabel(startsAt, event.endsAt)}
            </time>

            <h3
              className={[
                'min-h-0 overflow-hidden font-headline-md text-[12px] font-semibold leading-[1.25] text-white/95',
                'drop-shadow-[0_1px_6px_rgba(0,0,0,0.65)] transition-colors',
                '[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]',
                a.titleHover,
                textMax,
              ].join(' ')}
            >
              {event.title}
            </h3>

            <p
              className={`flex h-4 min-w-0 items-center gap-1 overflow-hidden font-body-md text-[11px] leading-none text-white/75 drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)] ${textMax}`}
            >
              <MapPin className={`h-3 w-3 shrink-0 ${a.pin}`} strokeWidth={2.25} />
              <span className="min-w-0 truncate">{venue}</span>
            </p>

            <div className={`flex h-4 shrink-0 items-center overflow-hidden ${textMax}`}>
              <span
                className={`font-label-caps text-[10px] uppercase tracking-[0.12em] leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)] ${
                  free ? a.soft : a.strong
                }`}
              >
                {price}
              </span>
            </div>
          </div>
        </button>
      </div>

      <EventPreviewModal
        event={event}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        coverUrl={cover}
      />
    </>
  );
}
