'use client';

import { trackSignal } from '@/lib/telemetry/track';
import { useIsGuest } from '@/lib/auth/use-is-guest';
import { useAuthModal } from '@/components/auth/AuthModalProvider';

interface TournamentExternalCtaProps {
  tournamentId: string;
  sourceUrl: string;
  sourceName?: string | null;
  /** `compact` = modal / sheet CTAs */
  variant?: 'default' | 'compact';
  label?: string;
}

export function TournamentExternalCta({
  tournamentId,
  sourceUrl,
  sourceName,
  variant = 'default',
  label = 'Oficiálna stránka / Registrácia ↗',
}: TournamentExternalCtaProps) {
  const { isGuest } = useIsGuest();
  const { openAuthModal } = useAuthModal();
  const compact = variant === 'compact';
  const className = compact
    ? 'relative z-10 flex w-full touch-auto items-center justify-center gap-2 rounded-xl py-3.5 font-label-caps text-[12px] uppercase tracking-[0.16em] text-[#14120e] transition-all active:scale-[0.98]'
    : 'relative z-10 flex w-full touch-auto md:w-auto items-center justify-center gap-2 font-headline-md text-headline-md py-4 px-10 rounded-lg transition-all shadow-2xl active:scale-[0.98] font-bold tracking-wide text-[#14120e]';

  const style = {
    background: 'linear-gradient(135deg, #c4a035 0%, #e8d59a 55%, #c4a035 100%)',
    border: '1px solid rgba(196, 160, 53, 0.45)',
  };

  function openOfficialSite() {
    trackSignal('tournament.external_redirect', {
      tournamentId,
      sourceName: sourceName ?? null,
    });
    // Same-tab navigation is reliable on mobile Safari; target=_blank is often blocked in WebViews.
    window.location.assign(sourceUrl);
  }

  function handleClick() {
    if (isGuest) {
      openAuthModal({
        mode: 'sign-up',
        redirectTo: null,
        onAuthenticated: openOfficialSite,
      });
      return;
    }
    openOfficialSite();
  }

  return (
    <button type="button" className={className} style={style} onClick={handleClick}>
      {label}
      {!compact && (
        <span className="material-symbols-outlined text-[20px]" aria-hidden>
          open_in_new
        </span>
      )}
    </button>
  );
}
