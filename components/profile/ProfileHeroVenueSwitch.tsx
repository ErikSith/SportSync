'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/components/i18n/LocaleProvider';
import { canAccessManageHub } from '@/lib/auth/tournament-access';

interface ProfileHeroVenueSwitchProps {
  role: string;
}

/**
 * Same logged-in account — opens venue manage hub.
 * No auth switch; TopAppBar avatar stays this user.
 */
export function ProfileHeroVenueSwitch({ role }: ProfileHeroVenueSwitchProps) {
  const t = useT();
  const pathname = usePathname();

  if (!canAccessManageHub(role)) return null;
  if (pathname === '/manage' || pathname.startsWith('/manage/')) return null;

  return (
    <div className="pt-1.5">
      <Link
        href="/manage"
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-secondary/35 bg-secondary/10 px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-[0.1em] text-secondary transition-transform active:scale-[0.97] hover:border-secondary/55 hover:bg-secondary/15"
      >
        <span className="material-symbols-outlined text-[15px]">stadium</span>
        {t('profile.openManage')}
      </Link>
    </div>
  );
}
