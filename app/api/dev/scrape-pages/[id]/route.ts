import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireDevAdmin } from '@/lib/auth/dev-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/dev/scrape-pages/[id]
 * Body: { contentSelector?, kind?, enabled?, bookingProvider?, bookingSubject? }
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  let body: {
    contentSelector?: unknown;
    kind?: unknown;
    enabled?: unknown;
    bookingProvider?: unknown;
    bookingSubject?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ('contentSelector' in body) {
    const raw = body.contentSelector;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        update.content_selector = null;
      } else if (/^https?:\/\//i.test(trimmed)) {
        return NextResponse.json(
          {
            error:
              'contentSelector is a CSS selector (e.g. .events-list), not a URL. Add extra pages via „Ďalšie URL“.',
          },
          { status: 400 },
        );
      } else {
        update.content_selector = trimmed.slice(0, 500);
      }
    } else if (raw == null) {
      update.content_selector = null;
    } else {
      return NextResponse.json(
        { error: 'contentSelector must be string or null' },
        { status: 400 },
      );
    }
  }

  if (typeof body.kind === 'string') {
    const kind = body.kind.trim().toLowerCase();
    const allowed = new Set([
      'website',
      'tournaments',
      'schedule',
      'events',
      'availability',
      'kids_camps',
      'other',
    ]);
    if (!allowed.has(kind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }
    update.kind = kind;
  }

  if (typeof body.enabled === 'boolean') {
    update.enabled = body.enabled;
  }

  if ('bookingProvider' in body) {
    const raw = body.bookingProvider;
    if (raw == null || raw === '') {
      update.booking_provider = null;
    } else if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      if (v === 'auto' || v === 'gemini' || v === 'none') {
        update.booking_provider = null;
      } else if (v === 'reenio') {
        update.booking_provider = 'reenio';
      } else {
        return NextResponse.json(
          { error: 'bookingProvider must be null or reenio' },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { error: 'bookingProvider must be string or null' },
        { status: 400 },
      );
    }
  }

  if ('bookingSubject' in body) {
    const raw = body.bookingSubject;
    if (raw == null || raw === '') {
      update.booking_subject = null;
    } else if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase().slice(0, 80);
      if (!/^[a-z0-9-]+$/.test(v)) {
        return NextResponse.json(
          { error: 'bookingSubject must be a subdomain slug (e.g. eterna)' },
          { status: 400 },
        );
      }
      update.booking_subject = v;
    } else {
      return NextResponse.json(
        { error: 'bookingSubject must be string or null' },
        { status: 400 },
      );
    }
  }

  if (Object.keys(update).length <= 1) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('venue_scrape_pages')
    .update(update)
    .eq('id', id)
    .select(
      'id, content_selector, kind, enabled, booking_provider, booking_subject',
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    contentSelector: data.content_selector ?? null,
    kind: data.kind,
    enabled: data.enabled,
    bookingProvider: data.booking_provider ?? null,
    bookingSubject: data.booking_subject ?? null,
  });
}

/**
 * DELETE /api/dev/scrape-pages/[id]
 * Permanently removes a bad scrape URL from the registry.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('venue_scrape_pages')
    .delete()
    .eq('id', id)
    .select('id, url')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: data.id, url: data.url });
}
