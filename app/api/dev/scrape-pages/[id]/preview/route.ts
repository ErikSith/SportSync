import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireDevAdmin } from '@/lib/auth/dev-admin';
import {
  fetchHtml,
  htmlToCleanTextDetailed,
} from '@/src/lib/scraper/fetcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

const PREVIEW_CHARS = 4000;

/**
 * POST /api/dev/scrape-pages/[id]/preview
 * Body (optional): { contentSelector?: string | null }
 * Fetches the page and returns cleaned text using the selector (body override or DB).
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
    const result = htmlToCleanTextDetailed(html, selector);
    const text = result.text.slice(0, 48_000);

    return NextResponse.json({
      ok: true,
      id: page.id,
      url: page.url,
      contentSelector: selector,
      usedSelector: result.usedSelector,
      preferredMatched: result.preferredMatched,
      charCount: text.length,
      textPreview: text.slice(0, PREVIEW_CHARS),
      truncated: text.length > PREVIEW_CHARS,
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
