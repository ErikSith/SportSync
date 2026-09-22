import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireDevAdmin } from '@/lib/auth/dev-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type VenueScrapePageBrief = {
  id: string;
  url: string;
  kind: string;
  enabled: boolean;
  contentSelector: string | null;
  bookingProvider: string | null;
  bookingSubject: string | null;
  lastScrapedAt: string | null;
  lastStatus: string | null;
};

export type VenueScrapeGroup = {
  venueId: string;
  venueName: string;
  venueCity: string | null;
  borough: string | null;
  websiteUrl: string | null;
  googlePlaceId: string | null;
  pages: VenueScrapePageBrief[];
};

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function kindRank(kind: string) {
  const order = [
    'website',
    'schedule',
    'availability',
    'events',
    'tournaments',
    'kids_camps',
    'other',
  ];
  const i = order.indexOf(kind);
  return i === -1 ? order.length : i;
}

/**
 * GET /api/dev/scrape-venues
 * Full venue DB for Admin Reviewer: all venues (Google Places + manual),
 * with scrape pages attached (may be empty).
 * Query: borough, q, offset, limit, enabled=1|0|all (filters pages only; venues always included)
 */
export async function GET(request: Request) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const borough = searchParams.get('borough')?.trim().toLowerCase() || null;
  const q = searchParams.get('q')?.trim().toLowerCase() || null;
  const enabledParam = searchParams.get('enabled') ?? 'all';
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(1000, Math.max(1, Number(searchParams.get('limit') ?? 500) || 500));

  const supabase = createAdminClient();

  // When searching, also find venues whose scrape URL matches (even if name doesn't).
  const extraVenueIds = new Set<string>();
  if (q) {
    let urlQuery = supabase
      .from('venue_scrape_pages')
      .select('venue_id')
      .ilike('url', `%${q}%`)
      .not('venue_id', 'is', null)
      .limit(500);
    if (borough) urlQuery = urlQuery.eq('borough', borough);
    const { data: urlHits } = await urlQuery;
    for (const row of urlHits ?? []) {
      if (row.venue_id) extraVenueIds.add(row.venue_id as string);
    }
  }

  let venueQuery = supabase
    .from('venues')
    .select('id, name, city, district, website_url, google_place_id')
    .order('name', { ascending: true })
    .limit(3000);

  if (borough) {
    venueQuery = venueQuery.eq('district', borough);
  }
  if (q) {
    venueQuery = venueQuery.or(
      `name.ilike.%${q}%,website_url.ilike.%${q}%,city.ilike.%${q}%,district.ilike.%${q}%`,
    );
  }

  const { data: venueRows, error: venueError } = await venueQuery;
  if (venueError) {
    return NextResponse.json({ error: venueError.message }, { status: 500 });
  }

  type VenueRow = {
    id: string;
    name: string | null;
    city: string | null;
    district: string | null;
    website_url: string | null;
    google_place_id: string | null;
  };

  const byId = new Map<string, VenueRow>();
  for (const v of venueRows ?? []) {
    byId.set(v.id as string, v as VenueRow);
  }

  if (extraVenueIds.size > 0) {
    const missing = [...extraVenueIds].filter((id) => !byId.has(id));
    if (missing.length > 0) {
      const { data: extraRows } = await supabase
        .from('venues')
        .select('id, name, city, district, website_url, google_place_id')
        .in('id', missing);
      for (const v of extraRows ?? []) {
        byId.set(v.id as string, v);
      }
    }
  }

  const venues: VenueScrapeGroup[] = Array.from(byId.values())
    .map((v) => ({
      venueId: v.id as string,
      venueName: (v.name as string | null) ?? 'Bez názvu',
      venueCity: (v.city as string | null) ?? null,
      borough: (v.district as string | null) ?? null,
      websiteUrl: (v.website_url as string | null) ?? null,
      googlePlaceId: (v.google_place_id as string | null) ?? null,
      pages: [] as VenueScrapePageBrief[],
    }))
    .sort((a, b) => a.venueName.localeCompare(b.venueName, 'sk'));

  const venueIds = venues.map((v) => v.venueId);
  const byVenue = new Map(venues.map((v) => [v.venueId, v]));

  if (venueIds.length > 0) {
    const chunkSize = 200;
    for (let i = 0; i < venueIds.length; i += chunkSize) {
      const chunk = venueIds.slice(i, i + chunkSize);
      let pageQuery = supabase
        .from('venue_scrape_pages')
        .select(
          'id, url, kind, borough, enabled, content_selector, booking_provider, booking_subject, last_scraped_at, last_status, venue_id',
        )
        .in('venue_id', chunk)
        .order('url', { ascending: true });

      if (enabledParam === '1') pageQuery = pageQuery.eq('enabled', true);
      else if (enabledParam === '0') pageQuery = pageQuery.eq('enabled', false);

      const { data: pages, error: pageError } = await pageQuery;
      if (pageError) {
        return NextResponse.json({ error: pageError.message }, { status: 500 });
      }

      for (const r of pages ?? []) {
        const venueId = r.venue_id as string | null;
        if (!venueId) continue;
        const group = byVenue.get(venueId);
        if (!group) continue;

        group.pages.push({
          id: r.id as string,
          url: r.url as string,
          kind: String(r.kind ?? 'website'),
          enabled: Boolean(r.enabled),
          contentSelector: (r.content_selector as string | null) ?? null,
          bookingProvider: (r.booking_provider as string | null) ?? null,
          bookingSubject: (r.booking_subject as string | null) ?? null,
          lastScrapedAt: (r.last_scraped_at as string | null) ?? null,
          lastStatus: (r.last_status as string | null) ?? null,
        });

        if (!group.borough && r.borough) {
          group.borough = r.borough as string;
        }
      }
    }
  }

  for (const v of venues) {
    v.pages.sort((a, b) => {
      const kr = kindRank(a.kind) - kindRank(b.kind);
      if (kr !== 0) return kr;
      return a.url.localeCompare(b.url);
    });
  }

  const total = venues.length;
  const sliced = venues.slice(offset, offset + limit);

  return NextResponse.json({
    ok: true,
    venues: sliced,
    total,
    offset,
    limit,
  });
}

/**
 * POST /api/dev/scrape-venues
 * Attach scrape URL(s) to an existing venue (does not create venues).
 * Body: {
 *   venueId: string,
 *   borough?: string | null,
 *   urls?: string[] | string,
 *   kind?: string
 * }
 */
export async function POST(request: Request) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  let body: {
    venueId?: unknown;
    borough?: unknown;
    urls?: unknown;
    kind?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const venueId =
    typeof body.venueId === 'string' && body.venueId.trim()
      ? body.venueId.trim()
      : null;
  if (!venueId) {
    return NextResponse.json({ error: 'venueId required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, name, city, district, website_url')
    .eq('id', venueId)
    .maybeSingle();

  if (venueError) {
    return NextResponse.json({ error: venueError.message }, { status: 500 });
  }
  if (!venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
  }

  const borough =
    (typeof body.borough === 'string' && body.borough.trim()
      ? body.borough.trim().toLowerCase()
      : null) ||
    ((venue.district as string | null)?.toLowerCase() ?? null);

  const kindRaw =
    typeof body.kind === 'string' ? body.kind.trim().toLowerCase() : 'schedule';
  const allowed = new Set([
    'website',
    'tournaments',
    'schedule',
    'events',
    'availability',
    'kids_camps',
    'other',
  ]);
  const extraKind = allowed.has(kindRaw) ? kindRaw : 'schedule';

  const rawExtra: string[] = [];
  if (typeof body.urls === 'string') {
    rawExtra.push(
      ...body.urls
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  } else if (Array.isArray(body.urls)) {
    for (const u of body.urls) {
      if (typeof u === 'string' && u.trim()) rawExtra.push(u.trim());
    }
  }

  const toUpsert: Array<{ url: string; kind: string }> = [];
  const website = (venue.website_url as string | null)?.trim();
  if (website && isHttpUrl(website)) {
    toUpsert.push({ url: website, kind: 'website' });
  }
  for (const url of [...new Set(rawExtra)]) {
    if (!isHttpUrl(url)) continue;
    if (toUpsert.some((t) => t.url === url)) continue;
    toUpsert.push({ url, kind: extraKind });
  }

  if (toUpsert.length === 0) {
    return NextResponse.json(
      {
        error:
          'Venue has no website_url and no valid urls provided — add at least one URL',
      },
      { status: 400 },
    );
  }

  let created = 0;
  let updated = 0;
  const errors: Array<{ url: string; error: string }> = [];

  for (const item of toUpsert) {
    const { data: existing } = await supabase
      .from('venue_scrape_pages')
      .select('id, venue_id, borough, kind')
      .eq('url', item.url)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('venue_scrape_pages')
        .update({
          venue_id: venueId,
          borough: borough ?? existing.borough,
          kind: existing.kind || item.kind,
          enabled: true,
          source: 'manual',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) errors.push({ url: item.url, error: error.message });
      else updated += 1;
      continue;
    }

    const { error } = await supabase.from('venue_scrape_pages').insert({
      url: item.url,
      kind: item.kind,
      borough,
      enabled: true,
      source: 'manual',
      venue_id: venueId,
    });
    if (error) errors.push({ url: item.url, error: error.message });
    else created += 1;
  }

  return NextResponse.json({
    ok: true,
    venueId,
    venueName: venue.name,
    borough,
    created,
    updated,
    errors,
  });
}
