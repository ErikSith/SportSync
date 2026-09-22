import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireDevAdmin } from '@/lib/auth/dev-admin';
import { saveEventsForVenue } from '@/src/lib/scraper/db-service';
import { shouldForceGroupClassFromScrapePage } from '@/lib/feed/group-class';
import { shouldForceForKidsFromScrapePage } from '@/lib/scrape/scrape-page-kind';
import { scrapeVenuePage } from '@/src/lib/scraper/scrape-venue-page';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/dev/scrape-pages/[id]/run
 * Fetch → Gemini and/or Reenio → upsert into events/tournaments for Review.
 * Body (optional): { contentSelector?: string | null }
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  let override: string | null | undefined;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      contentSelector?: unknown;
    };
    if (typeof body.contentSelector === 'string') {
      override = body.contentSelector.trim() || null;
    } else if (body.contentSelector === null) {
      override = null;
    }
  } catch {
    override = undefined;
  }

  const supabase = createAdminClient();
  const { data: page, error } = await supabase
    .from('venue_scrape_pages')
    .select(
      'id, url, kind, enabled, content_selector, booking_provider, booking_subject, venue_id, venues ( id, name, latitude, longitude )',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const venue = Array.isArray(page.venues) ? page.venues[0] : page.venues;
  const venueId =
    (page.venue_id as string | null) ?? ((venue?.id as string | null) ?? null);
  if (!venueId) {
    return NextResponse.json(
      { error: 'Page has no venue_id — bind venue first' },
      { status: 400 },
    );
  }

  const selector =
    override !== undefined
      ? override
      : ((page.content_selector as string | null) ?? null);
  const url = page.url as string;
  const pageKind = String(page.kind ?? '').toLowerCase();

  try {
    const scraped = await scrapeVenuePage({
      url,
      contentSelector: selector,
      bookingProvider: (page.booking_provider as string | null) ?? null,
      bookingSubject: (page.booking_subject as string | null) ?? null,
      venueName: (venue?.name as string | null) ?? null,
    });

    const events = scraped.events;

    if (events.length === 0 && scraped.path === 'empty') {
      const isInsufficient =
        scraped.message?.startsWith('Insufficient text') ?? false;
      await supabase
        .from('venue_scrape_pages')
        .update({
          last_scraped_at: new Date().toISOString(),
          last_status: isInsufficient
            ? `error:insufficient-text:${scraped.text.length}`
            : scraped.skippedGemini
              ? 'ok:no-event-signal'
              : 'ok:events=0',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (isInsufficient) {
        return NextResponse.json(
          {
            ok: false,
            error: scraped.message,
            usedSelector: scraped.usedSelector,
            preferredMatched: scraped.preferredMatched,
            path: scraped.path,
          },
          { status: 422 },
        );
      }

      return NextResponse.json({
        ok: true,
        id,
        url,
        skippedGemini: scraped.skippedGemini,
        eventCount: 0,
        events: [],
        upsert: null,
        path: scraped.path,
        reenioSubject: scraped.reenioSubject,
        message: scraped.message ?? 'Nothing written',
      });
    }

    const upsert =
      events.length > 0
        ? await saveEventsForVenue(events, venueId, {
            latitude: (venue?.latitude as number | null) ?? null,
            longitude: (venue?.longitude as number | null) ?? null,
            scrapePageUrl: url,
            forceGroupClass: shouldForceGroupClassFromScrapePage(pageKind, url),
            forceForKids: shouldForceForKidsFromScrapePage(pageKind),
          })
        : {
            created: 0,
            updated: 0,
            unchanged: 0,
            skipped: 0,
            tournamentsCreated: 0,
            tournamentsUpdated: 0,
          };

    const statusPrefix =
      scraped.path === 'reenio-forced'
        ? 'ok:reenio'
        : scraped.path === 'reenio-fallback'
          ? 'ok:reenio-fallback'
          : 'ok';
    const lastStatus = `${statusPrefix}:events=${events.length};+${upsert.created}/~${upsert.updated}`;

    await supabase
      .from('venue_scrape_pages')
      .update({
        last_scraped_at: new Date().toISOString(),
        last_status: lastStatus,
        updated_at: new Date().toISOString(),
        enabled: true,
      })
      .eq('id', id);

    return NextResponse.json({
      ok: true,
      id,
      url,
      venueId,
      venueName: (venue?.name as string | null) ?? null,
      contentSelector: selector,
      usedSelector: scraped.usedSelector,
      preferredMatched: scraped.preferredMatched,
      charCount: scraped.text.length,
      eventCount: events.length,
      path: scraped.path,
      reenioSubject: scraped.reenioSubject,
      skippedGemini: scraped.skippedGemini,
      events: events.map((e) => ({
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime ?? null,
        sport: e.sportType ?? null,
        isTournament: e.isTournament ?? false,
        isGroupClass: e.isGroupClass ?? false,
        locationName: e.locationName ?? null,
        originalUrl: e.originalUrl ?? null,
      })),
      upsert,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from('venue_scrape_pages')
      .update({
        last_scraped_at: new Date().toISOString(),
        last_status: `error:${message.slice(0, 180)}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
