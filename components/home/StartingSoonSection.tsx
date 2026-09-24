'use client';

import Link from 'next/link';
import type { EventCardData } from '@/lib/data/events';
import { partitionFeedForHybridHub } from '@/lib/feed/aggregate-routine-lessons';
import { EventAtmosphereTab } from '@/components/events/EventAtmosphereTab';
import { GroupedVenueScheduleCard } from '@/components/events/GroupedVenueScheduleCard';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '@/components/i18n/LocaleProvider';
import { loginHref } from '@/lib/auth/login-href';

const DECK_LIMIT = 12;

interface StartingSoonSectionProps {
  events: EventCardData[];
  title?: string;
  subtitle?: string;
  /** No follows yet — show CTA instead of carousel. */
  showFollowCta?: boolean;
  /** Guest must sign in before following. */
  ctaNeedsLogin?: boolean;
  /** User follows venues but nothing is upcoming in the window. */
  followedButEmpty?: boolean;
}

export function StartingSoonSection({
  events,
  title = 'Coming up',
  subtitle = 'Čo ide čoskoro — scrollni termíny',
  showFollowCta = false,
  ctaNeedsLogin = false,
  followedButEmpty = false,
}: StartingSoonSectionProps) {
  const t = useT();
  const deck = useMemo(
    () => partitionFeedForHybridHub(events).chronological.slice(0, DECK_LIMIT),
    [events],
  );
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(max > 4 && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener('scroll', updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      ro.disconnect();
    };
  }, [deck.length, updateEdges]);

  const scrollByTab = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const tab = el.querySelector<HTMLElement>('[data-coming-up-tab]');
    const step = (tab?.offsetWidth ?? 176) + 12;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || !el || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > 6) {
      drag.moved = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('cursor-grabbing');
    }
    if (drag.moved) {
      el.scrollLeft = drag.startScroll - dx;
    }
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    el?.classList.remove('cursor-grabbing');
    if (drag.moved) {
      const blockClick = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      el?.addEventListener('click', blockClick, { capture: true, once: true });
    }
    dragRef.current = null;
    updateEdges();
  };

  if (showFollowCta || followedButEmpty) {
    return (
      <section className="space-y-3">
        <div className="min-w-0">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="h-1 w-5 rounded-full bg-[#FF5722]" />
            <h3 className="font-headline-md text-[15px] tracking-wide text-on-background md:text-headline-md">
              {title}
            </h3>
          </div>
          <p className="pl-7 font-body-md text-sm text-on-surface-variant">{subtitle}</p>
        </div>
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="font-body-md text-sm text-on-surface font-medium">
              {followedButEmpty ? t('home.favoritesNoUpcoming') : t('home.favoritesEmpty')}
            </p>
            <p className="mt-0.5 font-body-md text-sm text-on-surface-variant">
              {followedButEmpty
                ? t('home.favoritesNoUpcomingSub')
                : t('home.favoritesEmptySub')}
            </p>
          </div>
          <Link
            href={ctaNeedsLogin ? loginHref('/venues', { mode: 'sign-up' }) : '/venues'}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 font-label-caps text-[10px] uppercase tracking-[0.12em] text-primary transition-colors hover:bg-primary/20"
          >
            <span className="material-symbols-outlined text-[16px]">favorite</span>
            {ctaNeedsLogin ? t('home.favoritesLoginCta') : t('home.favoritesEmptyCta')}
          </Link>
        </div>
      </section>
    );
  }

  if (deck.length === 0) return null;

  const showArrows = deck.length > 1;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="h-1 w-5 rounded-full bg-[#FF5722]" />
            <h3 className="font-headline-md text-[15px] tracking-wide text-on-background md:text-headline-md">
              {title}
            </h3>
          </div>
          <p className="pl-7 font-body-md text-sm text-on-surface-variant">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showArrows && (
            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                aria-label="Previous events"
                disabled={!canPrev}
                onClick={() => scrollByTab(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-container/25 text-primary transition-colors hover:border-primary-container/50 hover:bg-primary-container/10 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="Next events"
                disabled={!canNext}
                onClick={() => scrollByTab(1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-container/25 text-primary transition-colors hover:border-primary-container/50 hover:bg-primary-container/10 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          )}
          <Link
            href="/venues"
            className="group inline-flex items-center gap-0.5 font-label-caps text-[10px] uppercase tracking-[0.12em] text-primary-container transition-colors hover:text-primary"
          >
            {t('venues.title')}
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <div
        ref={scrollerRef}
        role="list"
        aria-label="Favorite venue events"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex cursor-grab snap-x snap-mandatory flex-nowrap gap-2.5 sm:gap-3 overflow-x-auto overscroll-x-contain pb-0.5 select-none touch-pan-x hide-scrollbar active:cursor-grabbing -mx-container-margin-mobile px-container-margin-mobile md:mx-0 md:px-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {deck.map((item, index) =>
          item.kind === 'ROUTINE_LESSON_GROUP' ? (
            <div key={item.id} role="listitem">
              <GroupedVenueScheduleCard group={item} index={index} layout="rail" />
            </div>
          ) : (
            <div key={item.event.id} role="listitem">
              <EventAtmosphereTab event={item.event} index={index} layout="rail" />
            </div>
          ),
        )}
      </div>
    </section>
  );
}
