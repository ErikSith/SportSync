import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireDevAdmin } from '@/lib/auth/dev-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ venueId: string }> };

/**
 * DELETE /api/dev/scrape-venues/[venueId]
 * Removes venue from Admin Reviewer DB (venues row) after clearing scrape pages.
 * Query: ?hard=1 (required) — soft disable of pages is no longer used for list removal.
 * Body optional: { hard?: boolean }
 *
 * Does NOT cascade-delete events/lobbies; nulls venue_id on scrape pages first,
 * then deletes the venue. Related listings keep historical rows with null venue.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  const { venueId } = await context.params;
  if (!venueId) {
    return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  let hard = searchParams.get('hard') === '1';
  try {
    const body = (await request.json().catch(() => ({}))) as { hard?: unknown };
    if (body.hard === true) hard = true;
  } catch {
    // no body
  }

  if (!hard) {
    return NextResponse.json(
      {
        error:
          'Odstránenie športoviska vyžaduje hard=1 (vymaže venue z DB + scrape URL).',
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: pages, error: pageError } = await supabase
    .from('venue_scrape_pages')
    .delete()
    .eq('venue_id', venueId)
    .select('id');

  if (pageError) {
    return NextResponse.json({ error: pageError.message }, { status: 500 });
  }

  // Detach FKs that would block venue delete (SetNull where possible).
  await supabase.from('events').update({ venue_id: null }).eq('venue_id', venueId);
  await supabase.from('lobbies').update({ venue_id: null }).eq('venue_id', venueId);
  await supabase.from('tournaments').update({ venue_id: null }).eq('venue_id', venueId);
  await supabase.from('training_lessons').update({ venue_id: null }).eq('venue_id', venueId);
  await supabase.from('sport_group_activities').update({ venue_id: null }).eq('venue_id', venueId);

  const { error: venueError } = await supabase
    .from('venues')
    .delete()
    .eq('id', venueId);

  if (venueError) {
    return NextResponse.json(
      {
        error: `Scrape URL vymazané (${pages?.length ?? 0}), ale venue sa nepodarilo zmazať: ${venueError.message}`,
        removedCount: pages?.length ?? 0,
        venueDeleted: false,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    venueId,
    mode: 'deleted',
    removedCount: pages?.length ?? 0,
    venueDeleted: true,
  });
}
