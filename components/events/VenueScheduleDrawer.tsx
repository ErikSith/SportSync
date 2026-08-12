'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import type { EventCardData } from '@/lib/data/events';
import {
  formatLessonTime,
  slovakLessonCountLabel,
  type ClassSession,
  type GroupedVenueSchedule,
} from '@/lib/feed/aggregate-routine-lessons';
import { sourceDisplayName } from '@/lib/constants/event-sources';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { EventExternalCta } from '@/components/events/EventExternalCta';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';

interface VenueScheduleDrawerProps {
  group: GroupedVenueSchedule | null;
  open: boolean;
  onClose: () => void;
}

function priceLabel(event: EventCardData): string {
  if (event.priceCents > 0) {
    return `€${(event.priceCents / 100).toFixed(event.priceCents % 100 === 0 ? 0 : 2)}`;
  }
  if (event.price > 0) return `€${event.price}`;
  return 'Free';
}

function startsAtIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function VenueScheduleDrawer({ group, open, onClose }: VenueScheduleDrawerProps) {
  const titleId = useId();
  const [previewLesson, setPreviewLesson] = useState<ClassSession | null>(null);
  useBodyScrollLock(open && Boolean(group));

  useEffect(() => {
    if (!open) setPreviewLesson(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewLesson) setPreviewLesson(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, previewLesson]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open && group ? (
          <motion.div
            className="fixed inset-0 z-[120] flex items-end justify-center overscroll-none sm:items-center sm:p-6"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              type="button"
              aria-label="Zavrieť rozpis"
              className="absolute inset-0 bg-black/80 backdrop-blur-md sm:bg-black/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-[121] flex max-h-[92dvh] w-full max-w-none flex-col overflow-hidden rounded-t-2xl border border-outline-variant/20 bg-[#141210] sm:max-h-[min(88vh,720px)] sm:max-w-lg sm:rounded-2xl sm:shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 28 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
                <span className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              <div className="flex items-start justify-between gap-3 border-b border-white/5 px-4 pb-3 pt-2 sm:px-5 sm:pt-4">
                <div className="min-w-0">
                  <p className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-primary">
                    Rozpis lekcií
                  </p>
                  <h2
                    id={titleId}
                    className="mt-1 font-headline-md text-[17px] leading-snug tracking-wide text-on-surface"
                  >
                    {group.venueName}
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-body-md text-xs text-on-surface-variant">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary-container" strokeWidth={2.25} />
                      {group.city}
                    </span>
                    <span className="text-white/25">·</span>
                    <span>
                      {group.dayLabel} · {slovakLessonCountLabel(group.lessons.length)}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-background/70 text-on-surface transition-colors hover:border-primary-container/40 hover:text-primary"
                  aria-label="Zavrieť"
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
                <ol className="space-y-2" aria-label={`${group.venueName} — ${group.dayLabel}`}>
                  {group.lessons.map((lesson) => {
                    const externalUrl = lesson.sourceUrl ?? lesson.ticketUrl;
                    return (
                      <li
                        key={lesson.id}
                        className="rounded-xl border border-outline-variant/15 bg-surface-container-low/80 px-3 py-2.5"
                      >
                        <div className="flex items-start gap-3">
                          <time
                            dateTime={startsAtIso(lesson.startsAt)}
                            className="w-[3.5rem] shrink-0 font-headline-md text-[18px] leading-none tracking-tight text-primary"
                          >
                            {formatLessonTime(lesson.startsAt)}
                          </time>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => setPreviewLesson(lesson)}
                              className="text-left font-headline-md text-[14px] leading-snug text-on-surface transition-colors hover:text-primary"
                            >
                              {lesson.title}
                            </button>
                            <p className="mt-0.5 font-label-caps text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
                              {priceLabel(lesson)}
                              {lesson.isAggregated ? (
                                <>
                                  <span className="mx-1.5 text-white/25">·</span>
                                  Zdroj
                                </>
                              ) : null}
                            </p>
                            {externalUrl && lesson.isAggregated ? (
                              <div className="mt-2">
                                <EventExternalCta
                                  eventId={lesson.id}
                                  sourceUrl={externalUrl}
                                  sourceName={sourceDisplayName(lesson.source, lesson.sourceName)}
                                  variant="compact"
                                  label="Rezervovať ↗"
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPreviewLesson(lesson)}
                                className="mt-2 inline-flex rounded-lg border border-primary-container/35 bg-primary-container/10 px-3 py-1.5 font-label-caps text-[10px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary-container/20"
                              >
                                Detail
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {previewLesson ? (
        <EventPreviewModal
          event={previewLesson}
          open
          onClose={() => setPreviewLesson(null)}
        />
      ) : null}
    </>,
    document.body,
  );
}
