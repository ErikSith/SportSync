import { Prisma, Sport, UserRole } from '@prisma/client';
import { distanceKm } from '../lib/geo';
import { resolveCity } from '../lib/geocode';
import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/errorHandler';
import { requireRole } from './userService';

export interface CreateVenueInput {
  managerId: string;
  name: string;
  description?: string;
  sports: Sport[];
  address: string;
  lat: number;
  lng: number;
  city?: string;
  amenities?: string[];
}

/** Only a VENUE_MANAGER may register a new official venue/sports centre. */
export async function createVenue(input: CreateVenueInput) {
  await requireRole(input.managerId, [UserRole.VENUE_MANAGER]);
  const city = resolveCity(input.lat, input.lng, input.city);

  return prisma.venue.create({
    data: {
      managerId: input.managerId,
      name: input.name,
      description: input.description,
      sports: input.sports,
      address: input.address,
      city,
      lat: input.lat,
      lng: input.lng,
      amenities: input.amenities ?? [],
    },
  });
}

export interface ListVenuesQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sport?: Sport;
  city?: string;
}

export async function listVenues(params: ListVenuesQuery) {
  const where: Prisma.VenueWhereInput = {};
  if (params.sport) where.sports = { has: params.sport };
  if (params.city) where.city = { equals: params.city, mode: 'insensitive' };

  const venues = await prisma.venue.findMany({
    where,
    include: { manager: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { name: 'asc' },
  });

  if (params.lat === undefined || params.lng === undefined) {
    return venues.map((venue) => ({ ...venue, distanceKm: null as number | null }));
  }

  const withDistance = venues.map((venue) => ({
    ...venue,
    distanceKm: Math.round(distanceKm(params.lat!, params.lng!, venue.lat, venue.lng) * 10) / 10,
  }));

  const filtered = params.radiusKm
    ? withDistance.filter((venue) => venue.distanceKm <= params.radiusKm!)
    : withDistance;

  return filtered.sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getVenue(id: string) {
  const venue = await prisma.venue.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, name: true, avatarUrl: true } },
      events: { where: { status: 'OPEN' }, orderBy: { dateTime: 'asc' } },
      tournaments: { orderBy: { startDate: 'asc' } },
    },
  });
  if (!venue) throw new HttpError(404, 'Venue not found');
  return venue;
}

export interface UpdateVenueInput {
  name?: string;
  description?: string;
  sports?: Sport[];
  address?: string;
  amenities?: string[];
  lat?: number;
  lng?: number;
  city?: string;
}

/** Only the manager who owns the venue can update it. */
export async function updateVenue(id: string, managerId: string, patch: UpdateVenueInput) {
  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) throw new HttpError(404, 'Venue not found');
  if (venue.managerId !== managerId) {
    throw new HttpError(403, 'Only the managing VENUE_MANAGER can update this venue');
  }

  const lat = patch.lat ?? venue.lat;
  const lng = patch.lng ?? venue.lng;
  const shouldReresolveCity = patch.lat !== undefined || patch.lng !== undefined || patch.city !== undefined;
  const city = shouldReresolveCity ? resolveCity(lat, lng, patch.city) : venue.city;

  return prisma.venue.update({
    where: { id },
    data: {
      name: patch.name ?? venue.name,
      description: patch.description ?? venue.description,
      sports: patch.sports ?? venue.sports,
      address: patch.address ?? venue.address,
      amenities: patch.amenities ?? venue.amenities,
      lat,
      lng,
      city,
    },
  });
}
