import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import type { ProgramBucket } from '@/lib/programs/classify';
import { t } from '@/lib/i18n/server';

export const runtime = 'edge';

interface CreateProgramPageProps {
  searchParams: { kind?: string; venueId?: string };
}

const KIND_META: Record<
  ProgramBucket,
  { titleKey: 'manage.create.camp' | 'manage.create.workshop' | 'manage.create.course'; icon: string }
> = {
  camps: { titleKey: 'manage.create.camp', icon: 'camping' },
  workshops: { titleKey: 'manage.create.workshop', icon: 'school' },
  courses: { titleKey: 'manage.create.course', icon: 'menu_book' },
};

function parseKind(raw: string | undefined): ProgramBucket | null {
  if (raw === 'camps' || raw === 'workshops' || raw === 'courses') return raw;
  return null;
}

/**
 * Stub shell for kids camps / workshops / courses.
 * Hub links land here so we can wire AI creators later without changing navigation.
 */
export default async function CreateProgramPage({ searchParams }: CreateProgramPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  if (viewer.isGuest) {
    return (
      <main className="mx-auto max-w-lg px-container-margin-mobile pt-24 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t('manage.guestBlocked')}
        </p>
      </main>
    );
  }

  if (!canAccessManageHub(viewer.profile.role)) {
    redirect('/');
  }

  const kind = parseKind(searchParams.kind) ?? 'camps';
  const meta = KIND_META[kind];

  return (
    <main className="relative z-10 mx-auto flex max-w-lg flex-col gap-5 px-container-margin-mobile pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:pt-28">
      <Link
        href="/manage"
        className="inline-flex items-center gap-1 text-on-surface-variant transition-colors hover:text-primary-container"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        <span className="font-label-caps text-[10px] uppercase">{t('common.back')}</span>
      </Link>

      <div className="space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-400/15 text-teal-300">
          <span className="material-symbols-outlined text-[26px]">{meta.icon}</span>
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface">{t(meta.titleKey)}</h1>
        <p className="font-body-md text-sm leading-relaxed text-on-surface-variant">
          {t('manage.programStub.body')}
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/8 bg-surface-container p-5">
        <p className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
          {t('common.comingSoon')}
        </p>
        <p className="font-body-md text-sm text-on-surface-variant">{t('manage.programStub.hint')}</p>
        <Link
          href="/manage/events/create"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-surface-container-high px-4 font-label-caps text-[11px] uppercase tracking-[0.12em] text-on-surface transition-transform active:scale-[0.97]"
        >
          {t('manage.programStub.useEvent')}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </main>
  );
}
