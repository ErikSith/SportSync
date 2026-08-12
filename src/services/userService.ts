import { Sport, UserRole } from '@prisma/client';
import { resolveCity } from '../lib/geocode';
import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/errorHandler';

export interface UpsertProfileInput {
  email: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  lat: number;
  lng: number;
  city?: string;
  preferredSports: Sport[];
}

/**
 * "Vytvor logiku pre správu profilov" — registers a brand-new profile or, if
 * the email already exists, refreshes it. The user picks their role
 * (PLAYER / COACH / VENUE_MANAGER) here; the home city is auto-resolved from
 * GPS unless the client already knows it.
 */
export async function createOrUpdateProfile(input: UpsertProfileInput) {
  const city = resolveCity(input.lat, input.lng, input.city);

  return prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      name: input.name,
      avatarUrl: input.avatarUrl,
      bio: input.bio,
      role: input.role,
      lat: input.lat,
      lng: input.lng,
      city,
      preferredSports: input.preferredSports,
    },
    update: {
      name: input.name,
      avatarUrl: input.avatarUrl,
      bio: input.bio,
      role: input.role,
      lat: input.lat,
      lng: input.lng,
      city,
      preferredSports: input.preferredSports,
    },
  });
}

/** Full profile for the "gamified athlete profile" / trainer / venue-manager screens. */
export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      leaderboards: { orderBy: { rank: 'asc' } },
      managedVenues: { orderBy: { name: 'asc' } },
      coachLessons: { orderBy: { dateTime: 'asc' }, take: 10 },
      _count: {
        select: {
          participations: true,
          hostedEvents: true,
          tournamentEntries: true,
          lessonBookings: true,
        },
      },
    },
  });
  if (!user) throw new HttpError(404, `User ${userId} not found`);
  return user;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string;
  bio?: string;
  role?: UserRole;
  lat?: number;
  lng?: number;
  city?: string;
  preferredSports?: Sport[];
}

/** Lets a user change role, home city (via GPS) or preferred sports after onboarding. */
export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new HttpError(404, `User ${userId} not found`);

  const lat = input.lat ?? existing.lat;
  const lng = input.lng ?? existing.lng;
  const shouldReresolveCity = input.lat !== undefined || input.lng !== undefined || input.city !== undefined;
  const city = shouldReresolveCity ? resolveCity(lat, lng, input.city) : existing.city;

  return prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name ?? existing.name,
      avatarUrl: input.avatarUrl ?? existing.avatarUrl,
      bio: input.bio ?? existing.bio,
      role: input.role ?? existing.role,
      lat,
      lng,
      city,
      preferredSports: input.preferredSports ?? existing.preferredSports,
    },
  });
}

/**
 * Role gate used by every module that requires a specific profile type
 * (VENUE_MANAGER to create venues/tournaments, COACH to publish lessons).
 * Since the prototype has no session/JWT layer yet, callers authenticate by
 * passing their own userId — this is the seam where real auth middleware will
 * plug in later without changing service-layer call sites.
 */
export async function requireRole(userId: string, roles: UserRole[]) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, `User ${userId} not found`);
  if (!roles.includes(user.role)) {
    throw new HttpError(
      403,
      `This action requires role ${roles.join(' or ')}, but user has role ${user.role}`,
    );
  }
  return user;
}
