import { t } from '@/lib/i18n/server';

interface PrivateAccountPanelProps {
  displayName: string;
}

/** Own-account only - minimal private header. */
export function PrivateAccountPanel({ displayName }: PrivateAccountPanelProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-surface-container/70 px-4 py-5">
      <div className="space-y-1.5">
        <p className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
          {t('profile.privateBadge')}
        </p>
        <h1 className="font-headline-md text-[1.45rem] leading-tight tracking-wide text-on-surface md:text-[1.75rem]">
          {displayName}
        </h1>
      </div>
    </section>
  );
}
