'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { EventCardData } from '@/lib/data/events';
import { EventCarouselCard } from '@/components/events/EventCarouselCard';

interface EventHorizontalCarouselProps {
  events: EventCardData[];
  /** Accent for arrow buttons: player coral vs spectator gold */
  accent?: 'player' | 'spectator';
}

export function EventHorizontalCarousel({
  events,
  accent = 'player',
}: EventHorizontalCarouselProps) {
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
    setCanNext(el.scrollLeft < max - 4);
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
    const card = el.querySelector<HTMLElement>('[data-carousel-card]');
    const step = (card?.offsetWidth ?? 300) + 16;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Touch/pen: keep native overflow scroll. Mouse: drag-to-scroll.
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
    el.classList.add('cursor-grabbing');
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || !el || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 6) drag.moved = true;
    el.scrollLeft = drag.startScroll - dx;
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    el?.classList.remove('cursor-grabbing');
    // Block accidental link clicks after a drag
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

  const arrowClass =
    accent === 'spectator'
      ? 'border-secondary/35 text-secondary hover:bg-secondary/15 hover:border-secondary/55'
      : 'border-primary-container/35 text-primary-container hover:bg-primary-container/15 hover:border-primary-container/55';

  return (
    <div className="relative group/carousel">
      {canPrev && (
        <button
          type="button"
          aria-label="Previous events"
          onClick={() => scrollByCard(-1)}
          className={`absolute left-1 md:-left-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-surface-container-highest/95 shadow-xl backdrop-blur-md transition-colors sm:flex ${arrowClass}`}
        >
          <span className="material-symbols-outlined text-[22px]">chevron_left</span>
        </button>
      )}
      {canNext && (
        <button
          type="button"
          aria-label="Next events"
          onClick={() => scrollByCard(1)}
          className={`absolute right-1 md:-right-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-surface-container-highest/95 shadow-xl backdrop-blur-md transition-colors sm:flex ${arrowClass}`}
        >
          <span className="material-symbols-outlined text-[22px]">chevron_right</span>
        </button>
      )}

      <div
        ref={scrollerRef}
        role="list"
        aria-label="Event carousel"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex flex-nowrap gap-4 overflow-x-auto overscroll-x-contain hide-scrollbar snap-x snap-mandatory cursor-grab select-none touch-pan-x pb-3 -mx-container-margin-mobile px-container-margin-mobile md:mx-0 md:px-0 active:cursor-grabbing"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {events.map((event) => (
          <div key={event.id} data-carousel-card className="snap-start shrink-0" role="listitem">
            <EventCarouselCard event={event} accent={accent} />
          </div>
        ))}
      </div>
    </div>
  );
}
