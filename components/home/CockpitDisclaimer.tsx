'use client';

import { useT } from '@/components/i18n/LocaleProvider';

export function CockpitDisclaimer() {
  const t = useT();

  return (
    <footer className="rounded-2xl border border-white/[0.06] bg-[#1F1F1F]/80 px-4 py-3.5">
      <p className="flex items-start gap-2.5 font-body-md text-[12px] leading-relaxed text-on-surface-variant">
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-[#FF5722]/80" aria-hidden>
          info
        </span>
        <span>{t('home.disclaimer')}</span>
      </p>
    </footer>
  );
}
