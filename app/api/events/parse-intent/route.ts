import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseStructuredEventIntent } from '@/lib/ai/event-parse-structured';
import { canCreateOfficialEvent } from '@/lib/auth/tournament-access';
import { findCityByName } from '@/lib/cities';

export const runtime = 'edge';

const parseIntentSchema = z.object({
  brief: z.string().min(12).max(4000),
  photos: z.array(z.string().url()).max(12).default([]),
  organizerName: z.string().min(1).max(80).optional(),
  defaultCity: z.string().optional(),
  mode: z.enum(['community', 'official']).default('community'),
});

/**
 * POST /api/events/parse-intent
 *
 * AI-Driven Event Factory — Structured Text Extraction. Accepts a raw brief
 * (free text + optional image URLs) from a Venue Owner and returns a fully
 * structured event intent: location, timing, pricing, sport family, rules,
 * schedule, a suggested dynamic themeConfig, and extracted sponsors. Uses an
 * LLM with JSON-schema output when configured, otherwise a deterministic
 * heuristic extractor. Does NOT persist anything — the client reviews and
 * then POSTs to /api/ai/events/ingest (or the venue events route) to publish.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = parseIntentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request payload', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, username')
    .eq('id', auth.user.id)
    .maybeSingle();

  const role = (profile?.role as string) ?? 'PLAYER';
  if (input.mode === 'official' && !canCreateOfficialEvent(role)) {
    return NextResponse.json(
      { ok: false, error: 'Only venue managers and admins can create official events.' },
      { status: 403 },
    );
  }

  let result;
  try {
    result = await parseStructuredEventIntent({
      brief: input.brief,
      photos: input.photos,
      organizerName: input.organizerName ?? profile?.full_name ?? profile?.username ?? null,
      defaultCity: input.defaultCity ?? profile?.full_name ? undefined : undefined,
      mode: input.mode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not parse event brief';
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }

  const intent = result.intent;

  // Light validation: city must be supported.
  if (!findCityByName(intent.city)) {
    return NextResponse.json(
      { ok: false, error: `Unsupported city "${intent.city}"`, source: result.source },
      { status: 422 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      source: result.source,
      intent: {
        title: intent.title,
        sport: intent.sport,
        sportType: intent.sportType,
        description: intent.description,
        city: intent.city,
        location: intent.location,
        eventDate: intent.eventDate,
        startTime: intent.startTime,
        endTime: intent.endTime,
        startsAt: intent.startsAt,
        priceCents: intent.priceCents,
        currency: intent.currency,
        maxParticipants: intent.maxParticipants,
        entryRequirements: intent.entryRequirements,
        rules: intent.rules,
        schedule: intent.schedule,
        themeConfig: intent.themeConfig,
        sponsors: intent.sponsors,
        aiManagementPlan: intent.aiManagementPlan,
        suggestedVenueHint: intent.suggestedVenueHint,
      },
    },
    { status: 200 },
  );
}