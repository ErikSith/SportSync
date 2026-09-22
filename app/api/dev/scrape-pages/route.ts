import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireDevAdmin } from '@/lib/auth/dev-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_KINDS = new Set([
  'website',
  'tournaments',
  'schedule',
  'events',
  'availability',
  'kids_camps',
  'other',
]);

export type DevScrapePageRow = {
  id: string;
  url: string;
  kind: string;
  borough: string | null;
  enabled: boolean;
  contentSelector: string | null;
  bookingProvider: string | null;
  bookingSubject: string | null;
  lastScrapedAt: string | null;
  lastStatus: string | null;
  venueId: string | null;
  venueName: string | null;
  venueCity: string | null;
};

function mapRow(r: Record<string, unknown>): DevScrapePageRow {
  const venue = Array.isArray(r.venues) ? r.venues[0] : r.venues;
  const v = venue as { name?: string; city?: string } | null | undefined;
  return {
    id: r.id as string,
    url: r.url as string,
    kind: String(r.kind ?? 'website'),
    borough: (r.borough as string | null) ?? null,
    enabled: Boolean(r.enabled),
    contentSelector: (r.content_selector as string | null) ?? null,
    bookingProvider: (r.booking_provider as string | null) ?? null,
    bookingSubject: (r.booking_subject as string | null) ?? null,
    lastScrapedAt: (r.last_scraped_at as string | null) ?? null,
    lastStatus: (r.last_status as string | null) ?? null,
    venueId: (r.venue_id as string | null) ?? null,
    venueName: v?.name ?? null,
    venueCity: v?.city ?? null,
  };
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * GET /api/dev/scrape-pages
 * Query: borough, kind, missingSelector=1, q, venueId, offset, limit, enabled=1|0|all
 */
export async function GET(request: Request) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const borough = searchParams.get('borough')?.trim().toLowerCase() || null;
  const kind = searchParams.get('kind')?.trim().toLowerCase() || null;
  const venueId = searchParams.get('venueId')?.trim() || null;
  const missingSelector = searchParams.get('missingSelector') === '1';
  const q = searchParams.get('q')?.trim().toLowerCase() || null;
  const enabledParam = searchParams.get('enabled') ?? '1';
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 100) || 100));

  const supabase = createAdminClient();
  let query = supabase
    .from('venue_scrape_pages')
    .select(
      'id, url, kind, borough, enabled, content_selector, booking_provider, booking_subject, last_scraped_at, last_status, venue_id, venues ( id, name, city )',
      { count: 'exact' },
    )
    .order('borough', { ascending: true, nullsFirst: false })
    .order('kind', { ascending: true })
    .order('url', { ascending: true });

  if (enabledParam === '1') query = query.eq('enabled', true);
  else if (enabledParam === '0') query = query.eq('enabled', false);

  if (borough) query = query.eq('borough', borough);
  if (kind) query = query.eq('kind', kind);
  if (venueId) query = query.eq('venue_id', venueId);
  if (missingSelector) query = query.is('content_selector', null);

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let pages: DevScrapePageRow[] = (data ?? []).map((r) =>
    mapRow(r as Record<string, unknown>),
  );

  if (q) {
    pages = pages.filter(
      (p) =>
        p.url.toLowerCase().includes(q) ||
        (p.venueName?.toLowerCase().includes(q) ?? false) ||
        (p.borough?.toLowerCase().includes(q) ?? false),
    );
  }

  return NextResponse.json({
    ok: true,
    pages,
    total: count ?? pages.length,
    offset,
    limit,
  });
}

/**
 * POST /api/dev/scrape-pages
 * Body: {
 *   urls: string[] | string (newline-separated),
 *   kind?: string,
 *   venueId?: string | null,
 *   borough?: string | null,
 *   enabled?: boolean,
 *   contentSelector?: string | null
 * }
 * Creates one VenueScrapePage per URL (upsert by unique url).
 */
export async function POST(request: Request) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  let body: {
    urls?: unknown;
    kind?: unknown;
    venueId?: unknown;
    borough?: unknown;
    enabled?: unknown;
    contentSelector?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawUrls: string[] = [];
  if (typeof body.urls === 'string') {
    rawUrls.push(
      ...body.urls
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  } else if (Array.isArray(body.urls)) {
    for (const u of body.urls) {
      if (typeof u === 'string' && u.trim()) rawUrls.push(u.trim());
    }
  }

  const urls = [...new Set(rawUrls)].filter(isHttpUrl);
  if (urls.length === 0) {
    return NextResponse.json(
      { error: 'Provide at least one http(s) URL in urls' },
      { status: 400 },
    );
  }

  const kindRaw = typeof body.kind === 'string' ? body.kind.trim().toLowerCase() : 'schedule';
  const kind = ALLOWED_KINDS.has(kindRaw) ? kindRaw : 'other';
  const venueId =
    typeof body.venueId === 'string' && body.venueId.trim()
      ? body.venueId.trim()
      : null;
  const borough =
    typeof body.borough === 'string' && body.borough.trim()
      ? body.borough.trim().toLowerCase()
      : null;
  const enabled = body.enabled === false ? false : true;

  let contentSelector: string | null = null;
  if (typeof body.contentSelector === 'string') {
    const trimmed = body.contentSelector.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      contentSelector = trimmed.slice(0, 500);
    }
  }

  const supabase = createAdminClient();
  const created: DevScrapePageRow[] = [];
  const updated: DevScrapePageRow[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  for (const url of urls) {
    const { data: existing } = await supabase
      .from('venue_scrape_pages')
      .select(
        'id, url, kind, borough, enabled, content_selector, last_scraped_at, last_status, venue_id, venues ( id, name, city )',
      )
      .eq('url', url)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('venue_scrape_pages')
        .update({
          kind,
          enabled: true,
          venue_id: venueId ?? existing.venue_id,
          borough: borough ?? existing.borough,
          content_selector:
            contentSelector ?? existing.content_selector ?? null,
          source: 'manual',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select(
          'id, url, kind, borough, enabled, content_selector, last_scraped_at, last_status, venue_id, venues ( id, name, city )',
        )
        .maybeSingle();

      if (error || !data) {
        errors.push({ url, error: error?.message ?? 'Update failed' });
        continue;
      }
      updated.push(mapRow(data as Record<string, unknown>));
      continue;
    }

    const { data, error } = await supabase
      .from('venue_scrape_pages')
      .insert({
        url,
        kind,
        borough,
        enabled,
        source: 'manual',
        venue_id: venueId,
        content_selector: contentSelector,
      })
      .select(
        'id, url, kind, borough, enabled, content_selector, last_scraped_at, last_status, venue_id, venues ( id, name, city )',
      )
      .maybeSingle();

    if (error || !data) {
      errors.push({ url, error: error?.message ?? 'Insert failed' });
      continue;
    }
    created.push(mapRow(data as Record<string, unknown>));
  }

  return NextResponse.json({
    ok: true,
    created,
    updated,
    errors,
    createdCount: created.length,
    updatedCount: updated.length,
  });
}
