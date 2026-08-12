'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { EventCardData } from '@/lib/data/events';
import {
  CompactEventCard,
  distanceBadge,
  lastSpotsBadge,
  startingSoonBadge,
  type CompactEventBadge,
} from '@/components/home/CompactEventCard';

export type InspirationBadgeKind = 'startingSoon' | 'lastSpots' | 'distance';

interface EventInspirationRowProps {
  icon: string;
  title: string;
  subtitle?: string;
  events: EventCardData[];
  badgeKind: InspirationBadgeKind;
}

function badgeFor(kind: InspirationBadgeKind, event: EventCardData): CompactEventBadge {
  if (kind === 'startingSoon') return startingSoonBadge(event.startsAt);
  if (kind === 'lastSpots') return lastSpotsBadge(event);
  return distanceBadge(event.distanceKm);
}

export function EventInspirationRow({
  icon,
  title,
  subtitle,
  events,
  badgeKind,
}: EventInspirationRowProps) {
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
  }, [events.length, updateEdges]);

  const scrollByCard = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-inspiration-card]');
    const step = (card?.offsetWidth ?? 260) + 16;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    // Defer capture until drag threshold — otherwise child Links never receive click.
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

  if (events.length === 0) return null;

  const showArrows = events.length > 1;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">{icon}</span>
            {title}
          </h3>
          {subtitle && (
            <p className="font-body-md text-sm text-on-surface-variant mt-1">{subtitle}</p>
          )}
        </div>
        <Link
          href="/events"
          className="text-secondary font-label-caps text-label-caps hover:text-secondary-fixed transition-all flex items-center gap-1 group shrink-0"
        >
          VIEW ALL{' '}
          <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
            chevron_right
          </span>
        </Link>
      </div>

      <div className="relative group/inspiration">
        {showArrows && canPrev && (
          <button
            type="button"
            aria-label="Previous events"
            onClick={() => scrollByCard(-1)}
            className="absolute left-1 md:left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high/95 border border-primary-container/40 text-primary-container hover:bg-primary-container/15 shadow-lg backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">chevron_left</span>
          </button>
        )}
        {showArrows && canNext && (
          <button
            type="button"
            aria-label="Next events"
            onClick={() => scrollByCard(1)}
            className="absolute right-1 md:right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high/95 border border-primary-container/40 text-primary-container hover:bg-primary-container/15 shadow-lg backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">chevron_right</span>
          </button>
        )}

        <div
          ref={scrollerRef}
          role="list"
          aria-label={title}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex flex-nowrap gap-4 overflow-x-auto overscroll-x-contain hide-scrollbar snap-x snap-mandatory cursor-grab select-none touch-pan-x pb-1 -mx-container-margin-mobile px-container-margin-mobile md:mx-0 md:px-0 active:cursor-grabbing"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {events.map((event) => (
            <div key={event.id} data-inspiration-card className="snap-start shrink-0" role="listitem">
              <CompactEventCard event={event} badge={badgeFor(badgeKind, event)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
