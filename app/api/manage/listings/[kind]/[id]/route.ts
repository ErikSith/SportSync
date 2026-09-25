import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getProfileByAuthId } from '@/lib/data/profile';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { getOwnedVenuesForProfile } from '@/lib/data/organizer-venues';
import { EVENT_SPORTS } from '@/lib/constants/sports';
import {
  formatAppTime,
  parseDbInstant,
  toAppDateKey,
} from '@/lib/datetime/bratislava';
import { createChipFromListing, applyManageWatchMarker, stripManageWatchMarker } from '@/lib/manage/listing-bucket';

export const runtime = 'edge';

type ListingKind = 'event' | 'tournament';

const audienceSchema = z.enum(['all', 'women', 'kids', 'men']);
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeKeySchema = z.string().regex(/^\d{2}:\d{2}$/);

const updateListingSchema = z.object({
  title: z.string().min(3).max(120),
  sport: z.enum(EVENT_SPORTS),
  date: dateKeySchema,
  time: timeKeySchema,
  venueId: z.string().uuid().optional().nullable(),
  place: z.string().max(200).optional().default(''),
  price: z.number().min(0).default(0),
  description: z.string().max(2000).optional().default(''),
  audience: audienceSchema.default('all'),
  participation: z.enum(['participate', 'spectator']).default('participate'),
  link: z
    .string()
    .max(500)
    .optional()
    .default('')
    .transform((s) => s.trim())
    .refine((s) => !s || /^https?:\/\/.+/i.test(s), {
      message: 'Link must be an http(s) URL',
    }),
  endDate: dateKeySchema.optional().nullable(),
  /** Set to URL to replace banner; null to clear; omit to leave unchanged. */
  coverUrl: z
    .union([
      z
        .string()
        .max(2000)
        .refine((s) => /^https?:\/\/.+/i.test(s.trim()), {
          message: 'Cover must be an http(s) URL',
        })
        .transform((s) => s.trim()),
      z.null(),
    ])
    .optional(),
});

function parseKind(raw: string): ListingKind | null {
  if (raw === 'event' || raw === 'tournament') return raw;
  return null;
}

function audienceFlags(audience: z.infer<typeof audienceSchema>): {
  forKids: boolean;
  forWomen: boolean;
  audienceTarget: string;
} {
  if (audience === 'kids') {
    return { forKids: true, forWomen: false, audienceTarget: 'kids' };
  }
  if (audience === 'women') {
    return { forKids: false, forWomen: true, audienceTarget: 'women' };
  }
  if (audience === 'men') {
    return { forKids: false, forWomen: false, audienceTarget: 'men' };
  }
  return { forKids: false, forWomen: false, audienceTarget: 'all' };
}

function audienceFromFlags(forKids: boolean, forWomen: boolean, theme?: unknown): z.infer<typeof audienceSchema> {
  const target =
    theme && typeof theme === 'object' && theme !== null && 'audienceTarget' in theme
      ? String((theme as { audienceTarget?: string }).audienceTarget ?? '')
      : '';
  if (target === 'men' || target === 'kids' || target === 'women' || target === 'all') {
    return target;
  }
  if (forKids) return 'kids';
  if (forWomen) return 'women';
  return 'all';
}

function combineLocalDateTime(date: string, time: string): Date {
  const winter = new Date(`${date}T${time}:00+01:00`);
  const summer = new Date(`${date}T${time}:00+02:00`);
  for (const candidate of [summer, winter]) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Bratislava',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(candidate);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const wall = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
    if (wall === `${date}T${time}`) return candidate;
  }
  return new Date(`${date}T${time}:00`);
}

function customPlaceFromTheme(theme: unknown): string {
  if (!theme || typeof theme !== 'object') return '';
  const place = (theme as { customPlace?: unknown }).customPlace;
  return typeof place === 'string' ? place : '';
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind: kindRaw, id } = await context.params;
  const kind = parseKind(kindRaw);
  if (!kind || !id) {
    return NextResponse.json({ error: 'Invalid listing' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const profile = await getProfileByAuthId(auth.user.id);
  if (!profile || !canAccessManageHub(profile.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  if (kind === 'tournament') {
    const { data, error } = await supabase
      .from('tournaments')
      .select(
        'id, name, description, sport, starts_at, ends_at, entry_fee, venue_id, for_kids, for_women, source_url, ticket_url, cover_url',
      )
      .eq('id', id)
      .eq('organizer_id', profile.id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const startsAt = parseDbInstant(data.starts_at as string);
    const endsAt = data.ends_at ? parseDbInstant(data.ends_at as string) : null;
    const parsedDesc = stripManageWatchMarker((data.description as string | null) ?? '');

    return NextResponse.json({
      ok: true,
      kind,
      createKind: 'tournament' as const,
      id: data.id,
      title: data.name,
      sport: data.sport,
      date: toAppDateKey(startsAt),
      time: formatAppTime(startsAt),
      endDate: endsAt ? toAppDateKey(endsAt) : null,
      venueId: data.venue_id,
      place: '',
      price: Number(data.entry_fee ?? 0),
      description: parsedDesc.description,
      audience: audienceFromFlags(
        Boolean(data.for_kids),
        Boolean(data.for_women),
      ),
      participation: parsedDesc.participation,
      link: (data.ticket_url as string | null) || (data.source_url as string | null) || '',
      coverUrl: (data.cover_url as string | null) ?? null,
    });
  }

  const { data, error } = await supabase
    .from('events')
    .select(
      'id, title, description, sport, starts_at, end_time, price, venue_id, for_kids, for_women, source_url, ticket_url, theme_config, participation_mode, cover_url',
    )
    .eq('id', id)
    .eq('organizer_id', profile.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const startsAt = parseDbInstant(data.starts_at as string);
  const endsAt = data.end_time ? parseDbInstant(data.end_time as string) : null;
  const theme = data.theme_config;
  const participation =
    data.participation_mode === 'spectator' ? 'spectator' : 'participate';

  return NextResponse.json({
    ok: true,
    kind,
    createKind: createChipFromListing('event', theme),
    id: data.id,
    title: data.title,
    sport: data.sport,
    date: toAppDateKey(startsAt),
    time: formatAppTime(startsAt),
    endDate: endsAt ? toAppDateKey(endsAt) : null,
    venueId: data.venue_id,
    place: customPlaceFromTheme(theme),
    price: Number(data.price ?? 0),
    description: data.description ?? '',
    audience: audienceFromFlags(
      Boolean(data.for_kids),
      Boolean(data.for_women),
      theme,
    ),
    participation,
    link: (data.ticket_url as string | null) || (data.source_url as string | null) || '',
    coverUrl: (data.cover_url as string | null) ?? null,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind: kindRaw, id } = await context.params;
  const kind = parseKind(kindRaw);
  if (!kind || !id) {
    return NextResponse.json({ error: 'Invalid listing' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const profile = await getProfileByAuthId(auth.user.id);
  if (!profile || !canAccessManageHub(profile.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateListingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid listing payload', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const startsAt = combineLocalDateTime(input.date, input.time);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: 'Invalid start time' }, { status: 400 });
  }

  const audience = audienceFlags(input.audience);
  const participation = input.participation;
  const descriptionRaw =
    input.description.trim().length >= 3
      ? input.description.trim()
      : `${input.title.trim()} — ${input.sport}`;
  const description =
    kind === 'tournament'
      ? applyManageWatchMarker(descriptionRaw, participation)
      : descriptionRaw;
  const externalLink = input.link.length > 0 ? input.link : null;
  const coverUrlPatch =
    input.coverUrl === undefined ? undefined : input.coverUrl;

  let cityName = profile.city ?? 'Bratislava';
  let latitude: number | null = null;
  let longitude: number | null = null;
  let venueId: string | null = input.venueId ?? null;
  const customPlace = input.place.trim();

  if (venueId) {
    const owned = await getOwnedVenuesForProfile(profile.id);
    const mine = owned.find((v) => v.id === venueId);
    if (!mine) {
      return NextResponse.json(
        { error: 'You can only publish at a venue you own.' },
        { status: 403 },
      );
    }
    const { data: venue } = await supabase
      .from('venues')
      .select('name, city, latitude, longitude')
      .eq('id', venueId)
      .eq('owner_id', profile.id)
      .maybeSingle();
    if (!venue) {
      return NextResponse.json(
        { error: 'You can only publish at a venue you own.' },
        { status: 403 },
      );
    }
    cityName = (venue.city as string) ?? cityName;
    latitude = (venue.latitude as number | null) ?? null;
    longitude = (venue.longitude as number | null) ?? null;
  } else if (!customPlace && !venueId) {
    // Edit may keep a listing without a mapped venue (city-only).
    cityName = profile.city ?? 'Bratislava';
  }

  if (kind === 'tournament') {
    const { data: existing, error: existingError } = await supabase
      .from('tournaments')
      .select('id, starts_at')
      .eq('id', id)
      .eq('organizer_id', profile.id)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const prevStarts = parseDbInstant(existing.starts_at as string);
    const scheduleChanged =
      toAppDateKey(prevStarts) !== input.date || formatAppTime(prevStarts) !== input.time;
    if (scheduleChanged && startsAt <= new Date()) {
      return NextResponse.json({ error: 'Start must be in the future' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('tournaments')
      .update({
        name: input.title,
        description,
        sport: input.sport,
        entry_fee: input.price,
        venue_id: venueId,
        city: cityName,
        latitude,
        longitude,
        starts_at: startsAt.toISOString(),
        for_kids: audience.forKids,
        for_women: audience.forWomen,
        source_url: externalLink,
        ticket_url: externalLink,
        ...(coverUrlPatch !== undefined ? { cover_url: coverUrlPatch } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organizer_id', profile.id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, kind, id, href: '/tournaments' });
  }

  const { data: existing, error: existingError } = await supabase
    .from('events')
    .select('id, starts_at, theme_config')
    .eq('id', id)
    .eq('organizer_id', profile.id)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const prevStarts = parseDbInstant(existing.starts_at as string);
  const scheduleChanged =
    toAppDateKey(prevStarts) !== input.date || formatAppTime(prevStarts) !== input.time;
  if (scheduleChanged && startsAt <= new Date()) {
    return NextResponse.json({ error: 'Start must be in the future' }, { status: 400 });
  }

  const prevTheme =
    existing.theme_config && typeof existing.theme_config === 'object'
      ? (existing.theme_config as Record<string, unknown>)
      : {};
  const themeConfig = {
    ...prevTheme,
    audienceTarget: audience.audienceTarget,
    ...(venueId ? {} : { customPlace }),
  };
  if (venueId) {
    const { customPlace: _drop, ...rest } = themeConfig as Record<string, unknown> & {
      customPlace?: unknown;
    };
    Object.assign(themeConfig, rest);
    delete (themeConfig as { customPlace?: unknown }).customPlace;
  }

  const endDate =
    input.endDate && input.endDate >= input.date ? input.endDate : null;
  const endsAt =
    endDate && endDate > input.date
      ? combineLocalDateTime(endDate, '18:00')
      : null;

  const eventDescription = venueId
    ? description
    : `${description}${customPlace ? `\n\nMiesto: ${customPlace}` : ''}`;

  const { error: updateError } = await supabase
    .from('events')
    .update({
      title: input.title,
      description: eventDescription,
      sport: input.sport,
      price: input.price,
      venue_id: venueId,
      city: cityName,
      latitude,
      longitude,
      starts_at: startsAt.toISOString(),
      event_date: startsAt.toISOString(),
      start_time: startsAt.toISOString(),
      end_time: endsAt ? endsAt.toISOString() : null,
      for_kids: audience.forKids,
      for_women: audience.forWomen,
      participation_mode: participation,
      source_url: externalLink,
      ticket_url: externalLink,
      theme_config: themeConfig,
      ...(coverUrlPatch !== undefined ? { cover_url: coverUrlPatch } : {}),
    })
    .eq('id', id)
    .eq('organizer_id', profile.id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, kind, id, href: '/events' });
}
