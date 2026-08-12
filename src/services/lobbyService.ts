import {
  EventStatus,
  EventType,
  LobbyRequestStatus,
  Sport,
} from '@prisma/client';
import { config } from '../config';
import { boundingBox, distanceKm } from '../lib/geo';
import { resolveCity } from '../lib/geocode';
import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/errorHandler';
import { awardKarma } from './karmaService';

/**
 * "Založiť Lobby" button — persists the intent as PENDING with GPS
 * coordinates and an auto-resolved city; this row is the task-queue entry
 * CrewAI agents poll via GET /api/ai/pending-requests.
 */
export async function createLobbyRequest(input: {
  userId: string;
  sport: Sport;
  lat: number;
  lng: number;
  city?: string;
  preferredTime: Date;
}) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new HttpError(404, `User ${input.userId} not found`);

  const city = resolveCity(input.lat, input.lng, input.city);

  return prisma.lobbyRequest.create({
    data: {
      userId: input.userId,
      sport: input.sport,
      lat: input.lat,
      lng: input.lng,
      city,
      preferredTime: input.preferredTime,
      status: LobbyRequestStatus.PENDING,
    },
    include: { user: { select: { id: true, name: true, skillRating: true } } },
  });
}

/**
 * Poll endpoint for CrewAI agents. Returns PENDING requests enriched with
 * nearby compatible requests (same sport, within radius, similar time window)
 * so the agent immediately sees which requests it can bundle into one lobby.
 */
export async function getPendingRequests(options: { sport?: Sport; city?: string; limit: number }) {
  const pending = await prisma.lobbyRequest.findMany({
    where: {
      status: LobbyRequestStatus.PENDING,
      preferredTime: { gte: new Date() },
      ...(options.sport ? { sport: options.sport } : {}),
      ...(options.city ? { city: { equals: options.city, mode: 'insensitive' } } : {}),
    },
    include: { user: { select: { id: true, name: true, city: true, skillRating: true } } },
    orderBy: { createdAt: 'asc' },
    take: options.limit,
  });

  const timeWindowMs = 2 * 60 * 60 * 1000; // ±2h counts as a compatible time slot

  return pending.map((request) => {
    const compatible = pending.filter(
      (other) =>
        other.id !== request.id &&
        other.sport === request.sport &&
        Math.abs(other.preferredTime.getTime() - request.preferredTime.getTime()) <= timeWindowMs &&
        distanceKm(request.lat, request.lng, other.lat, other.lng) <= config.defaultRadiusKm,
    );
    return {
      ...request,
      compatible_request_ids: compatible.map((c) => c.id),
      compatible_count: compatible.length,
    };
  });
}

/**
 * Optional but important for multi-agent setups: an agent claims requests
 * atomically so two agents never process the same request. Only rows still in
 * PENDING state are flipped to PROCESSING_BY_AI.
 */
export async function claimRequests(requestIds: string[], agentId: string) {
  const result = await prisma.lobbyRequest.updateMany({
    where: { id: { in: requestIds }, status: LobbyRequestStatus.PENDING },
    data: {
      status: LobbyRequestStatus.PROCESSING_BY_AI,
      claimedByAgent: agentId,
      claimedAt: new Date(),
    },
  });
  return { claimed: result.count, requested: requestIds.length };
}

/**
 * A CrewAI agent found compatible players and creates the match autonomously.
 * Validates the 20 km radius for every matched request, creates the Event,
 * adds all requesters as participants and flips their requests to MATCHED —
 * all in a single transaction.
 */
export async function createLobbyByAgent(input: {
  agentId: string;
  sport: Sport;
  title: string;
  description?: string;
  city: string;
  lat: number;
  lng: number;
  dateTime: Date;
  maxPlayers: number;
  matchedRequestIds: string[];
}) {
  const requests = await prisma.lobbyRequest.findMany({
    where: { id: { in: input.matchedRequestIds } },
    include: { user: { select: { id: true, name: true } } },
  });

  if (requests.length !== input.matchedRequestIds.length) {
    const found = new Set(requests.map((r) => r.id));
    const missing = input.matchedRequestIds.filter((id) => !found.has(id));
    throw new HttpError(404, `Lobby requests not found: ${missing.join(', ')}`);
  }

  for (const request of requests) {
    if (
      request.status !== LobbyRequestStatus.PENDING &&
      request.status !== LobbyRequestStatus.PROCESSING_BY_AI
    ) {
      throw new HttpError(409, `Request ${request.id} is already ${request.status}`);
    }
    if (request.sport !== input.sport) {
      throw new HttpError(422, `Request ${request.id} is for ${request.sport}, not ${input.sport}`);
    }
    const dist = distanceKm(input.lat, input.lng, request.lat, request.lng);
    if (dist > config.defaultRadiusKm) {
      throw new HttpError(
        422,
        `Request ${request.id} is ${dist.toFixed(1)} km from the venue (max ${config.defaultRadiusKm} km)`,
      );
    }
  }

  const uniquePlayerIds = [...new Set(requests.map((r) => r.userId))];
  if (uniquePlayerIds.length > input.maxPlayers) {
    throw new HttpError(422, `${uniquePlayerIds.length} players exceed maxPlayers=${input.maxPlayers}`);
  }

  return prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        type: EventType.USER_EVENT,
        sport: input.sport,
        title: input.title,
        description: input.description,
        city: input.city,
        lat: input.lat,
        lng: input.lng,
        dateTime: input.dateTime,
        maxPlayers: input.maxPlayers,
        currentPlayers: uniquePlayerIds.length,
        status:
          uniquePlayerIds.length >= input.maxPlayers ? EventStatus.FULL : EventStatus.OPEN,
        createdByAgent: input.agentId,
      },
    });

    await tx.eventParticipant.createMany({
      data: uniquePlayerIds.map((userId) => ({ eventId: event.id, userId })),
    });

    await tx.lobbyRequest.updateMany({
      where: { id: { in: input.matchedRequestIds } },
      data: {
        status: LobbyRequestStatus.MATCHED,
        matchedEventId: event.id,
        claimedByAgent: input.agentId,
      },
    });

    for (const userId of uniquePlayerIds) {
      await awardKarma(userId, 'LOBBY_MATCHED', { client: tx, sport: input.sport, city: input.city });
    }

    return tx.event.findUniqueOrThrow({
      where: { id: event.id },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        matchedRequests: { select: { id: true, userId: true, status: true } },
      },
    });
  });
}

/** Nearby-player discovery for agents composing a lobby (same 20 km rule). */
export async function findCandidatePlayers(params: {
  lat: number;
  lng: number;
  sport: Sport;
  radiusKm: number;
  excludeUserIds?: string[];
}) {
  const box = boundingBox(params.lat, params.lng, params.radiusKm);
  const users = await prisma.user.findMany({
    where: {
      lat: { gte: box.minLat, lte: box.maxLat },
      lng: { gte: box.minLng, lte: box.maxLng },
      ...(params.excludeUserIds?.length ? { id: { notIn: params.excludeUserIds } } : {}),
    },
    select: { id: true, name: true, city: true, lat: true, lng: true, skillRating: true },
  });

  return users
    .map((u) => ({
      ...u,
      distanceKm: Math.round(distanceKm(params.lat, params.lng, u.lat, u.lng) * 10) / 10,
    }))
    .filter((u) => u.distanceKm <= params.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
