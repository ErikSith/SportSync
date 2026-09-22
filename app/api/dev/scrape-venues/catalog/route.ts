import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireDevAdmin } from '@/lib/auth/dev-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/dev/scrape-venues/catalog
 * Search venues to add into scrape registry.
 * Query: q, borough/district, limit, onlyWithoutPages=1
 */
export async function GET(request: Request) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const borough = searchParams.get('borough')?.trim().toLowerCase() || null;
  const onlyWithoutPages = searchParams.get('onlyWithoutPages') === '1';
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 20) || 20));

  const supabase = createAdminClient();

  let query = supabase
    .from('venues')
    .select('id, name, city, district, website_url')
    .order('name', { ascending: true })
    .limit(limit);

  if (borough) {
    query = query.eq('district', borough);
  }
  if (q) {
    query = query.or(`name.ilike.%${q}%,website_url.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let venues = (data ?? []).map((v) => ({
    id: v.id as string,
    name: v.name as string,
    city: (v.city as string | null) ?? null,
    district: (v.district as string | null) ?? null,
    websiteUrl: (v.website_url as string | null) ?? null,
  }));

  if (onlyWithoutPages && venues.length > 0) {
    const ids = venues.map((v) => v.id);
    const { data: pages } = await supabase
      .from('venue_scrape_pages')
      .select('venue_id')
      .in('venue_id', ids)
      .eq('enabled', true);

    const withPages = new Set(
      (pages ?? [])
        .map((p) => p.venue_id as string | null)
        .filter((id): id is string => Boolean(id)),
    );
    venues = venues.filter((v) => !withPages.has(v.id));
  }

  return NextResponse.json({ ok: true, venues });
}
