import { Prisma, Sport, TournamentFormat, TournamentStatus, UserRole } from '@prisma/client';
import { distanceKm } from '../lib/geo';
import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/errorHandler';
import { awardKarma } from './karmaService';
import { requireRole } from './userService';

export interface CreateTournamentInput {
  managerId: string;
  venueId: string;
  sport: Sport;
  title: string;
  description?: string;
  format?: TournamentFormat;
  startDate: Date;
  endDate: Date;
  maxParticipants: number;
  entryFeeCents?: number;
  prizePoolCents?: number;
}

/**
 * "VENUE_MANAGER... má právo vytvárať oficiálne turnaje." Only the manager who
 * owns the target venue can create a tournament there; city/lat/lng are
 * inherited from the venue itself.
 */
export async function createTournament(input: CreateTournamentInput) {
  await requireRole(input.managerId, [UserRole.VENUE_MANAGER]);

  const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
  if (!venue) throw new HttpError(404, 'Venue not found');
  if (venue.managerId !== input.managerId) {
    throw new HttpError(403, 'You can only create tournaments at venues you manage');
  }
  if (input.endDate <= input.startDate) {
    throw new HttpError(422, 'endDate must be after startDate');
  }

  const tournament = await prisma.tournament.create({
    data: {
      venueId: venue.id,
      managerId: input.managerId,
      sport: input.sport,
      title: input.title,
      description: input.description,
      format: input.format ?? TournamentFormat.SINGLE_ELIMINATION,
      city: venue.city,
      lat: venue.lat,
      lng: venue.lng,
      startDate: input.startDate,
      endDate: input.endDate,
      maxParticipants: input.maxParticipants,
      entryFeeCents: input.entryFeeCents ?? 0,
      prizePoolCents: input.prizePoolCents ?? 0,
      status: TournamentStatus.REGISTRATION_OPEN,
    },
  });

  await awardKarma(input.managerId, 'TOURNAMENT_HOSTED', {
    sport: tournament.sport,
    city: tournament.city,
  });

  return tournament;
}

export interface ListTournamentsQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sport?: Sport;
  city?: string;
  status?: TournamentStatus;
}

export async function listTournaments(params: ListTournamentsQuery) {
  const where: Prisma.TournamentWhereInput = {
    status: params.status ?? { not: TournamentStatus.CANCELLED },
  };
  if (params.sport) where.sport = params.sport;
  if (params.city) where.city = { equals: params.city, mode: 'insensitive' };

  const tournaments = await prisma.tournament.findMany({
    where,
    include: {
      venue: { select: { id: true, name: true, address: true } },
      manager: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { startDate: 'asc' },
  });

  if (params.lat === undefined || params.lng === undefined) return tournaments;

  const withDistance = tournaments.map((tournament) => ({
    ...tournament,
    distanceKm: Math.round(distanceKm(params.lat!, params.lng!, tournament.lat, tournament.lng) * 10) / 10,
  }));

  const filtered = params.radiusKm
    ? withDistance.filter((tournament) => tournament.distanceKm <= params.radiusKm!)
    : withDistance;

  return filtered.sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getTournament(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      venue: true,
      manager: { select: { id: true, name: true, avatarUrl: true } },
      participants: {
        include: { user: { select: { id: true, name: true, avatarUrl: true, skillRating: true } } },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
  if (!tournament) throw new HttpError(404, 'Tournament not found');
  return tournament;
}

/** A player registers for an official tournament (capacity + registration-window enforced). */
export async function registerForTournament(tournamentId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { participants: true },
    });
    if (!tournament) throw new HttpError(404, 'Tournament not found');
    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new HttpError(409, `Registration is not open (status: ${tournament.status})`);
    }
    if (tournament.participants.length >= tournament.maxParticipants) {
      throw new HttpError(409, 'Tournament is full');
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, `User ${userId} not found`);

    const participant = await tx.tournamentParticipant.create({
      data: { tournamentId, userId, seed: tournament.participants.length + 1 },
    });

    if (tournament.participants.length + 1 >= tournament.maxParticipants) {
      await tx.tournament.update({ where: { id: tournamentId }, data: { status: TournamentStatus.UPCOMING } });
    }

    await awardKarma(userId, 'TOURNAMENT_JOINED', {
      client: tx,
      sport: tournament.sport,
      city: tournament.city,
    });

    return participant;
  });
}
