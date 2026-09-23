'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { EventCardData } from '@/lib/data/events';
import { SportLabel } from '@/components/shared/SportLabel';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';
import { ListingCover } from '@/components/shared/ListingCover';
import { useT } from '@/components/i18n/LocaleProvider';

function formatWhen(date: Date, timeKnown: boolean): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const day = isToday
    ? 'Dnes'
    : isTomorrow
      ? 'Zajtra'
      : date.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' });
  if (!timeKnown) return day;
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${day} · ${time}`;
}

function distanceLabel(km: number): string {
  if (km <= 0) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function NearYouRow({ event, index }: { event: EventCardData; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04, duration: 0.25 }}
        onClick={() => setOpen(true)}
        className={[
          'group flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#1F1F1F] p-2.5 text-left',
          'transition hover:border-[#FF5722]/35 hover:bg-[#262626] active:scale-[0.99]',
        ].join(' ')}
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/[0.06]">
          <ListingCover className="h-full w-full object-cover" src={event.coverUrl} alt="" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-headline-md text-[14px] font-semibold text-on-surface group-hover:text-white">
            {event.title}
          </h4>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 font-body-md text-[11px] text-on-surface-variant">
            <span className="shrink-0 text-[#FF5722]">{formatWhen(event.startsAt, event.timeKnown)}</span>
            <span className="shrink-0 text-white/20">·</span>
            <span className="truncate">{event.venueName ?? event.city}</span>
          </div>
          <div className="mt-1">
            <SportLabel
              sport={event.sport}
              title={event.title}
              iconSize={12}
              labelClassName="font-label-caps text-[9px] uppercase tracking-wide text-on-surface-variant"
            />
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[#FF5722]/30 bg-[#FF5722]/10 px-2 py-1 font-label-caps text-[10px] uppercase tracking-wide text-[#FF5722]">
          {distanceLabel(event.distanceKm)}
        </span>
      </motion.button>
      <EventPreviewModal event={event} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

interface NearYouListProps {
  events: EventCardData[];
}

export function NearYouList({ events }: NearYouListProps) {
  const t = useT();
  if (events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => a.distanceKm - b.distanceKm || a.startsAt.getTime() - b.startsAt.getTime(),
  );

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-headline-md text-[15px] text-on-surface md:text-headline-md">
            <span className="material-symbols-outlined text-[#FF5722]" aria-hidden>
              near_me
            </span>
            {t('home.nearYou')}
          </h3>
          <p className="mt-0.5 pl-8 font-body-md text-sm text-on-surface-variant">
            {t('home.nearYouSub')}
          </p>
        </div>
        <Link
          href="/events"
          className="group shrink-0 font-label-caps text-[10px] uppercase tracking-[0.12em] text-[#FF5722] hover:brightness-110"
        >
          {t('common.viewAll')}{' '}
          <span className="inline-block transition-transform group-hover:translate-x-0.5">›</span>
        </Link>
      </div>
      <div className="space-y-2">
        {sorted.slice(0, 6).map((event, index) => (
          <NearYouRow key={event.id} event={event} index={index} />
        ))}
      </div>
    </section>
  );
}
