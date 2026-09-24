import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireDevAdmin } from '@/lib/auth/dev-admin';
import { listingParticipationMode } from '@/lib/participation/fixture-match';
import { tournamentParticipationMode } from '@/lib/tournament-participation';
import { looksLikeGroupClassListing } from '@/lib/feed/group-class';
import { classifyProgramSignals } from '@/lib/programs/classify';
import {
  extractScheduleFromAmenities,
  jsDayToIsoWeekday,
  type Weekday,
} from '@/lib/dev/group-class-schedule';
import { formatAppTime, getZonedParts, APP_TIMEZONE } from '@/lib/datetime/bratislava';
import { activeFeedSinceIso, isListingStillActive } from '@/lib/retention/feed-window';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

type ChecklistStatus = 'ok' | 'missing' | 'empty';

function checklistFrom(hasScrape: boolean, hasContent: boolean): ChecklistStatus {
  if (hasContent) return 'ok';
  if (hasScrape) return 'empty'; // URL registered but no listings yet
  return 'missing';
}

/**
 * GET /api/dev/venues/[id]/overview
 * Admin dossier: venue + scrapes + listings + checklist.
 * Listings omit past dates (same floor as public feeds).
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  const { id: venueId } = await context.params;
  if (!venueId) {
    return NextResponse.json({ error: 'Missing venue id' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const feedFloorIso = activeFeedSinceIso(now);

  const [venueRes, scrapesRes, eventsRes, toursRes] = await Promise.all([
    supabase
      .from('venues')
      .select(
        'id, name, description, address, city, district, sports, website_url, latitude, longitude, verified, amenities',
      )
      .eq('id', venueId)
      .maybeSingle(),
    supabase
      .from('venue_scrape_pages')
      .select(
        'id, url, kind, enabled, borough, content_selector, last_scraped_at, last_status',
      )
      .eq('venue_id', venueId)
      .order('kind', { ascending: true })
      .order('url', { ascending: true }),
    supabase
      .from('events')
      .select(
        'id, title, description, sport, status, starts_at, end_time, participation_mode, for_kids, for_women, type, source, source_url, ticket_url, external_id, theme_config',
      )
      .eq('venue_id', venueId)
      .or(`starts_at.gte."${feedFloorIso}",end_time.gte."${nowIso}"`)
      .order('starts_at', { ascending: true })
      .limit(80),
    supabase
      .from('tournaments')
      .select(
        'id, name, description, sport, status, starts_at, ends_at, for_kids, for_women, source, source_url, ticket_url',
      )
      .eq('venue_id', venueId)
      .or(`starts_at.gte."${feedFloorIso}",ends_at.gte."${nowIso}"`)
      .order('starts_at', { ascending: true })
      .limit(40),
  ]);

  if (venueRes.error) {
    return NextResponse.json({ error: venueRes.error.message }, { status: 500 });
  }
  if (!venueRes.data) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
  }

  if (scrapesRes.error) {
    return NextResponse.json({ error: scrapesRes.error.message }, { status: 500 });
  }
  if (eventsRes.error) {
    return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });
  }
  if (toursRes.error) {
    return NextResponse.json({ error: toursRes.error.message }, { status: 500 });
  }

  const venue = {
    id: venueRes.data.id as string,
    name: venueRes.data.name as string,
    description: (venueRes.data.description as string | null) ?? null,
    address: (venueRes.data.address as string | null) ?? null,
    city: venueRes.data.city as string,
    district: (venueRes.data.district as string | null) ?? null,
    sports: (venueRes.data.sports as string[] | null) ?? [],
    websiteUrl: (venueRes.data.website_url as string | null) ?? null,
    latitude: (venueRes.data.latitude as number | null) ?? null,
    longitude: (venueRes.data.longitude as number | null) ?? null,
    verified: Boolean(venueRes.data.verified),
  };

  const scrapes = (scrapesRes.data ?? []).map((s) => ({
    id: s.id as string,
    url: s.url as string,
    kind: String(s.kind ?? 'website'),
    enabled: Boolean(s.enabled),
    borough: (s.borough as string | null) ?? null,
    contentSelector: (s.content_selector as string | null) ?? null,
    lastScrapedAt: (s.last_scraped_at as string | null) ?? null,
    lastStatus: (s.last_status as string | null) ?? null,
  }));

  const enabledScrapes = scrapes.filter((s) => s.enabled);
  const hasKind = (kind: string) => enabledScrapes.some((s) => s.kind === kind);

  type EventRow = {
    id: string;
    title: string;
    description: string | null;
    sport: string;
    status: string;
    startsAt: string;
    endTime: string | null;
    storedParticipationMode: string;
    effectiveParticipationMode: 'spectator' | 'participate';
    modeMismatch: boolean;
    forKids: boolean;
    forWomen: boolean;
    type: string;
    source: string | null;
    sourceUrl: string | null;
    isGroupClass: boolean;
    programKind: 'workshops' | 'camps' | 'courses' | null;
    isUpcoming: boolean;
  };

  const mappedEvents: EventRow[] = (eventsRes.data ?? []).map((e) => {
    const title = e.title as string;
    const description = (e.description as string | null) ?? null;
    const sourceUrl = (e.source_url as string | null) ?? null;
    const ticketUrl = (e.ticket_url as string | null) ?? null;
    const source = (e.source as string | null) ?? null;
    const externalId = (e.external_id as string | null) ?? null;
    const themeConfig =
      e.theme_config && typeof e.theme_config === 'object'
        ? (e.theme_config as Record<string, unknown>)
        : null;
    const themeProgramKind =
      typeof themeConfig?.programKind === 'string' ? themeConfig.programKind : null;
    const programKind = classifyProgramSignals({
      title,
      description,
      sourceUrl,
      ticketUrl,
      externalId,
      themeProgramKind,
    });
    const stored = (e.participation_mode as string) || 'participate';
    const effective = listingParticipationMode(title, stored, {
      description,
      sourceUrl,
      ticketUrl,
      source,
    });
    const isGroupClass =
      !programKind &&
      looksLikeGroupClassListing({
        title,
        description,
        sourceUrl,
        ticketUrl,
        externalId,
      });
    const startsAt = e.starts_at as string;
    const endTime = (e.end_time as string | null) ?? null;
    return {
      id: e.id as string,
      title,
      description,
      sport: e.sport as string,
      status: e.status as string,
      startsAt,
      endTime,
      storedParticipationMode: stored,
      effectiveParticipationMode: effective,
      modeMismatch: stored !== effective,
      forKids: Boolean(e.for_kids),
      forWomen: Boolean(e.for_women),
      type: e.type as string,
      source,
      sourceUrl,
      isGroupClass,
      programKind,
      isUpcoming: isListingStillActive(startsAt, endTime, now),
    };
  });

  const mappedTournaments = (toursRes.data ?? []).map((t) => {
    const name = t.name as string;
    const description = (t.description as string | null) ?? null;
    const sourceUrl = (t.source_url as string | null) ?? null;
    const ticketUrl = (t.ticket_url as string | null) ?? null;
    const source = (t.source as string | null) ?? null;
    const effective = tournamentParticipationMode({
      name,
      description,
      status: t.status as string,
      ticketUrl,
      sourceUrl,
      source,
    });
    const startsAt = t.starts_at as string;
    const endsAt = (t.ends_at as string | null) ?? null;
    return {
      id: t.id as string,
      title: name,
      description,
      sport: t.sport as string,
      status: t.status as string,
      startsAt,
      endsAt,
      effectiveParticipationMode: effective,
      forKids: Boolean(t.for_kids),
      forWomen: Boolean(t.for_women),
      source,
      sourceUrl,
      isUpcoming: isListingStillActive(startsAt, endsAt, now),
    };
  });

  // Defensive: DB `.or` can still return edge rows; never show past in the dossier.
  const activeEvents = mappedEvents.filter((e) => e.isUpcoming);
  const activeTournaments = mappedTournaments.filter((t) => t.isUpcoming);

  const groupClasses = activeEvents.filter((e) => e.isGroupClass);
  const programs = activeEvents.filter((e) => e.programKind != null);
  const plainEvents = activeEvents.filter((e) => !e.isGroupClass && !e.programKind);

  const upcomingGroupClasses = groupClasses.length;
  const upcomingEvents = plainEvents.length;
  const upcomingTournaments = activeTournaments.length;

  const allForMode = [...activeEvents, ...activeTournaments];
  const watchCount = allForMode.filter(
    (r) => r.effectiveParticipationMode === 'spectator',
  ).length;
  const playCount = allForMode.filter(
    (r) => r.effectiveParticipationMode === 'participate',
  ).length;
  const kidsCount = allForMode.filter((r) => r.forKids).length;
  const womenCount = allForMode.filter((r) => r.forWomen).length;

  const groupClassSchedule = extractScheduleFromAmenities(venueRes.data.amenities);
  const scheduleSlotCount = groupClassSchedule.slots.length;

  const checklist = {
    website: venue.websiteUrl ? ('ok' as const) : checklistFrom(hasKind('website'), false),
    address: venue.address ? ('ok' as const) : ('missing' as const),
    schedule: checklistFrom(
      hasKind('schedule') || scheduleSlotCount > 0,
      upcomingGroupClasses > 0 || groupClasses.length > 0 || scheduleSlotCount > 0,
    ),
    availability: checklistFrom(hasKind('availability'), false), // content parse later
    events: checklistFrom(
      hasKind('events') || plainEvents.length > 0 || programs.length > 0,
      plainEvents.length > 0 || programs.length > 0,
    ),
    tournaments: checklistFrom(
      hasKind('tournaments') || activeTournaments.length > 0,
      activeTournaments.length > 0,
    ),
    groupClasses: checklistFrom(
      hasKind('schedule') || groupClasses.length > 0 || scheduleSlotCount > 0,
      groupClasses.length > 0 || scheduleSlotCount > 0,
    ),
    kids: kidsCount > 0 || groupClassSchedule.slots.some((s) => s.forKids)
      ? ('ok' as const)
      : ('empty' as const),
    women: womenCount > 0 || groupClassSchedule.slots.some((s) => s.forWomen)
      ? ('ok' as const)
      : ('empty' as const),
  };

  const scheduleHints = groupClasses.map((e) => {
    const d = new Date(e.startsAt);
    const parts = getZonedParts(d);
    // Reconstruct a UTC noon on that Bratislava calendar day to read weekday stably.
    const weekdayName = new Intl.DateTimeFormat('en-GB', {
      timeZone: APP_TIMEZONE,
      weekday: 'short',
    }).format(d);
    const weekdayMap: Record<string, Weekday> = {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 7,
    };
    const weekday =
      weekdayMap[weekdayName] ??
      jsDayToIsoWeekday(
        new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0)).getUTCDay(),
      );
    return {
      id: e.id,
      title: e.title,
      weekday,
      start: formatAppTime(d),
      forKids: e.forKids,
      forWomen: e.forWomen,
    };
  });

  return NextResponse.json({
    ok: true,
    venue,
    scrapes,
    checklist,
    groupClassSchedule,
    scheduleHints,
    counts: {
      scrapesEnabled: enabledScrapes.length,
      scrapesTotal: scrapes.length,
      groupClasses: groupClasses.length,
      upcomingGroupClasses,
      scheduleSlots: scheduleSlotCount,
      programs: programs.length,
      events: plainEvents.length,
      upcomingEvents,
      tournaments: activeTournaments.length,
      upcomingTournaments,
      watchCount,
      playCount,
      kidsCount,
      womenCount,
    },
    listings: {
      groupClasses,
      programs,
      events: plainEvents,
      tournaments: activeTournaments,
    },
  });
}
