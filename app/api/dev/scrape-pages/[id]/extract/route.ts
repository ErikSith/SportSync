import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireDevAdmin } from '@/lib/auth/dev-admin';
import {
  fetchHtml,
  htmlToCleanTextDetailed,
} from '@/src/lib/scraper/fetcher';
import { extractEventsFromText } from '@/src/lib/scraper/extractor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/dev/scrape-pages/[id]/extract
 * Dry-run Gemini extract — no DB upsert.
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
    .select('id, url, content_selector')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const selector =
    override !== undefined
      ? override
      : ((page.content_selector as string | null) ?? null);

  try {
    const html = await fetchHtml(page.url as string);
    const cleaned = htmlToCleanTextDetailed(html, selector);
    const text = cleaned.text.slice(0, 48_000);
    if (!text || text.length < 40) {
      return NextResponse.json(
        {
          ok: false,
          error: `Insufficient text (${text.length} chars)`,
          usedSelector: cleaned.usedSelector,
          preferredMatched: cleaned.preferredMatched,
        },
        { status: 422 },
      );
    }

    const events = await extractEventsFromText(page.url as string, text);

    return NextResponse.json({
      ok: true,
      id: page.id,
      url: page.url,
      contentSelector: selector,
      usedSelector: cleaned.usedSelector,
      preferredMatched: cleaned.preferredMatched,
      charCount: text.length,
      eventCount: events.length,
      events: events.map((e) => ({
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime ?? null,
        sport: e.sportType ?? null,
        isTournament: e.isTournament ?? false,
        locationName: e.locationName ?? null,
        originalUrl: e.originalUrl ?? null,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
