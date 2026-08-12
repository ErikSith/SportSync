import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getPageViewer } from '@/lib/auth/viewer';
import { canAccessManageHub, organizerRoleLabel } from '@/lib/auth/tournament-access';
import { getVenuesForOrganizer } from '@/lib/data/organizer-venues';
import { getOrganizerUpcomingContent } from '@/lib/data/organizer-dashboard';

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function ManagePage() {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
  }

  if (viewer.isGuest) {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">
          Prihlásenie bude čoskoro — vytváranie zatiaľ nie je dostupné.
        </p>
      </main>
    );
  }

  const { profile } = viewer;

  if (!canAccessManageHub(profile.role)) {
    redirect('/');
  }

  const [venues, upcoming] = await Promise.all([
    getVenuesForOrganizer(profile.id, profile.role),
    getOrganizerUpcomingContent(profile.id),
  ]);

  const roleLabel = organizerRoleLabel(profile.role);

  return (
    <>
      <header className="bg-background/80 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-white/10 shadow-2xl shadow-black/40">
        <div className="flex justify-between items-center px-container-margin-mobile md:px-container-margin-desktop h-16 w-full max-w-screen-xl mx-auto">
          <Link href="/profile" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-label-caps text-label-caps hidden md:inline">Profile</span>
          </Link>
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Manage</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-24 pb-28 px-container-margin-mobile md:px-container-margin-desktop max-w-screen-xl mx-auto flex flex-col gap-gutter">
        <section className="glass-panel rounded-xl p-6 border border-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-label-caps text-label-caps text-secondary uppercase">{roleLabel}</p>
            <h2 className="font-headline-md text-headline-md text-on-surface mt-1">
              {profile.fullName ?? profile.username}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Create official events and tournaments at your venues. AI handles promotion and registration follow-up.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/30 font-label-caps text-label-caps text-secondary uppercase">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified
            </span>
            Organizer
          </span>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/manage/events/create"
            className="glass-panel rounded-xl p-6 border border-secondary/25 hover:border-secondary/50 transition-all flex flex-col gap-4 group"
          >
            <div className="w-12 h-12 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-secondary">event</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Create official event</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Describe your event — AI drafts the page, sets capacity, and opens registration.
              </p>
            </div>
            <span className="font-label-caps text-label-caps text-secondary uppercase flex items-center gap-1">
              Start
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </span>
          </Link>

          <Link
            href="/tournaments/create"
            className="glass-panel rounded-xl p-6 border border-secondary/25 hover:border-secondary/50 transition-all flex flex-col gap-4 group"
          >
            <div className="w-12 h-12 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-secondary">emoji_events</span>
            </div>
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Create tournament</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Set format, skill level, and entry fee — AI builds brackets and fill campaigns.
              </p>
            </div>
            <span className="font-label-caps text-label-caps text-secondary uppercase flex items-center gap-1">
              Start
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </span>
          </Link>
        </section>

        <section className="glass-panel rounded-xl p-6 border border-white/10">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">stadium</span>
            {profile.role === 'ADMIN' ? 'All venues' : 'My venues'}
          </h3>
          {venues.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              No venues linked yet. Contact support to register a venue before creating events.
            </p>
          ) : (
            <div className="space-y-3">
              {venues.map((venue) => (
                <Link
                  key={venue.id}
                  href={`/venues/${venue.id}`}
                  className="glass-card rounded-lg p-4 flex items-center justify-between gap-4 hover:border-secondary/30 transition-colors"
                >
                  <div>
                    <p className="font-headline-md text-[18px] text-on-surface">{venue.name}</p>
                    <p className="font-body-md text-sm text-on-surface-variant">{venue.city}</p>
                  </div>
                  <span className="material-symbols-outlined text-secondary">chevron_right</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="glass-panel rounded-xl p-6 border border-white/10">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">upcoming</span>
            Upcoming content
          </h3>
          {upcoming.length === 0 ? (
            <p className="font-body-md text-body-md text-on-surface-variant">
              No upcoming events or tournaments yet. Create your first one above.
            </p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((item) => (
                <Link
                  key={`${item.kind}-${item.id}`}
                  href={item.href}
                  className="glass-card rounded-lg p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-label-caps text-[10px] uppercase px-2 py-0.5 rounded-full border border-white/10 text-on-surface-variant">
                        {item.kind}
                      </span>
                      <span className="font-label-caps text-[10px] uppercase text-tertiary">{item.status}</span>
                    </div>
                    <p className="font-headline-md text-[18px] text-on-surface">{item.title}</p>
                    <p className="font-body-md text-sm text-on-surface-variant mt-1">
                      {item.sport} • {formatDateTime(item.startsAt)}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-primary">chevron_right</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

    </>
  );
}
