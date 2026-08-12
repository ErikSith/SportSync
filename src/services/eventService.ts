import { Event, EventStatus, EventType, Prisma, Sport, UserRole, Venue } from '@prisma/client';
import { config } from '../config';
import { boundingBox, distanceKm } from '../lib/geo';
import { resolveCity } from '../lib/geocode';
import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/errorHandler';
import { awardKarma } from './karmaService';

export interface EventWithDistance extends Event {
  distanceKm: number;
}

interface NearbyQuery {
  lat: number;
  lng: number;
  sport?: Sport;
  city?: string;
  radiusKm: number;
}

async function findEventsWithinRadius(query: NearbyQuery): Promise<EventWithDistance[]> {
  const box = boundingBox(query.lat, query.lng, query.radiusKm);

  const where: Prisma.EventWhereInput = {
    status: EventStatus.OPEN,
    dateTime: { gte: new Date() },
    lat: { gte: box.minLat, lte: box.maxLat },
    lng: { gte: box.minLng, lte: box.maxLng },
  };
  if (query.sport) where.sport = query.sport;
  if (query.city) where.city = { equals: query.city, mode: 'insensitive' };

  const candidates = await prisma.event.findMany({
    where,
    include: {
      participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
    },
    orderBy: { dateTime: 'asc' },
  });

  return candidates
    .map((event) => ({
      ...event,
      distanceKm: Math.round(distanceKm(query.lat, query.lng, event.lat, event.lng) * 10) / 10,
    }))
    .filter((event) => event.distanceKm <= query.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Frontend feed: events within DEFAULT_RADIUS_KM (20 km). When nothing is found,
 * automatically widens the search to EXTENDED_RADIUS_KM (50 km) and sets
 * `show_extended: true` so the UI can render
 * "Nothing nearby? Check out matches 50km away."
 */
export async function getEventsFeed(params: Omit<NearbyQuery, 'radiusKm'>) {
  const nearby = await findEventsWithinRadius({ ...params, radiusKm: config.defaultRadiusKm });

  if (nearby.length > 0) {
    return {
      events: nearby,
      radius_km: config.defaultRadiusKm,
      show_extended: false,
    };
  }

  const extended = await findEventsWithinRadius({ ...params, radiusKm: config.extendedRadiusKm });
  return {
    events: extended,
    radius_km: config.extendedRadiusKm,
    show_extended: true,
    message: `Nothing nearby? Check out matches ${config.extendedRadiusKm}km away.`,
  };
}

export async function joinEvent(eventId: string, userId: string, isMercenary = false) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new HttpError(404, 'Event not found');
    }
    if (event.status !== EventStatus.OPEN) {
      throw new HttpError(409, `Event is ${event.status}, cannot join`);
    }
    if (event.currentPlayers >= event.maxPlayers) {
      throw new HttpError(409, 'Event is already full');
    }

    await tx.eventParticipant.create({
      data: { eventId, userId, isMercenary },
    });

    const currentPlayers = event.currentPlayers + 1;
    const updated = await tx.event.update({
      where: { id: eventId },
      data: {
        currentPlayers,
        status: currentPlayers >= event.maxPlayers ? EventStatus.FULL : EventStatus.OPEN,
      },
      include: { participants: true },
    });

    await awardKarma(userId, isMercenary ? 'MERCENARY_ACCEPTED' : 'EVENT_JOINED', {
      client: tx,
      sport: event.sport,
      city: event.city,
    });

    return updated;
  });
}

export interface CreateManualEventInput {
  creatorId: string;
  sport: Sport;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  city?: string;
  dateTime: Date;
  maxPlayers: number;
  /** Optional venue to attach the event to — only usable by the venue's own VENUE_MANAGER. */
  venueId?: string;
}

/**
 * "+" (create event) button: the creator's role fully determines EventType —
 * VENUE_MANAGER produces a VENUE_EVENT, everyone else (PLAYER/COACH) produces
 * a USER_EVENT. City is auto-resolved from GPS unless the venue already
 * pins it. The creator is automatically joined as the first participant.
 */
export async function createManualEvent(input: CreateManualEventInput) {
  const creator = await prisma.user.findUnique({ where: { id: input.creatorId } });
  if (!creator) throw new HttpError(404, `User ${input.creatorId} not found`);

  let venue: Venue | null = null;
  if (input.venueId) {
    venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
    if (!venue) throw new HttpError(404, 'Venue not found');
    if (creator.role !== UserRole.VENUE_MANAGER || venue.managerId !== creator.id) {
      throw new HttpError(403, 'Only the managing VENUE_MANAGER can attach an event to this venue');
    }
  }

  const type = creator.role === UserRole.VENUE_MANAGER ? EventType.VENUE_EVENT : EventType.USER_EVENT;
  const lat = venue?.lat ?? input.lat;
  const lng = venue?.lng ?? input.lng;
  const city = venue?.city ?? resolveCity(lat, lng, input.city);

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        type,
        sport: input.sport,
        title: input.title,
        description: input.description,
        city,
        lat,
        lng,
        dateTime: input.dateTime,
        maxPlayers: input.maxPlayers,
        currentPlayers: 1,
        status: EventStatus.OPEN,
        hostId: creator.id,
        venueId: venue?.id,
      },
    });

    await tx.eventParticipant.create({ data: { eventId: event.id, userId: creator.id } });
    await awardKarma(creator.id, 'EVENT_HOSTED', { client: tx, sport: event.sport, city: event.city });

    return tx.event.findUniqueOrThrow({
      where: { id: event.id },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        venue: true,
      },
    });
  });
}
