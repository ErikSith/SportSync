import { EventStatus, MercenaryStatus, Sport } from '@prisma/client';
import { config } from '../config';
import { boundingBox, distanceKm } from '../lib/geo';
import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/errorHandler';
import { joinEvent } from './eventService';

/**
 * Scans for events starting within the next `mercenaryWindowMinutes` (default 60)
 * that are still missing players, and logs an ACTIVE MercenaryNotification with a
 * 20 km emergency radius for each. Idempotent: events that already have an active
 * call are skipped. Called by the cron job and exposed to CrewAI agents via POST
 * /api/ai/mercenary-scan.
 */
export async function scanForMissingPlayers(triggeredBy: string) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + config.mercenaryWindowMinutes * 60 * 1000);

  const understaffedEvents = await prisma.event.findMany({
    where: {
      status: EventStatus.OPEN,
      dateTime: { gte: now, lte: windowEnd },
      mercenaryNotifications: { none: { status: MercenaryStatus.ACTIVE } },
    },
  });

  const created = [];
  for (const event of understaffedEvents) {
    const missing = event.maxPlayers - event.currentPlayers;
    if (missing <= 0) continue;

    const notification = await prisma.mercenaryNotification.create({
      data: {
        eventId: event.id,
        sport: event.sport,
        city: event.city,
        lat: event.lat,
        lng: event.lng,
        radiusKm: config.defaultRadiusKm,
        playersNeeded: missing,
        message: `MERCENARY +1: ${event.title} (${event.sport}) in ${event.city} starts at ${event.dateTime.toISOString()} and needs ${missing} more player(s). Radius ${config.defaultRadiusKm} km.`,
        triggeredByAgent: triggeredBy,
        expiresAt: event.dateTime,
      },
    });
    created.push(notification);
  }

  return { scanned: understaffedEvents.length, created };
}

/** Active emergency calls near a location (for the frontend and for agents). */
export async function getActiveNotifications(params?: {
  lat?: number;
  lng?: number;
  sport?: Sport;
}) {
  const notifications = await prisma.mercenaryNotification.findMany({
    where: {
      status: MercenaryStatus.ACTIVE,
      expiresAt: { gte: new Date() },
      ...(params?.sport ? { sport: params.sport } : {}),
    },
    include: {
      event: {
        select: { id: true, title: true, dateTime: true, maxPlayers: true, currentPlayers: true },
      },
    },
    orderBy: { expiresAt: 'asc' },
  });

  const lat = params?.lat;
  const lng = params?.lng;
  if (lat === undefined || lng === undefined) return notifications;

  return notifications.filter(
    (n) => distanceKm(lat, lng, n.lat, n.lng) <= n.radiusKm,
  );
}

/** A player answers the emergency call and takes the free slot. */
export async function claimNotification(notificationId: string, userId: string) {
  const notification = await prisma.mercenaryNotification.findUnique({
    where: { id: notificationId },
  });
  if (!notification) throw new HttpError(404, 'Mercenary notification not found');
  if (notification.status !== MercenaryStatus.ACTIVE) {
    throw new HttpError(409, `Notification is ${notification.status}`);
  }
  if (notification.expiresAt < new Date()) {
    throw new HttpError(409, 'The match has already started');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, `User ${userId} not found`);

  const dist = distanceKm(user.lat, user.lng, notification.lat, notification.lng);
  if (dist > notification.radiusKm) {
    throw new HttpError(422, `You are ${dist.toFixed(1)} km away (max ${notification.radiusKm} km)`);
  }

  const event = await joinEvent(notification.eventId, userId, true);

  const stillNeeded = notification.playersNeeded - 1;
  const updated = await prisma.mercenaryNotification.update({
    where: { id: notificationId },
    data:
      stillNeeded <= 0
        ? { status: MercenaryStatus.FILLED, claimedById: userId, claimedAt: new Date() }
        : { playersNeeded: stillNeeded, claimedById: userId, claimedAt: new Date() },
  });

  return { notification: updated, event };
}

/** Utility used by agents to check who is inside a notification's radius. */
export async function getPlayersInRadius(notificationId: string) {
  const notification = await prisma.mercenaryNotification.findUnique({
    where: { id: notificationId },
    include: { event: { include: { participants: { select: { userId: true } } } } },
  });
  if (!notification) throw new HttpError(404, 'Mercenary notification not found');

  const participantIds = notification.event.participants.map((p) => p.userId);
  const box = boundingBox(notification.lat, notification.lng, notification.radiusKm);

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: participantIds },
      lat: { gte: box.minLat, lte: box.maxLat },
      lng: { gte: box.minLng, lte: box.maxLng },
    },
    select: { id: true, name: true, city: true, lat: true, lng: true, skillRating: true },
  });

  return users
    .map((u) => ({
      ...u,
      distanceKm:
        Math.round(distanceKm(notification.lat, notification.lng, u.lat, u.lng) * 10) / 10,
    }))
    .filter((u) => u.distanceKm <= notification.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
