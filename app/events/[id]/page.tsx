import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPageViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import { getEventById, type SponsorExtracted } from '@/lib/data/events';
import { eventTypeBadge, eventTypeLabel } from '@/lib/constants/events';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { EventRegisterButton } from '@/components/events/EventRegisterButton';
import { EventExternalCta } from '@/components/events/EventExternalCta';
import { EventAggregatedDisclaimer } from '@/components/events/EventAggregatedDisclaimer';
import { ReportEventDataButton } from '@/components/events/ReportEventDataButton';
import { AiManagementPlanPanel } from '@/components/shared/AiManagementPlanPanel';
import { resolveTheme } from '@/lib/ai/theme-config-client';
import { sourceDisplayName } from '@/lib/constants/event-sources';
import { APP_TIMEZONE, formatAppDate, formatAppTime } from '@/lib/datetime/bratislava';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80';

const SPORT_ICONS: Record<string, string> = {
  TENNIS: 'sports_tennis',
  PADEL: 'sports_tennis',
  SQUASH: 'sports_martial_arts',
  RUNNING: 'run_circle',
  CYCLING: 'directions_bike',
  GOLF: 'sports_golf',
  FOOTBALL: 'sports_soccer',
  BASKETBALL: 'sports_basketball',
  ATLETIKA: 'directions_run',
};

function formatEventDate(date: Date): { dayMonth: string; year: string } {
  return {
    dayMonth: formatAppDate(date, { day: 'numeric', month: 'short' }),
    year: formatAppDate(date, { year: 'numeric' }),
  };
}

function formatEventTime(date: Date): { time: string; zone: string } {
  return {
    time: formatAppTime(date),
    zone: APP_TIMEZONE,
  };
}

function formatPrice(priceCents: number, currency: string): string {
  if (priceCents === 0) return 'FREE';
  const value = (priceCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value} ${currency}`;
}

function statusBadge(status: string): { label: string; className: string } {
  if (status === 'live') {
    return { label: 'LIVE', className: 'bg-primary-container text-white border border-secondary/30' };
  }
  if (status === 'open') {
    return { label: 'ACTIVE', className: 'bg-inverse-primary text-white border border-secondary/30' };
  }
  if (status === 'full') {
    return { label: 'FULL', className: 'bg-error-container/30 text-error border border-error/30' };
  }
  return {
    label: status.toUpperCase(),
    className: 'bg-surface-container-high text-on-surface-variant border border-white/10',
  };
}

interface EventDetailPageProps {
  params: { id: string };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const viewer = await getPageViewer();
  if (viewer.status === 'setup') {
    return (
      <main className="pt-24 px-container-margin-mobile max-w-lg mx-auto text-center">
        <p className="font-body-md text-body-md text-tertiary-container">Setting up your profile…</p>
      </main>
    );
  }

  const { profile, userId } = viewer;

  const event = await getEventById(params.id);
  if (!event) notFound();

  const supabase = await createClient();
  const { data: userReg } = userId
    ? await supabase
        .from('event_registrations')
        .select('status')
        .eq('event_id', params.id)
        .eq('user_id', userId)
        .maybeSingle()
    : { data: null };

  const initialRegistered = !!userReg && userReg.status !== 'cancelled';

  const theme = resolveTheme(event.sportType, event.themeConfig);
  const accent = theme.accent;
  const accentSoft = theme.accentSoft;
  const gradient = theme.gradient;
  const isAggregated = event.isAggregated;
  const tabs = isAggregated
    ? ['Prehľad', 'Zdroj', ...theme.tabs.filter((t) => t !== 'Prehľad').slice(0, 2)]
    : theme.tabs;

  const cover = event.coverUrl ?? DEFAULT_COVER;
  const icon = SPORT_ICONS[event.sport.toUpperCase()] ?? 'sports';
  const dateInfo = formatEventDate(event.startsAt);
  const timeInfo = formatEventTime(event.startsAt);
  const locationLine = event.venueName
    ? `${event.venueName}${event.venueCity ? `, ${event.venueCity}` : ''}`
    : event.city;
  const addressLine = event.venueAddress ?? event.city;
  const { label: statusLabel, className: statusClass } = statusBadge(event.status);
  const { label: typeBadgeLabel, className: typeBadgeClass, icon: typeBadgeIcon } = eventTypeBadge(event.type);
  const isOfficial = event.type === 'official';
  const canManage = canAccessManageHub(profile.role) || event.organizerId === profile.id;
  const isFull = event.status === 'full' || (event.capacity !== null && event.registeredCount >= event.capacity);
  const externalUrl = event.sourceUrl ?? event.ticketUrl;
  const resolvedSourceName = sourceDisplayName(event.source, event.sourceName);
  const canRegister =
    !isAggregated && (event.status === 'open' || event.status === 'live') && !isFull;
  const fillPercent =
    event.capacity !== null && event.capacity > 0
      ? Math.min(100, (event.registeredCount / event.capacity) * 100)
      : 0;

  // Merge normalized sponsors + JSON sponsors for the premium sponsor wall.
  const allSponsors: SponsorExtracted[] = [
    ...event.sponsors.map((s) => ({ name: s.name, logoUrl: s.logoUrl, websiteUrl: s.websiteUrl, tier: s.tier })),
    ...event.sponsorsJson,
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 w-full max-w-[100vw] z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-2xl shadow-black/50 flex items-center justify-between px-4 sm:px-gutter h-16 pt-[env(safe-area-inset-top,0px)]">
        <Link
          href="/events"
          className="hover:text-primary-fixed-dim transition-colors active:scale-95 flex items-center justify-center p-2 -ml-2 rounded-full hover:bg-white/5 text-secondary"
          aria-label="Back to events"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <Link
          href="/"
          className="font-display-lg text-display-lg-mobile tracking-tighter gradient-text font-bold absolute left-1/2 -translate-x-1/2"
        >
          SPORTSYNC
        </Link>
        {canManage ? (
          <Link
            href="/manage"
            className="font-label-caps text-label-caps text-secondary hover:opacity-80 transition-opacity"
          >
            Manage
          </Link>
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/20 overflow-hidden relative">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="object-cover w-full h-full" src={profile.avatarUrl} alt={profile.fullName ?? profile.username} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-label-caps text-on-surface-variant">
              {(profile.fullName ?? profile.username).slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        )}
      </nav>

      <header className="relative w-full h-[320px] sm:h-[420px] md:h-[574px] overflow-hidden bg-black mt-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="absolute inset-0 w-full h-full object-cover opacity-70" src={cover} alt={event.title} />
        <div className="absolute inset-0" style={{ background: gradient, opacity: 0.55 }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-background" />
        <div className="absolute bottom-0 left-0 w-full p-4 sm:p-container-margin-mobile md:p-container-margin-desktop z-10 flex flex-col justify-end">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className={`px-2.5 py-1 font-label-caps text-[10px] rounded-full uppercase tracking-widest shadow-lg ${statusClass}`}
            >
              {statusLabel}
            </span>
            <span
              className={`px-2.5 py-1 font-label-caps text-[10px] rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1 ${typeBadgeClass}`}
            >
              {typeBadgeIcon && (
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {typeBadgeIcon}
                </span>
              )}
              {typeBadgeLabel}
            </span>
            <span
              className="px-2.5 py-1 font-label-caps text-[10px] rounded-full uppercase tracking-widest text-white"
              style={{ backgroundColor: accent }}
            >
              {theme.label}
            </span>
          </div>
          <h1 className="font-display-lg-mobile text-[26px] leading-tight sm:text-display-lg-mobile md:font-display-lg md:text-display-lg text-white mb-2 max-w-3xl break-words">
            {event.title}
          </h1>
          <p className="font-body-md text-sm sm:text-body-lg text-tertiary flex items-start gap-2 min-w-0">
            <span className="material-symbols-outlined text-[18px] shrink-0">location_on</span>
            <span className="min-w-0 break-words">{locationLine}</span>
          </p>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-container-margin-mobile md:px-container-margin-desktop mt-5 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8 pb-44 min-w-0">
        <div className="lg:col-span-2 space-y-5 sm:space-y-8 min-w-0">
          {/* Dynamic sport-specific tabs */}
          <div className="flex gap-2 border-b border-outline-variant/15 pb-3 overflow-x-auto hide-scrollbar touch-pan-x -mx-1 px-1">
            {tabs.map((tab, idx) => (
              <span
                key={`${tab}-${idx}`}
                className="font-label-caps text-label-caps px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm shrink-0 whitespace-nowrap"
                style={{
                  backgroundColor: idx === 0 ? accent : accentSoft,
                  color: idx === 0 ? '#fff' : accent,
                }}
              >
                {tab}
              </span>
            ))}
          </div>

          <section className="grid grid-cols-2 gap-2.5 sm:gap-4">
            <div className="glass-card rounded-xl p-3.5 sm:p-6 flex items-start gap-2.5 sm:gap-4 glow-hover group min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors shrink-0" style={{ backgroundColor: accentSoft }}>
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]" style={{ color: accent }}>calendar_today</span>
              </div>
              <div className="min-w-0">
                <p className="font-label-caps text-[9px] sm:text-label-caps text-tertiary uppercase mb-1">Date</p>
                <p className="font-headline-md text-[15px] sm:text-headline-md text-white truncate">{dateInfo.dayMonth}</p>
                <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant">{dateInfo.year}</p>
              </div>
            </div>

            <div className="glass-card rounded-xl p-3.5 sm:p-6 flex items-start gap-2.5 sm:gap-4 glow-hover group min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors shrink-0" style={{ backgroundColor: accentSoft }}>
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]" style={{ color: accent }}>schedule</span>
              </div>
              <div className="min-w-0">
                <p className="font-label-caps text-[9px] sm:text-label-caps text-tertiary uppercase mb-1">Time</p>
                <p className="font-headline-md text-[15px] sm:text-headline-md text-white truncate">{timeInfo.time}</p>
                <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant truncate">{timeInfo.zone}</p>
              </div>
            </div>

            <div className="glass-card rounded-xl p-3.5 sm:p-6 flex items-start gap-2.5 sm:gap-4 glow-hover group min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors shrink-0" style={{ backgroundColor: accentSoft }}>
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]" style={{ color: accent }}>stadium</span>
              </div>
              <div className="min-w-0">
                <p className="font-label-caps text-[9px] sm:text-label-caps text-tertiary uppercase mb-1">Venue</p>
                <p className="font-headline-md text-[15px] sm:text-headline-md text-white truncate">{event.venueName ?? 'TBA'}</p>
                <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant line-clamp-2">{addressLine}</p>
              </div>
            </div>

            <div className="glass-card rounded-xl p-3.5 sm:p-6 flex items-start gap-2.5 sm:gap-4 glow-hover group min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors shrink-0" style={{ backgroundColor: accentSoft }}>
                <span className="material-symbols-outlined text-[20px] sm:text-[24px]" style={{ color: accent }}>{icon}</span>
              </div>
              <div className="min-w-0">
                <p className="font-label-caps text-[9px] sm:text-label-caps text-tertiary uppercase mb-1">Sport</p>
                <p className="font-headline-md text-[15px] sm:text-headline-md text-white capitalize truncate">{event.sport.toLowerCase()}</p>
                <p className="font-body-md text-xs sm:text-body-md text-on-surface-variant truncate">{event.city}</p>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-xl p-4 sm:p-8 min-w-0">
            <h2 className="font-headline-md text-[18px] sm:text-headline-md text-white mb-3 sm:mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: accent }}>info</span>
              Event Overview
            </h2>
            <div className="space-y-4 font-body-md text-sm sm:text-body-md text-on-surface leading-relaxed break-words">
              {event.description ? (
                <p className="whitespace-pre-wrap">{event.description}</p>
              ) : (
                <p className="text-on-surface-variant">
                  Event details will be published by the organizer before the start date.
                </p>
              )}
            </div>
          </section>

          {isAggregated ? (
            <section id="zdroj" className="glass-card rounded-xl p-4 sm:p-6 min-w-0">
              <h2 className="font-headline-md text-[18px] sm:text-headline-md text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: accent }}>link</span>
                Zdroj
              </h2>
              <EventAggregatedDisclaimer sourceName={resolvedSourceName} />
              <p className="mt-3 font-body-md text-sm text-on-surface-variant">
                SportSync zobrazuje len textový prehľad. Fotky ani logá zo stránky organizátora nesťahujeme.
                Registrácia a lístky sú vždy na oficiálnom webe.
              </p>
              {externalUrl ? (
                <div className="mt-4">
                  <EventExternalCta
                    eventId={event.id}
                    sourceUrl={externalUrl}
                    sourceName={resolvedSourceName}
                    label={`Prejsť na ${resolvedSourceName} ↗`}
                  />
                </div>
              ) : null}
              <div className="mt-3 flex justify-end">
                <ReportEventDataButton eventId={event.id} eventTitle={event.title} />
              </div>
            </section>
          ) : null}

          {event.entryRequirements && (
            <section className="glass-card rounded-xl p-4 sm:p-6 min-w-0">
              <h2 className="font-headline-md text-[18px] sm:text-headline-md text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: accent }}>rule</span>
                Entry Requirements
              </h2>
              <p className="font-body-md text-sm sm:text-body-md text-on-surface-variant whitespace-pre-wrap break-words">
                {event.entryRequirements}
              </p>
            </section>
          )}

          {event.photos.length > 0 && (
            <section className="glass-card rounded-xl p-4 sm:p-6 min-w-0">
              <h2 className="font-headline-md text-[18px] sm:text-headline-md text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: accent }}>photo_library</span>
                Gallery
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                {event.photos.map((url, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={idx}
                    src={url}
                    alt={`${event.title} photo ${idx + 1}`}
                    className="w-full h-28 sm:h-40 object-cover rounded-lg border border-white/10"
                  />
                ))}
              </div>
            </section>
          )}

          {allSponsors.length > 0 && (
            <section className="glass-card rounded-xl p-4 sm:p-6 min-w-0" style={{ borderColor: accentSoft }}>
              <h2 className="font-headline-md text-[18px] sm:text-headline-md text-white mb-3 sm:mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color: accent }}>workspace_premium</span>
                Sponsors
              </h2>
              <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {allSponsors.map((s, idx) => (
                  <a
                    key={`${s.name}-${idx}`}
                    href={s.websiteUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-surface-container border border-white/10 hover:border-white/30 transition-colors min-w-0"
                  >
                    {s.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logoUrl} alt={s.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="material-symbols-outlined shrink-0" style={{ color: accent }}>emoji_events</span>
                    )}
                    <span className="flex flex-col min-w-0">
                      <span className="font-headline-md text-[14px] sm:text-[15px] text-white truncate">{s.name}</span>
                      {s.tier && (
                        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant text-[10px]">
                          {s.tier}
                        </span>
                      )}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {event.capacity !== null && !isAggregated && (
            <section className="glass-card rounded-xl p-4 sm:p-6 min-w-0">
              <div className="flex justify-between items-end mb-4 gap-2">
                <h3 className="font-headline-md text-[18px] sm:text-headline-md text-white">Capacity</h3>
                {isFull && (
                  <span className="font-label-caps text-label-caps text-error bg-error-container/20 px-2 py-1 rounded-md">
                    Full
                  </span>
                )}
              </div>
              <div className="mb-2 flex justify-between items-center text-sm">
                <span className="text-on-surface-variant">Registered</span>
                <span className="font-bold text-white">
                  <span style={{ color: accent }}>{event.registeredCount}</span> / {event.capacity}
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden shadow-inner">
                <div className="h-full rounded-full relative" style={{ width: `${fillPercent}%`, backgroundColor: accent }}>
                  <div className="absolute inset-0 bg-white/20 w-full animate-pulse" />
                </div>
              </div>
            </section>
          )}

          {isAggregated && (
            <section className="min-w-0 space-y-3">
              <EventAggregatedDisclaimer sourceName={resolvedSourceName} />
              <div className="flex justify-end px-1">
                <ReportEventDataButton eventId={event.id} eventTitle={event.title} />
              </div>
            </section>
          )}

          {!isAggregated && (
            <div className="flex justify-end px-1">
              <ReportEventDataButton eventId={event.id} eventTitle={event.title} />
            </div>
          )}
        </div>

        <div className="space-y-5 sm:space-y-6 min-w-0">
          <section className="glass-card rounded-xl p-4 sm:p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface-container overflow-hidden border-2 p-1 flex items-center justify-center ${
                  isOfficial ? '' : 'border-primary/40'
                }`}
                style={isOfficial ? { borderColor: accent } : undefined}
              >
                <span
                  className={`material-symbols-outlined text-[28px] sm:text-[32px] ${isOfficial ? '' : 'text-primary'}`}
                  style={isOfficial ? { color: accent } : undefined}
                >
                  {isOfficial ? 'person' : 'groups'}
                </span>
              </div>
              {isOfficial && (
                <div
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-black/50 border-2 border-surface-container"
                  style={{ backgroundColor: accent }}
                >
                  <span className="material-symbols-outlined text-[16px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                </div>
              )}
            </div>
            <h3 className="font-headline-md text-headline-md text-white text-[18px] sm:text-[20px] mb-1 break-words">{event.organizerName}</h3>
            <p
              className={`font-label-caps text-label-caps uppercase mb-4 ${
                isOfficial ? 'gradient-text' : 'text-primary'
              }`}
              style={isOfficial ? { color: accent } : undefined}
            >
              {isOfficial ? 'Verified Organizer' : 'Organized by the community'}
            </p>
            <div className="w-full flex justify-between gap-2 pt-4 border-t border-white/5 font-body-md text-xs sm:text-body-md text-tertiary">
              <span className="flex flex-col min-w-0">
                <strong className="text-white truncate">{formatPrice(event.priceCents, event.currency)}</strong>
                Entry Fee
              </span>
              <span className="flex flex-col min-w-0">
                <strong className="text-white">{event.registeredCount}</strong>
                Registered
              </span>
              <span className="flex flex-col min-w-0">
                <strong className="text-white">{event.capacity ?? '∞'}</strong>
                Capacity
              </span>
            </div>
          </section>

          <section className="glass-card rounded-xl p-4 sm:p-6 min-w-0">
            <AiManagementPlanPanel entityType="event" entityId={event.id} />
          </section>

          <section className="glass-card rounded-xl p-4 sm:p-6 min-w-0">
            <h3 className="font-headline-md text-[18px] sm:text-[20px] text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ color: accent }}>rule</span>
              Requirements
            </h3>
            <ul className="space-y-3 font-body-md text-sm sm:text-body-md text-on-surface-variant">
              {isAggregated ? (
                <>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 text-[20px] shrink-0" style={{ color: accent }}>open_in_new</span>
                    Registrácia prebieha výhradne na oficiálnej stránke organizátora.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 text-[20px] shrink-0" style={{ color: accent }}>verified</span>
                    Overte si kapacitu a cenu priamo u organizátora pred odchodom.
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 text-[20px] shrink-0" style={{ color: accent }}>check_circle</span>
                    Valid SportSync account required to register.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 text-[20px] shrink-0" style={{ color: accent }}>check_circle</span>
                    Arrive at the venue before the scheduled start time.
                  </li>
                  {event.priceCents > 0 && (
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined mt-0.5 text-[20px] shrink-0" style={{ color: accent }}>check_circle</span>
                      Entry fee of {formatPrice(event.priceCents, event.currency)} due upon registration.
                    </li>
                  )}
                </>
              )}
            </ul>
          </section>
        </div>
      </main>

      <div className="fixed bottom-20 md:bottom-0 left-0 right-0 w-full max-w-[100vw] glass-panel border-t border-white/10 p-3 sm:p-4 md:p-6 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:pb-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 min-w-0">
          <div className="hidden md:block">
            <p className="font-label-caps text-label-caps text-tertiary uppercase">
              {isAggregated ? 'Info o cene' : 'Registration Fee'}
            </p>
            <p className="font-headline-md text-headline-md text-white">
              {formatPrice(event.priceCents, event.currency)}
              {event.priceCents > 0 && <span className="font-body-md text-body-md text-on-surface-variant"> {event.currency}</span>}
            </p>
          </div>
          {isAggregated ? (
            externalUrl ? (
              <EventExternalCta
                eventId={event.id}
                sourceUrl={externalUrl}
                sourceName={resolvedSourceName}
              />
            ) : (
              <button
                type="button"
                disabled
                className="w-full md:w-auto bg-surface-container-high text-on-surface-variant font-headline-md text-headline-md py-4 px-12 rounded-lg border border-white/10 flex items-center justify-center gap-2 font-bold tracking-wide cursor-not-allowed opacity-70"
              >
                Zdrojová stránka nedostupná
              </button>
            )
          ) : (
            <EventRegisterButton
              eventId={event.id}
              canRegister={canRegister}
              isFull={isFull}
              initialRegistered={initialRegistered}
              initialStatus={userReg?.status ?? null}
              registerLabel={isOfficial ? 'REGISTER FOR EVENT' : 'JOIN EVENT'}
              registeredLabel={isOfficial ? 'REGISTERED ✓' : 'JOINED ✓'}
            />
          )}
        </div>
      </div>

    </>
  );
}