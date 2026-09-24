'use client';

import { trackSignal } from '@/lib/telemetry/track';
import { useIsGuest } from '@/lib/auth/use-is-guest';
import { useAuthModal } from '@/components/auth/AuthModalProvider';

interface EventExternalCtaProps {
  eventId: string;
  sourceUrl: string;
  sourceName?: string | null;
  /** `compact` = modal / sheet CTAs */
  variant?: 'default' | 'compact';
  label?: string;
}

export function EventExternalCta({
  eventId,
  sourceUrl,
  sourceName,
  variant = 'default',
  label = 'Oficiálna stránka / Registrácia ↗',
}: EventExternalCtaProps) {
  const { isGuest } = useIsGuest();
  const { openAuthModal } = useAuthModal();
  const compact = variant === 'compact';
  const className = compact
    ? 'relative z-10 flex w-full touch-auto items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 font-label-caps text-[12px] uppercase tracking-[0.16em] text-on-secondary transition-colors hover:bg-secondary-fixed-dim'
    : 'relative z-10 flex w-full touch-auto md:w-auto items-center justify-center gap-2 bg-secondary text-on-secondary font-headline-md text-headline-md py-4 px-10 rounded-lg hover:bg-secondary-fixed-dim transition-all shadow-2xl border border-secondary/40 active:scale-[0.98] font-bold tracking-wide';

  function openOfficialSite() {
    trackSignal('event.external_redirect', {
      eventId,
      sourceName: sourceName ?? null,
    });
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
  }

  function handleClick(e: React.MouseEvent) {
    if (isGuest) {
      e.preventDefault();
      openAuthModal({
        mode: 'sign-up',
        redirectTo: null,
        onAuthenticated: openOfficialSite,
      });
      return;
    }
    // Let the <a> navigate; still track.
    trackSignal('event.external_redirect', {
      eventId,
      sourceName: sourceName ?? null,
    });
  }

  if (isGuest) {
    return (
      <button type="button" className={className} onClick={handleClick}>
        {label}
        {!compact && (
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            open_in_new
          </span>
        )}
      </button>
    );
  }

  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={handleClick}
    >
      {label}
      {!compact && (
        <span className="material-symbols-outlined text-[20px]" aria-hidden>
          open_in_new
        </span>
      )}
    </a>
  );
}
