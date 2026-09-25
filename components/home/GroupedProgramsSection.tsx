'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { EventCardData } from '@/lib/data/events';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';
import { ListingCover } from '@/components/shared/ListingCover';
import { useT } from '@/components/i18n/LocaleProvider';
import { classifyProgram, type ProgramBucket } from '@/lib/programs/classify';
import type { MessageKey } from '@/lib/i18n/messages';

function ProgramCard({
  event,
  index,
  badge,
  accentClass,
}: {
  event: EventCardData;
  index: number;
  badge: string;
  accentClass: string;
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
        className={`group flex w-[min(220px,72vw)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-[#1F1F1F] text-left transition ${accentClass}`}
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

const HUBS: Array<{
  bucket: ProgramBucket;
  href: string;
  icon: string;
  titleKey: MessageKey;
  subKey: MessageKey;
  badgeKey: MessageKey;
  borderClass: string;
  linkClass: string;
  iconClass: string;
}> = [
  {
    bucket: 'workshops',
    href: '/workshopy',
    icon: 'school',
    titleKey: 'home.hub.workshops',
    subKey: 'home.hub.workshopsSub',
    badgeKey: 'home.programs.workshopBadge',
    borderClass: 'border-teal-400/20 hover:border-teal-400/45',
    linkClass: 'text-teal-300 hover:text-teal-200',
    iconClass: 'text-teal-300',
  },
  {
    bucket: 'camps',
    href: '/tabory',
    icon: 'camping',
    titleKey: 'home.hub.camps',
    subKey: 'home.hub.campsSub',
    badgeKey: 'home.programs.campBadge',
    borderClass: 'border-emerald-400/20 hover:border-emerald-400/45',
    linkClass: 'text-emerald-300 hover:text-emerald-200',
    iconClass: 'text-emerald-300',
  },
  {
    bucket: 'courses',
    href: '/kruzky',
    icon: 'menu_book',
    titleKey: 'home.hub.courses',
    subKey: 'home.hub.coursesSub',
    badgeKey: 'home.programs.courseBadge',
    borderClass: 'border-[#c4a882]/20 hover:border-[#c4a882]/45',
    linkClass: 'text-[#d4b896] hover:text-[#e0c9a8]',
    iconClass: 'text-[#d4b896]',
  },
];

interface GroupedProgramsSectionProps {
  events: EventCardData[];
}

/** Three peer Rýchle akcie hubs — workshopy / tábory / krúžky (no programs umbrella). */
export function GroupedProgramsSection({ events }: GroupedProgramsSectionProps) {
  const t = useT();

  const byBucket = useMemo(() => {
    const map: Record<ProgramBucket, EventCardData[]> = {
      camps: [],
      courses: [],
      workshops: [],
    };
    const seen = new Set<string>();

    for (const event of events) {
      if (seen.has(event.id)) continue;
      const bucket = classifyProgram(event);
      if (!bucket) continue;
      seen.add(event.id);
      if (map[bucket].length < 8) map[bucket].push(event);
    }

    return map;
  }, [events]);

  const visible = HUBS.filter((hub) => byBucket[hub.bucket].length > 0);
  if (visible.length === 0) return null;

  return (
    <div className="space-y-8">
      {visible.map((hub) => {
        const list = byBucket[hub.bucket];
        return (
          <section key={hub.bucket} className="space-y-2.5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-headline-md text-[15px] text-on-surface md:text-headline-md">
                  <span className={`material-symbols-outlined ${hub.iconClass}`} aria-hidden>
                    {hub.icon}
                  </span>
                  {t(hub.titleKey)}
                </h3>
                <p className="mt-0.5 pl-8 font-body-md text-sm text-on-surface-variant">
                  {t(hub.subKey)}
                </p>
              </div>
              <Link
                href={hub.href}
                className={`shrink-0 font-label-caps text-[10px] uppercase tracking-[0.12em] ${hub.linkClass}`}
              >
                {t('common.viewAll')}
              </Link>
            </div>
            <div
              className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto hide-scrollbar -mx-container-margin-mobile px-container-margin-mobile md:mx-0 md:px-0"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {list.map((event, index) => (
                <ProgramCard
                  key={event.id}
                  event={event}
                  index={index}
                  badge={t(hub.badgeKey)}
                  accentClass={hub.borderClass}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
