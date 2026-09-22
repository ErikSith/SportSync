import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireDevAdmin } from '@/lib/auth/dev-admin';
import {
  mergeAmenitiesWithSchedule,
  parseGroupClassSchedule,
} from '@/lib/dev/group-class-schedule';
import { resolveVenueDistrictSlug } from '@/lib/scrape/bratislava-location';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/dev/venues/[id]
 * Body: { name?, address?, websiteUrl?, district?, sports?, description?, groupClassSchedule? }
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireDevAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  let body: {
    name?: unknown;
    address?: unknown;
    websiteUrl?: unknown;
    district?: unknown;
    sports?: unknown;
    description?: unknown;
    groupClassSchedule?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ('address' in body) {
    update.address =
      typeof body.address === 'string' ? body.address.trim() || null : null;
  }
  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
    }
    update.name = body.name.trim().slice(0, 200);
  }
  if ('websiteUrl' in body) {
    if (body.websiteUrl == null || body.websiteUrl === '') {
      update.website_url = null;
    } else if (typeof body.websiteUrl === 'string') {
      const trimmed = body.websiteUrl.trim();
      try {
        const u = new URL(trimmed);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return NextResponse.json({ error: 'Invalid websiteUrl' }, { status: 400 });
        }
        update.website_url = trimmed;
      } catch {
        return NextResponse.json({ error: 'Invalid websiteUrl' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'websiteUrl must be string or null' }, { status: 400 });
    }
  }
  if ('district' in body) {
    update.district =
      typeof body.district === 'string'
        ? body.district.trim().toLowerCase() || null
        : null;
  }
  if ('description' in body) {
    update.description =
      typeof body.description === 'string' ? body.description.trim() || null : null;
  }
  if ('sports' in body) {
    if (Array.isArray(body.sports)) {
      update.sports = body.sports
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (typeof body.sports === 'string') {
      update.sports = body.sports
        .split(/[,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (body.sports == null) {
      update.sports = [];
    } else {
      return NextResponse.json({ error: 'sports must be string[] or string' }, { status: 400 });
    }
  }

  const supabase = createAdminClient();

  // Keep venues.district aligned with address across the app (feed filters, scrapes).
  if ('address' in body || 'name' in body || 'district' in body) {
    const { data: existingLoc, error: locErr } = await supabase
      .from('venues')
      .select('name, address')
      .eq('id', id)
      .maybeSingle();
    if (locErr) {
      return NextResponse.json({ error: locErr.message }, { status: 500 });
    }
    if (!existingLoc) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }
    const nextAddress =
      'address' in update
        ? ((update.address as string | null) ?? '')
        : ((existingLoc.address as string | null) ?? '');
    const nextName =
      'name' in update
        ? String(update.name ?? '')
        : ((existingLoc.name as string | null) ?? '');
    const resolved = resolveVenueDistrictSlug(nextAddress, nextName);
    if (resolved) {
      update.district = resolved;
    }
  }

  if ('groupClassSchedule' in body) {
    const schedule = parseGroupClassSchedule(body.groupClassSchedule);
    const { data: existing, error: readErr } = await supabase
      .from('venues')
      .select('amenities')
      .eq('id', id)
      .maybeSingle();
    if (readErr) {
      return NextResponse.json({ error: readErr.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }
    update.amenities = mergeAmenitiesWithSchedule(existing.amenities, schedule);
  }

  if (Object.keys(update).length <= 1) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('venues')
    .update(update)
    .eq('id', id)
    .select(
      'id, name, address, city, district, sports, website_url, description, verified, amenities',
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    venue: {
      id: data.id,
      name: data.name,
      address: data.address ?? null,
      city: data.city,
      district: data.district ?? null,
      sports: data.sports ?? [],
      websiteUrl: data.website_url ?? null,
      description: data.description ?? null,
      verified: Boolean(data.verified),
    },
    groupClassSchedule: parseGroupClassSchedule(
      (data.amenities as Record<string, unknown> | null)?.groupClassSchedule,
    ),
  });
}
