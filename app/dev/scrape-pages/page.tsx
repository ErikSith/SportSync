import Link from 'next/link';
import { getPageViewer } from '@/lib/auth/viewer';
import { SetupNotice } from '@/components/i18n/SetupNotice';
import { AdminReviewer } from '@/components/dev/ScrapePagesReview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ borough?: string; venue?: string; tab?: string }>;
};

export default async function AdminReviewerPage({ searchParams }: PageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return <SetupNotice />;
  }

  if (viewer.isGuest || viewer.profile.role !== 'ADMIN') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center space-y-3">
        <p className="font-headline-sm text-headline-sm text-on-surface font-semibold">
          Admin Reviewer — len ADMIN
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {viewer.isGuest
            ? 'Prihlás sa účtom s rolou ADMIN.'
            : `Tvoja rola je ${viewer.profile.role}. V Supabase nastav profiles.role = ADMIN pre ${viewer.profile.email ?? 'tvoj účet'}.`}
        </p>
        <Link href="/" className="inline-block text-primary hover:underline text-sm">
          Späť na domov
        </Link>
      </main>
    );
  }

  const sp = searchParams ? await searchParams : {};
  const boroughRaw = sp.borough?.trim() || 'bratislava';
  const borough = boroughRaw === 'bratislava' || boroughRaw === 'all' ? 'bratislava' : boroughRaw;
  const venueId = sp.venue?.trim() || undefined;
  const tab = sp.tab === 'review' ? 'review' : 'scrape';

  return (
    <>
      <header className="bg-background/80 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-white/10 shadow-2xl shadow-black/40">
        <div className="flex justify-between items-center px-container-margin-mobile md:px-container-margin-desktop h-16 w-full max-w-screen-xl mx-auto">
          <Link
            href="/manage"
            className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-label-caps text-label-caps hidden md:inline">Manage</span>
          </Link>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
            Športoviská — DB
          </h1>
          <div className="w-10" />
        </div>
      </header>
      <main className="pt-20 pb-16 px-container-margin-mobile md:px-container-margin-desktop max-w-screen-xl mx-auto">
        <AdminReviewer
          initialBorough={borough}
          initialVenueId={venueId}
          initialTab={tab}
        />
      </main>
    </>
  );
}
