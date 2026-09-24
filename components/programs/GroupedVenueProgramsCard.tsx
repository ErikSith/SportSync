'use client';

import { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { EventCardData } from '@/lib/data/events';
import type { ProgramsFeedTab } from '@/lib/programs/classify';
import { classifyProgram, type ProgramBucket } from '@/lib/programs/classify';
import {
  programTabEyebrow,
  slovakProgramCountLabel,
  type GroupedVenuePrograms,
} from '@/lib/programs/group-by-venue';
import { EventListItem } from '@/components/events/EventListItem';
import { useT } from '@/components/i18n/LocaleProvider';

const TEAL = '#2DD4BF';

const SURFACE =
  'rounded-2xl border border-teal-400/20 bg-[#14201e]/transition-colors duration-200 hover:border-teal-400/35 hover:bg-[#172623]';

function BucketBadge({ bucket }: { bucket: ProgramBucket }) {
  const t = useT();
  const label =
    bucket === 'camps'
      ? t('home.programs.campBadge')
      : bucket === 'workshops'
        ? t('home.programs.workshopBadge')
        : t('home.programs.courseBadge');
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-label-caps text-[9px] uppercase tracking-wide text-[#0b1f1c]"
      style={{ backgroundColor: TEAL }}
    >
      {label}
    </span>
  );
}

function priceFromLabel(events: EventCardData[]): string | null {
  const paid = events
    .map((e) => {
      if (e.priceCents > 0) return e.priceCents / 100;
      if (e.price > 0) return e.price;
      return null;
    })
    .filter((v): v is number => v !== null && v > 0);
  const hasFree = events.some(
    (e) => !(e.priceCents > 0) && !(e.price > 0),
  );
  if (paid.length === 0) return hasFree ? 'FREE' : null;
  const min = Math.min(...paid);
  const formatted = min % 1 === 0 ? String(min) : min.toFixed(2).replace('.', ',');
  return paid.length > 1 || hasFree ? `Od ${formatted} €` : `${formatted} €`;
}

function distanceLabel(km: number): string | null {
  if (!Number.isFinite(km) || km < 0.1) return null;
  const rounded = km < 10 ? km.toFixed(1).replace('.', ',') : String(Math.round(km));
  return `${rounded} km`;
}

interface GroupedVenueProgramsCardProps {
  group: GroupedVenuePrograms;
  tab: ProgramsFeedTab;
  index?: number;
  /** Open expanded on first render (e.g. only one venue in the feed). */
  defaultExpanded?: boolean;
}

export function GroupedVenueProgramsCard({
  group,
  tab,
  index = 0,
  defaultExpanded = false,
}: GroupedVenueProgramsCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const eyebrow = programTabEyebrow(tab);
  const countLabel = slovakProgramCountLabel(group.events.length, tab);
  const countMark = `${group.events.length}×`;
  const kidsCount = group.events.filter((e) => e.forKids).length;
  const price = priceFromLabel(group.events);
  const distance = distanceLabel(group.distanceKm);
  const location = group.city?.trim() || 'Bratislava';

  const metaLine = useMemo(
    () =>
      [
        countLabel,
        location,
        distance,
        kidsCount > 0 ? 'Pre deti' : null,
        price,
      ]
        .filter(Boolean)
        .join(' • '),
    [countLabel, distance, kidsCount, location, price],
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 420,
        damping: 30,
        delay: Math.min(index, 8) * 0.03,
      }}
      className={`group/programs relative w-full overflow-hidden ${SURFACE}`}
      data-grouped-venue-programs
      data-expanded={expanded ? 'true' : 'false'}
      aria-label={`${group.venueName} — ${countLabel}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-200 active:bg-teal-400/[0.06] sm:gap-3.5 sm:px-3.5"
      >
        <span className="flex w-[3.5rem] shrink-0 flex-col items-start gap-0.5 sm:w-14">
          <span
            className="font-label-caps text-[9px] uppercase tracking-[0.12em]"
            style={{ color: TEAL }}
          >
            {eyebrow}
          </span>
          <span className="font-headline-md text-xl font-bold tabular-nums tracking-tight leading-none text-white">
            {countMark}
          </span>
        </span>

        <span
          className="material-symbols-outlined shrink-0 text-[22px]"
          style={{
            color: TEAL,
            fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
          }}
          aria-hidden
        >
          location_on
        </span>

        <span className="min-w-0 flex-1">
          <span className="mb-0.5 flex items-center gap-1.5">
            <span className="font-label-caps text-[8px] uppercase tracking-[0.14em] text-zinc-500">
              Športovisko
            </span>
          </span>
          <span className="block truncate font-headline-md text-base font-semibold tracking-wide text-white">
            {group.venueName}
          </span>
          <span className="mt-0.5 block truncate font-body-md text-[13px] text-zinc-400">
            {metaLine}
          </span>
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-all duration-200 group-hover:text-zinc-300 ${
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
            key="programs-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-teal-400/15"
          >
            <ul
              className="flex flex-col gap-1.5 px-2.5 pb-2.5 pt-2 sm:px-3"
              aria-label={`${countLabel} — ${group.venueName}`}
            >
              {group.events.map((event) => {
                const bucket = classifyProgram(event);
                return (
                  <li key={event.id} className="relative min-w-0">
                    {bucket ? (
                      <div className="pointer-events-none absolute right-3 top-3 z-10">
                        <BucketBadge bucket={bucket} />
                      </div>
                    ) : null}
                    <div className="[&_[data-event-list-item]]:border-teal-400/10 [&_[data-event-list-item]]:hover:border-teal-400/25">
                      <EventListItem event={event} hideVenue />
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}
