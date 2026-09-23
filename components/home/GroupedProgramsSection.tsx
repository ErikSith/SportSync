'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { EventCardData } from '@/lib/data/events';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';
import { ListingCover } from '@/components/shared/ListingCover';
import { useT } from '@/components/i18n/LocaleProvider';
import { classifyProgram, type ProgramBucket } from '@/lib/programs/classify';

function ProgramCard({
  event,
  index,
  badge,
}: {
  event: EventCardData;
  index: number;
  badge: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.25 }}
        onClick={() => setOpen(true)}
        className="group flex w-[min(220px,72vw)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-teal-400/20 bg-[#1F1F1F] text-left transition hover:border-teal-400/45"
      >
        <div className="relative h-28 overflow-hidden">
          <ListingCover
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            src={event.coverUrl}
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
          <span className="absolute left-2 top-2 rounded-full bg-teal-400 px-2 py-0.5 font-label-caps text-[9px] uppercase tracking-wide text-[#0b1f1c]">
            {badge}
          </span>
        </div>
        <div className="space-y-1 p-3">
          <h4 className="line-clamp-2 font-headline-md text-[13px] font-semibold leading-snug text-on-surface">
            {event.title}
          </h4>
          <p className="truncate font-body-md text-[11px] text-on-surface-variant">
            {event.venueName ?? event.city}
          </p>
        </div>
      </motion.button>
      <EventPreviewModal event={event} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

interface GroupedProgramsSectionProps {
  events: EventCardData[];
}

export function GroupedProgramsSection({ events }: GroupedProgramsSectionProps) {
  const t = useT();

  const { camps, courses, workshops } = useMemo(() => {
    const campsList: EventCardData[] = [];
    const coursesList: EventCardData[] = [];
    const workshopsList: EventCardData[] = [];
    const seen = new Set<string>();

    for (const event of events) {
      if (seen.has(event.id)) continue;
      const bucket: ProgramBucket | null = classifyProgram(event);
      if (!bucket) continue;
      seen.add(event.id);
      if (bucket === 'camps') campsList.push(event);
      else if (bucket === 'workshops') workshopsList.push(event);
      else coursesList.push(event);
    }

    return {
      camps: campsList.slice(0, 8),
      courses: coursesList.slice(0, 8),
      workshops: workshopsList.slice(0, 8),
    };
  }, [events]);

  if (camps.length === 0 && courses.length === 0 && workshops.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-headline-md text-[15px] text-on-surface md:text-headline-md">
            <span className="material-symbols-outlined text-teal-300" aria-hidden>
              camping
            </span>
            {t('home.programs')}
          </h3>
          <p className="mt-0.5 pl-8 font-body-md text-sm text-on-surface-variant">
            {t('home.programsSub')}
          </p>
        </div>
        <Link
          href="/programs"
          className="shrink-0 font-label-caps text-[10px] uppercase tracking-[0.12em] text-teal-300 hover:text-teal-200"
        >
          {t('common.viewAll')}
        </Link>
      </div>

      {workshops.length > 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
              {t('home.programs.workshops')}
            </p>
            <Link
              href="/programs"
              className="font-label-caps text-[9px] uppercase tracking-wider text-teal-400/80 hover:text-teal-300"
            >
              {t('common.viewAll')}
            </Link>
          </div>
          <div
            className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto hide-scrollbar -mx-container-margin-mobile px-container-margin-mobile md:mx-0 md:px-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {workshops.map((event, index) => (
              <ProgramCard
                key={event.id}
                event={event}
                index={index}
                badge={t('home.programs.workshopBadge')}
              />
            ))}
          </div>
        </div>
      ) : null}

      {camps.length > 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
              {t('home.programs.camps')}
            </p>
            <Link
              href="/programs?tab=camps"
              className="font-label-caps text-[9px] uppercase tracking-wider text-teal-400/80 hover:text-teal-300"
            >
              {t('common.viewAll')}
            </Link>
          </div>
          <div
            className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto hide-scrollbar -mx-container-margin-mobile px-container-margin-mobile md:mx-0 md:px-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {camps.map((event, index) => (
              <ProgramCard
                key={event.id}
                event={event}
                index={index}
                badge={t('home.programs.campBadge')}
              />
            ))}
          </div>
        </div>
      ) : null}

      {courses.length > 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
              {t('home.programs.courses')}
            </p>
            <Link
              href="/programs?tab=courses"
              className="font-label-caps text-[9px] uppercase tracking-wider text-teal-400/80 hover:text-teal-300"
            >
              {t('common.viewAll')}
            </Link>
          </div>
          <div
            className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto hide-scrollbar -mx-container-margin-mobile px-container-margin-mobile md:mx-0 md:px-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {courses.map((event, index) => (
              <ProgramCard
                key={event.id}
                event={event}
                index={index}
                badge={t('home.programs.courseBadge')}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
