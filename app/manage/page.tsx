import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { getOwnedVenuesForProfile } from '@/lib/data/organizer-venues';
import { getOrganizerUpcomingContent } from '@/lib/data/organizer-dashboard';
import { TopAppBar } from '@/components/home/TopAppBar';
import { ManageCreateTabs } from '@/components/manage/ManageCreateTabs';
import { ManageNavList, ManageSection, type ManageNavItem } from '@/components/manage/ManageNavList';
import { t } from '@/lib/i18n/server';
import { loginHref } from '@/lib/auth/login-href';

export const runtime = 'edge';

function formatDateTime(date: Date): string {
  return date.toLocaleString('sk-SK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function ManagePage() {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  if (viewer.isGuest) {
    redirect(loginHref('/manage', { mode: 'sign-up' }));
  }

  const { profile } = viewer;

  if (!canAccessManageHub(profile.role)) {
    redirect('/');
  }

  const [venues, upcoming] = await Promise.all([
    // Only venues this account owns — never the city-wide directory.
    getOwnedVenuesForProfile(profile.id),
    getOrganizerUpcomingContent(profile.id),
  ]);

  const displayName = profile.fullName ?? profile.username;
  const venueEyebrow =
    venues.length === 0
      ? t('manage.venuePending')
      : venues.length === 1
        ? venues[0]!.name
        : `${venues[0]!.name} · +${venues.length - 1}`;
  const soon = t('common.comingSoon');

  const upcomingItems: ManageNavItem[] =
    upcoming.length === 0
      ? [
          {
            key: 'upcoming-empty',
            icon: 'upcoming',
            label: t('manage.upcomingEmpty'),
            hint: t('manage.upcomingEmptyHint'),
            accent: 'primary',
          },
        ]
      : upcoming.map((item) => ({
          key: `${item.kind}-${item.id}`,
          href: item.href,
          icon: item.kind === 'tournament' ? 'emoji_events' : 'event',
          label: item.title,
          hint: `${item.kind} · ${item.sport} · ${formatDateTime(item.startsAt)}`,
          accent: item.kind === 'tournament' ? ('secondary' as const) : ('primary' as const),
        }));

  return (
    <>
      <TopAppBar avatarUrl={profile.avatarUrl} name={displayName} />

      <main className="relative z-10 mx-auto flex max-w-lg flex-col gap-6 px-container-margin-mobile pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:max-w-xl md:gap-7 md:pt-28">
        <div className="space-y-3">
          <Link
            href="/profile/settings"
            className="inline-flex items-center gap-1 text-on-surface-variant transition-colors hover:text-primary-container"
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            <span className="font-label-caps text-[10px] uppercase">{t('profile.settings')}</span>
          </Link>

          <div className="space-y-1.5 px-0.5">
            <p className="font-label-caps text-[10px] uppercase tracking-widest text-secondary">
              {venueEyebrow}
            </p>
            <h1 className="font-headline-md text-[1.45rem] leading-tight tracking-wide text-on-surface md:text-[1.75rem]">
              {t('manage.title')}
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant">{displayName}</p>
            <p className="pt-0.5 font-body-md text-sm leading-relaxed text-on-surface-variant">
              {t('manage.subtitle')}
            </p>
          </div>
        </div>

        <ManageCreateTabs venues={venues} />

        <ManageSection title={t('manage.section.upcoming')}>
          <ManageNavList items={upcomingItems} comingSoonLabel={soon} />
        </ManageSection>
      </main>
    </>
  );
}
