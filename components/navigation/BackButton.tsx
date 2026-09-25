'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useT } from '@/components/i18n/LocaleProvider';

/** Routes where back would be noise (root / auth). */
const HIDDEN = new Set(['/', '/login']);

/**
 * Floating back control — replaces the thumb launcher menu.
 * Sits a bit above the old FAB so it clears home content / safe area.
 */
export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  if (HIDDEN.has(pathname) || pathname.startsWith('/login')) {
    return null;
  }

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  }

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[82] flex flex-col items-end pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] md:bottom-24 md:right-6">
      <button
        type="button"
        aria-label={t('common.back')}
        onClick={goBack}
        className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-primary-container/35 bg-[#1a1919] text-primary-container shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition-[transform,border-color,background-color] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary hover:border-primary-container/50 hover:bg-primary-container/10"
      >
        <span className="material-symbols-outlined text-[26px]" aria-hidden>
          arrow_back
        </span>
      </button>
    </div>
  );
}
