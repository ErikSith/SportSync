'use client';

import { motion } from 'framer-motion';
import { useT } from '@/components/i18n/LocaleProvider';
import { HomeFeedPreferencesAside } from '@/components/home/HomeFeedFilterButton';
import type { HomeFilterVenue } from '@/lib/data/homepage';

interface CockpitHeaderProps {
  displayName: string;
  city: string;
  venues?: HomeFilterVenue[];
}

export function CockpitHeader({ displayName, city, venues = [] }: CockpitHeaderProps) {
  const t = useT();

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-2.5"
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-label-caps text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">
          {t('home.welcomeBack')}
        </p>
        <h1 className="truncate font-headline-md text-[22px] leading-tight tracking-wide text-on-surface md:text-[26px]">
          {displayName}
        </h1>
      </div>

      <div className="shrink-0">
        <HomeFeedPreferencesAside venues={venues} city={city} />
      </div>
    </motion.header>
  );
}
