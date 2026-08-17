'use client';

import { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronDown, ChevronRight } from 'lucide-react';
import {
  formatLessonTime,
  groupedScheduleTitle,
  shortScheduleDayLabel,
  slovakLekcieCountLabel,
  type ClassSession,
  type GroupedVenueSchedule,
} from '@/lib/feed/aggregate-routine-lessons';
import { getZonedParts } from '@/lib/datetime/bratislava';
import { displayVenueName } from '@/lib/venues/listing-url';
import { VenueScheduleDrawer } from '@/components/events/VenueScheduleDrawer';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';

/** Wider than a single event tab — schedule needs room for time chips on mobile. */
export const SCHEDULE_TAB_RAIL_W = 'w-[min(300px,85vw)] sm:w-[312px]';

const SURFACE =
  'rounded-2xl border border-dashed border-white/14 bg-white/[0.02] transition-colors duration-200 hover:border-white/22 hover:bg-white/[0.04]';

const CHIP_BASE =
  'snap-start shrink-0 flex flex-col justify-center rounded-xl border px-3 py-2.5 transition-colors duration-200 active:scale-[0.98]';
const CHIP_IDLE =
  'border-white/10 bg-transparent hover:border-white/18 hover:bg-white/[0.03]';
const CHIP_MORE =
  'border-dashed border-white/10 bg-transparent text-on-surface-variant hover:border-white/18 hover:text-zinc-300';

interface GroupedVenueScheduleCardProps {
  group: GroupedVenueSchedule;
  index?: number;
  /** `rail` = Coming up horizontal scroller; `fill` = full-width in events feed grid */
  layout?: 'rail' | 'fill';
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function lessonCapacity(lesson: ClassSession): number | null {
  const cap = lesson.maxParticipants ?? lesson.capacity;
  if (cap === null || cap <= 0) return null;
  return cap;
}

function lessonPriceEuros(lesson: ClassSession): number | null {
  if (lesson.priceCents > 0) return lesson.priceCents / 100;
  if (lesson.price > 0) return lesson.price;
  return null;
}

function peakTimeLabel(lessons: ClassSession[]): string | null {
  if (lessons.length === 0) return null;

  const hourBuckets = new Map<number, { count: number; sample: Date }>();
  for (const lesson of lessons) {
    const starts = asDate(lesson.startsAt);
    const hour = getZonedParts(starts).hour;
    const prev = hourBuckets.get(hour);
    hourBuckets.set(hour, {
      count: (prev?.count ?? 0) + 1,
      sample: prev?.sample ?? starts,
    });
  }

  let best: { count: number; sample: Date } | null = null;
  for (const entry of hourBuckets.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best ? formatLessonTime(best.sample) : null;
}

function pricePillLabel(lessons: ClassSession[]): string {
  const paid = lessons
    .map(lessonPriceEuros)
    .filter((v): v is number => v !== null && v > 0);
  const hasFree = lessons.some((l) => lessonPriceEuros(l) === null);

  if (paid.length === 0) return 'Permanentka';

  const min = Math.min(...paid);
  const formatted = min % 1 === 0 ? String(min) : min.toFixed(2).replace('.', ',');
  if (hasFree) return `Od ${formatted} €`;
  return `Od ${formatted} €`;
}

function distanceLabel(km: number): string | null {
  if (!Number.isFinite(km) || km < 0) return null;
  if (km < 0.1) return null;
  const rounded = km < 10 ? km.toFixed(1).replace('.', ',') : String(Math.round(km));
  return `${rounded} km`;
}

function spotsLabel(session: ClassSession): string | null {
  const cap = lessonCapacity(session);
  if (cap === null) return null;
  const left = Math.max(0, cap - session.registeredCount);
  if (left === 0) return 'Plné';
  if (left === 1) return '1 miesto';
  if (left <= 4) return `${left} miesta`;
  return `${left} miest`;
}

function TimeChipCarousel({
  group,
  limit,
  onOpenMore,
  onSelectLesson,
}: {
  group: GroupedVenueSchedule;
  limit?: number;
  onOpenMore: () => void;
  onSelectLesson: (lesson: ClassSession) => void;
}) {
  const lessons = limit ? group.lessons.slice(0, limit) : group.lessons;
  const remaining = limit ? Math.max(0, group.lessons.length - limit) : 0;

  return (
    <ul
      className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain touch-pan-x hide-scrollbar pb-0.5 -mx-0.5 px-0.5"
      aria-label="Najbližšie časy lekcií"
    >
      {lessons.map((lesson) => (
        <li key={lesson.id} className="snap-start">
          <button
            type="button"
            onClick={() => onSelectLesson(lesson)}
            className={`${CHIP_BASE} ${CHIP_IDLE} min-w-[5.25rem] max-w-[7rem] text-left ${
              asDate(lesson.startsAt).getTime() < Date.now() ? 'opacity-45' : ''
            }`}
          >
            <span className="font-headline-md text-[15px] leading-none tracking-tight text-white">
              {formatLessonTime(lesson.startsAt)}
            </span>
            <span className="mt-1 line-clamp-2 font-body-md text-[10px] leading-tight text-on-surface-variant">
              {lesson.title}
            </span>
          </button>
        </li>
      ))}
      {remaining > 0 ? (
        <li className="snap-start">
          <button
            type="button"
            onClick={onOpenMore}
            className={`${CHIP_BASE} ${CHIP_MORE} min-w-[3.75rem] items-center`}
          >
            <span className="font-headline-md text-[14px] leading-none">+{remaining}</span>
            <span className="mt-1 font-label-caps text-[8px] uppercase tracking-wider">ďalšie</span>
          </button>
        </li>
      ) : null}
    </ul>
  );
}

function ClassSessionRow({
  session,
  venueFallback,
  onSelect,
}: {
  session: ClassSession;
  venueFallback: string;
  onSelect: (session: ClassSession) => void;
}) {
  const host = displayVenueName(session.venueName, venueFallback);
  const spots = spotsLabel(session);
  const price = lessonPriceEuros(session);
  const priceText =
    price === null
      ? 'Permanentka'
      : `${price % 1 === 0 ? price : price.toFixed(2).replace('.', ',')} €`;
  const startsAt = asDate(session.startsAt);

  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      className={`group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-transparent px-3 py-2.5 text-left transition-colors duration-200 hover:border-white/18 hover:bg-white/[0.03] active:bg-white/[0.05] ${
        startsAt.getTime() < Date.now() ? 'opacity-45' : ''
      }`}
    >
      <time
        dateTime={startsAt.toISOString()}
        className="w-[3.5rem] shrink-0 text-left font-headline-md text-xl font-bold tabular-nums tracking-tight text-white leading-none sm:w-14"
      >
        {formatLessonTime(session.startsAt)}
      </time>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-headline-md text-[14px] font-semibold tracking-wide text-white sm:text-base">
          {session.title}
        </span>
        <span className="mt-0.5 block truncate font-body-md text-[13px] text-on-surface-variant">
          {host}
          <span className="text-on-surface-variant/70"> • </span>
          {priceText}
          {spots ? (
            <>
              <span className="text-on-surface-variant/70"> • </span>
              <span
                className={
                  spots === 'Plné' ? 'text-on-surface-variant' : 'text-primary-container/90'
                }
              >
                {spots}
              </span>
            </>
          ) : null}
        </span>
      </span>

      <ChevronRight
        className="h-4 w-4 shrink-0 text-on-surface-variant/70 transition-colors group-hover:text-on-surface-variant"
        strokeWidth={2}
        aria-hidden
      />
      <span className="sr-only">Otvoriť lekciu</span>
    </button>
  );
}

function ClassSessionTimeline({
  group,
  onSelect,
}: {
  group: GroupedVenueSchedule;
  onSelect: (session: ClassSession) => void;
}) {
  return (
    <ul className="flex flex-col gap-1.5" aria-label={`Lekcie — ${group.venueName}`}>
      {group.lessons.map((session) => (
        <li key={session.id}>
          <ClassSessionRow
            session={session}
            venueFallback={group.venueName}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}

export function GroupedVenueScheduleCard({
  group,
  index = 0,
  layout = 'fill',
}: GroupedVenueScheduleCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<ClassSession | null>(null);
  const panelId = useId();
  const title = groupedScheduleTitle(group);

  const peak = useMemo(() => peakTimeLabel(group.lessons), [group.lessons]);
  const distance = distanceLabel(group.distanceKm);
  const dayToken = shortScheduleDayLabel(group.dayLabel);
  const lekcieCount = slovakLekcieCountLabel(group.lessons.length);
  const pricePill = pricePillLabel(group.lessons);
  const location = group.city?.trim() || 'Bratislava';
  const lessonCount = group.lessons.length;
  const countMark = `${lessonCount}×`;
  const metaLine = [
    'Skupinové lekcie',
    location,
    distance,
    peak ? `od ${peak}` : null,
    pricePill,
  ]
    .filter(Boolean)
    .join(' • ');

  const openDrawer = () => setDrawerOpen(true);
  const toggleExpanded = () => setExpanded((v) => !v);
  const openLessonPreview = (lesson: ClassSession) => setPreviewLesson(lesson);

  const previewModal = previewLesson ? (
    <EventPreviewModal
      event={previewLesson}
      open
      onClose={() => setPreviewLesson(null)}
    />
  ) : null;

  if (layout === 'rail') {
    return (
      <>
        <motion.article
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 30,
            delay: Math.min(index, 8) * 0.03,
          }}
          className={`group relative ${SCHEDULE_TAB_RAIL_W} min-h-[168px] shrink-0 snap-start overflow-hidden ${SURFACE} active:bg-white/[0.05] sm:min-h-[180px]`}
          data-coming-up-tab
          data-grouped-venue-schedule
          aria-label={title}
        >
          <div className="relative z-10 flex h-full min-h-0 flex-col gap-2.5 p-3">
            <div className="flex items-start gap-2.5">
              <span className="flex w-[3.25rem] shrink-0 flex-col items-start gap-0.5">
                <span className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-primary-container/80">
                  Rozpis
                </span>
                <span className="font-headline-md text-lg font-bold tabular-nums tracking-tight text-white leading-none">
                  {countMark}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-label-caps text-[8px] uppercase tracking-[0.14em] text-on-surface-variant">
                  {dayToken} · športovisko
                </p>
                <h3 className="mt-0.5 truncate font-headline-md text-[14px] font-semibold tracking-wide text-white">
                  {group.venueName}
                </h3>
                <p className="mt-0.5 truncate font-body-md text-[12px] text-on-surface-variant">
                  {metaLine}
                </p>
              </div>
              <button
                type="button"
                onClick={openDrawer}
                className="inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-dashed border-white/14 px-2 py-1.5 font-label-caps text-[9px] uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:border-white/22 hover:bg-white/[0.03] hover:text-zinc-200"
              >
                Lekcie
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
            <div className="mt-auto min-h-0">
              <TimeChipCarousel
                group={group}
                limit={4}
                onOpenMore={openDrawer}
                onSelectLesson={openLessonPreview}
              />
            </div>
          </div>
        </motion.article>

        <VenueScheduleDrawer
          group={group}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
        {previewModal}
      </>
    );
  }

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30, delay: Math.min(index, 8) * 0.03 }}
        className={`group/schedule relative w-full overflow-hidden ${SURFACE}`}
        data-grouped-venue-schedule
        data-expanded={expanded ? 'true' : 'false'}
        aria-label={title}
      >
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-200 active:bg-white/[0.05] sm:gap-3.5 sm:px-3.5"
        >
          <span className="flex w-[3.5rem] shrink-0 flex-col items-start gap-0.5 sm:w-14">
            <span className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-primary-container/85">
              Rozpis
            </span>
            <span className="font-headline-md text-xl font-bold tabular-nums tracking-tight text-white leading-none">
              {countMark}
            </span>
          </span>

          <span
            className="material-symbols-outlined shrink-0 text-[22px] text-primary-container/85"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            aria-hidden
          >
            location_on
          </span>

          <span className="min-w-0 flex-1">
            <span className="mb-0.5 flex items-center gap-1.5">
              <span className="font-label-caps text-[8px] uppercase tracking-[0.14em] text-on-surface-variant">
                {dayToken} · športovisko
              </span>
            </span>
            <span className="block truncate font-headline-md text-base font-semibold tracking-wide text-white">
              {group.venueName}
            </span>
            <span className="mt-0.5 block truncate font-body-md text-[13px] text-on-surface-variant">
              {metaLine}
            </span>
          </span>

          <ChevronDown
            className={`h-4 w-4 shrink-0 text-on-surface-variant/70 transition-all duration-200 group-hover:text-on-surface-variant ${
              expanded ? 'rotate-180' : ''
            }`}
            strokeWidth={2}
            aria-hidden
          />
        </button>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              id={panelId}
              key="schedule-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-white/10"
            >
              <div className="space-y-2 px-3 pb-3 pt-2.5 sm:px-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="inline-flex min-w-0 items-center gap-1.5 truncate font-body-md text-[11px] text-on-surface-variant">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    <span className="truncate">
                      {dayToken} · {lekcieCount}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={openDrawer}
                    className="inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-white/10 px-2 py-1 font-label-caps text-[9px] uppercase tracking-[0.12em] text-on-surface-variant transition-colors hover:border-white/18 hover:bg-white/[0.03] hover:text-zinc-200"
                  >
                    Celý rozpis
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
                <ClassSessionTimeline group={group} onSelect={openLessonPreview} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.article>

      <VenueScheduleDrawer
        group={group}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      {previewModal}
    </>
  );
}
