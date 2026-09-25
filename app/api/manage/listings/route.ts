import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getProfileByAuthId } from '@/lib/data/profile';
import { canAccessManageHub } from '@/lib/auth/tournament-access';
import { getOwnedVenuesForProfile } from '@/lib/data/organizer-venues';
import { EVENT_SPORTS } from '@/lib/constants/sports';
import {
  applyManageWatchMarker,
  listingPersistFields,
  manageListingSuccessPath,
  type ManageListingBucket,
} from '@/lib/manage/listing-bucket';
import { emitDomainEvent } from '@/lib/orchestration/emit';
import { DOMAIN_EVENTS } from '@/lib/orchestration/types';

export const runtime = 'edge';

const audienceSchema = z.enum(['all', 'women', 'kids', 'men']);

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeKeySchema = z.string().regex(/^\d{2}:\d{2}$/);

const campSessionSchema = z.object({
  date: dateKeySchema,
  endDate: dateKeySchema.optional(),
});

const createListingSchema = z.object({
  kind: z.enum([
    'event',
    'tournament',
    'group_class',
    'camp',
    'workshop',
    'course',
  ]),
  title: z.string().min(3).max(120),
  sport: z.enum(EVENT_SPORTS),
  date: dateKeySchema,
  time: timeKeySchema,
  venueId: z.string().uuid().optional().nullable(),
  place: z.string().max(200).optional().default(''),
  price: z.number().min(0).default(0),
  description: z.string().max(2000).optional().default(''),
  audience: audienceSchema.default('all'),
  /** participate = Pripojiť sa / Hrať; spectator = Sledovať. */
  participation: z.enum(['participate', 'spectator']).default('participate'),
  /** External CTA URL — stored as ticket_url + source_url for in-app deep links. */
  link: z
    .string()
    .max(500)
    .optional()
    .default('')
    .transform((s) => s.trim())
    .refine((s) => !s || /^https?:\/\/.+/i.test(s), {
      message: 'Link must be an http(s) URL',
    }),
  /** Camp turnusy — one event row per session, linked by campSeriesId. */
  sessions: z.array(campSessionSchema).min(1).max(12).optional(),
  /** Multi-day workshop (and similar) — last calendar day, inclusive. */
  endDate: dateKeySchema.optional(),
  /** Optional banner for this listing only (cover_url). */
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

function kindToBucket(
  kind: z.infer<typeof createListingSchema>['kind'],
): ManageListingBucket | 'tournament' {
  if (kind === 'tournament') return 'tournament';
  if (kind === 'camp') return 'camps';
  if (kind === 'workshop') return 'workshops';
  if (kind === 'course') return 'courses';
  if (kind === 'group_class') return 'group_class';
  return 'event';
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

function combineLocalDateTime(date: string, time: string): Date {
  // Pick Europe/Bratislava offset (+01 / +02) that round-trips to the wall clock.
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

export async function POST(request: Request) {
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
  const parsed = createListingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid listing payload', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const hasCampSessions =
    input.kind === 'camp' && input.sessions && input.sessions.length > 0;
  const startsAt = combineLocalDateTime(input.date, input.time);
  if (
    !hasCampSessions &&
    (Number.isNaN(startsAt.getTime()) || startsAt <= new Date())
  ) {
    return NextResponse.json({ error: 'Start must be in the future' }, { status: 400 });
  }

  const audience = audienceFlags(input.audience);
  const bucket = kindToBucket(input.kind);
  const participation = input.participation;
  const descriptionRaw =
    input.description.trim().length >= 3
      ? input.description.trim()
      : `${input.title.trim()} — ${input.sport}`;
  const description =
    bucket === 'tournament'
      ? applyManageWatchMarker(descriptionRaw, participation)
      : descriptionRaw;
  const externalLink = input.link.length > 0 ? input.link : null;
  const coverUrl = input.coverUrl ?? null;

  let cityName = profile.city ?? 'Bratislava';
  let latitude: number | null = null;
  let longitude: number | null = null;
  let venueId: string | null = input.venueId ?? null;
  const customPlace = input.place.trim();

  // Strict ownership — never bind someone else's venue (admins included).
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
  } else if (!customPlace) {
    return NextResponse.json(
      { error: 'Pick your venue or enter a custom place.' },
      { status: 400 },
    );
  }

  if (bucket === 'tournament') {
    let registrationDeadline = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
    if (registrationDeadline <= new Date()) {
      registrationDeadline = new Date(Date.now() + 60 * 60 * 1000);
    }

    const { data: tournament, error: insertError } = await supabase
      .from('tournaments')
      .insert({
        organizer_id: auth.user.id,
        venue_id: venueId,
        name: input.title,
        description,
        sport: input.sport,
        format: 'SINGLE_ELIMINATION',
        status: 'REGISTRATION_OPEN',
        entry_fee: input.price,
        max_participants: 16,
        current_participants: 0,
        skill_level_min: null,
        skill_level_max: null,
        city: cityName,
        latitude,
        longitude,
        registration_deadline: registrationDeadline.toISOString(),
        starts_at: startsAt.toISOString(),
        ends_at: null,
        for_kids: audience.forKids,
        for_women: audience.forWomen,
        source_url: externalLink,
        ticket_url: externalLink,
        ...(coverUrl ? { cover_url: coverUrl } : {}),
      })
      .select('id')
      .single();

    if (insertError || !tournament) {
      return NextResponse.json(
        { ok: false, error: insertError?.message ?? 'Could not create tournament' },
        { status: 500 },
      );
    }

    await emitDomainEvent({
      name: DOMAIN_EVENTS.EVENT_CREATED,
      payload: {
        entityType: 'tournament',
        entityId: tournament.id as string,
        sport: input.sport,
        latitude,
        longitude,
        userId: auth.user.id,
        title: input.title,
        city: cityName,
        type: 'official',
      },
    });

    return NextResponse.json({
      ok: true,
      kind: 'tournament',
      id: tournament.id,
      href: '/tournaments',
    });
  }

  const persist = listingPersistFields(bucket);
  const baseTheme = {
    ...persist.themeConfig,
    audienceTarget: audience.audienceTarget,
    ...(venueId ? {} : { customPlace }),
  };

  const eventDescription = venueId
    ? description
    : `${description}${customPlace ? `\n\nMiesto: ${customPlace}` : ''}`;

  // Kids camps: one DB row per turnus, shared campSeriesId → one collapsed feed card.
  const campSessions =
    bucket === 'camps' && input.sessions && input.sessions.length > 0
      ? input.sessions.map((s) => {
          const endDate =
            s.endDate && s.endDate >= s.date ? s.endDate : s.date;
          return { date: s.date, endDate };
        })
      : null;

  const seriesId =
    campSessions && campSessions.length > 0
      ? typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `camp-${Date.now().toString(36)}`
      : null;

  const workshopEndDate =
    bucket === 'workshops' &&
    input.endDate &&
    input.endDate >= input.date
      ? input.endDate
      : null;
  const workshopMultiDay = Boolean(
    workshopEndDate && workshopEndDate > input.date,
  );

  const sessionSpecs =
    campSessions?.map((s) => ({
      startsAt: combineLocalDateTime(s.date, '09:00'),
      endsAt:
        s.endDate > s.date ? combineLocalDateTime(s.endDate, '18:00') : null,
      dateOnly: true as const,
    })) ?? [
      {
        startsAt,
        endsAt: workshopMultiDay
          ? combineLocalDateTime(workshopEndDate!, '18:00')
          : null,
        // Multi-day workshops: keep start wall-clock, persist end as later calendar day.
        dateOnly: false as const,
      },
    ];

  // All camp turnus starts must be in the future.
  for (const spec of sessionSpecs) {
    if (Number.isNaN(spec.startsAt.getTime()) || spec.startsAt <= new Date()) {
      return NextResponse.json(
        { error: 'Each camp session start must be in the future' },
        { status: 400 },
      );
    }
  }

  const createdIds: string[] = [];
  for (let i = 0; i < sessionSpecs.length; i++) {
    const spec = sessionSpecs[i]!;
    const themeConfig = {
      ...baseTheme,
      ...(seriesId
        ? {
            campSeriesId: seriesId,
            turnusIndex: i + 1,
            turnusCount: sessionSpecs.length,
          }
        : {}),
    };

    const { data: event, error: insertError } = await supabase
      .from('events')
      .insert({
        organizer_id: auth.user.id,
        venue_id: venueId,
        type: 'official',
        status: 'open',
        sport: input.sport,
        title: input.title,
        description: eventDescription,
        city: cityName,
        latitude,
        longitude,
        price: input.price,
        capacity: null,
        starts_at: spec.startsAt.toISOString(),
        event_date: spec.startsAt.toISOString(),
        // Date-only for multi-day camp turnusy (no fake HH:MM in the feed).
        start_time: spec.dateOnly ? null : spec.startsAt.toISOString(),
        end_time: spec.endsAt ? spec.endsAt.toISOString() : null,
        theme_config: themeConfig,
        for_kids: audience.forKids || bucket === 'camps',
        for_women: audience.forWomen,
        participation_mode: participation,
        source_url: externalLink,
        ticket_url: externalLink,
        ...(coverUrl ? { cover_url: coverUrl } : {}),
        ...(persist.externalId ? { external_id: persist.externalId } : {}),
      })
      .select('id')
      .single();

    if (insertError || !event) {
      return NextResponse.json(
        {
          ok: false,
          error: insertError?.message ?? 'Could not create listing',
          createdIds,
        },
        { status: 500 },
      );
    }

    createdIds.push(event.id as string);

    await emitDomainEvent({
      name: DOMAIN_EVENTS.EVENT_CREATED,
      payload: {
        entityType: 'event',
        entityId: event.id as string,
        sport: input.sport,
        latitude,
        longitude,
        userId: auth.user.id,
        title: input.title,
        city: cityName,
        type: 'official',
      },
    });
  }

  return NextResponse.json({
    ok: true,
    kind: bucket,
    id: createdIds[0],
    ids: createdIds,
    campSeriesId: seriesId,
    href: manageListingSuccessPath(bucket),
  });
}
