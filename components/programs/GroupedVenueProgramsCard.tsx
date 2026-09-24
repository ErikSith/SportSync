'use client';

import { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { EventCardData } from '@/lib/data/events';
import type { ProgramsFeedTab } from '@/lib/programs/classify';
import {
  slovakProgramCountLabel,
  type GroupedVenuePrograms,
} from '@/lib/programs/group-by-venue';
import {
  alignStartsAtWithCopyTime,
  formatAppDayRangeLabel,
  formatAppTime,
} from '@/lib/datetime/bratislava';
import { EventListItem } from '@/components/events/EventListItem';

const TEAL = '#2DD4BF';

const SURFACE =
  'rounded-2xl border border-teal-400/18 bg-[#151a18] transition-colors duration-200 hover:border-teal-400/32 hover:shadow-[0_10px_24px_rgba(45,212,191,0.06)]';

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
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

/** Earliest program in the venue group — drives the left date column. */
function leadProgramWhen(events: EventCardData[]): {
  startsAt: Date;
  day: string;
  time: string | null;
} | null {
  const lead = events[0];
  if (!lead) return null;
  const timeKnown = lead.timeKnown !== false;
  const startsAt = timeKnown
    ? alignStartsAtWithCopyTime(asDate(lead.startsAt), lead.description)
    : asDate(lead.startsAt);
  return {
    startsAt,
    day: formatAppDayRangeLabel(startsAt, lead.endsAt),
    time: timeKnown ? formatAppTime(startsAt) : null,
  };
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
  const countLabel = slovakProgramCountLabel(group.events.length, tab);
  const when = leadProgramWhen(group.events);
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

  const whenLabel = when
    ? when.time
      ? `${when.day} ${when.time}`
      : when.day
    : countLabel;

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
      aria-label={`${group.venueName} — ${whenLabel} — ${countLabel}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-200 active:bg-teal-400/[0.06] sm:gap-3.5 sm:px-3.5"
      >
        <span className="flex w-[3.5rem] shrink-0 flex-col items-start gap-0.5 sm:w-14">
          {when?.time ? (
            <>
              <span
                className="font-label-caps text-[9px] uppercase tracking-[0.12em]"
                style={{ color: TEAL }}
              >
                {when.day}
              </span>
              <time
                dateTime={when.startsAt.toISOString()}
                className="font-headline-md text-xl font-bold tabular-nums tracking-tight leading-none text-white"
              >
                {when.time}
              </time>
            </>
          ) : when ? (
            <time
              dateTime={when.startsAt.toISOString().slice(0, 10)}
              className="font-headline-md text-xl font-bold tracking-tight leading-none text-white"
            >
              {when.day}
            </time>
          ) : (
            <span className="font-headline-md text-xl font-bold tabular-nums tracking-tight leading-none text-white">
              {group.events.length}×
            </span>
          )}
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
              {group.events.map((event) => (
                <li key={event.id} className="relative min-w-0">
                  <div className="[&_[data-event-list-item]]:border-teal-400/10 [&_[data-event-list-item]]:hover:border-teal-400/25">
                    <EventListItem event={event} hideVenue />
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}
