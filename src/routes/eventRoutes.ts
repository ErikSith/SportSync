import { Sport } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/errorHandler';
import { createManualEvent, getEventsFeed, joinEvent } from '../services/eventService';

const sportEnum = z.nativeEnum(Sport);

export const eventRoutes = Router();

/**
 * GET /api/events?lat=..&lng=..&sport=..&city=..
 * Returns matches within 20 km. If nothing is found, widens the search to 50 km
 * and sets show_extended: true so the frontend can display
 * "Nothing nearby? Check out matches 50km away."
 */
eventRoutes.get('/', async (req, res, next) => {
  try {
    const query = z
      .object({
        lat: z.coerce.number().min(-90).max(90),
        lng: z.coerce.number().min(-180).max(180),
        sport: sportEnum.optional(),
        city: z.string().optional(),
      })
      .parse(req.query);

    const feed = await getEventsFeed(query);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

/** GET /api/events/:id — full event detail for the lobby-details screen. */
eventRoutes.get('/:id', async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        host: { select: { id: true, name: true, avatarUrl: true } },
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, skillRating: true } } },
        },
        mercenaryNotifications: { where: { status: 'ACTIVE' } },
      },
    });
    if (!event) throw new HttpError(404, 'Event not found');
    res.json(event);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/events — the "+" (create event) button.
 * EventType is never taken from the client: VENUE_MANAGER creators produce a
 * VENUE_EVENT, everyone else produces a USER_EVENT. City is auto-resolved
 * from GPS unless an attached venue already pins one.
 */
eventRoutes.post('/', async (req, res, next) => {
  try {
    const body = z
      .object({
        creatorId: z.string().min(1),
        sport: sportEnum,
        title: z.string().min(3),
        description: z.string().optional(),
        city: z.string().optional(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        dateTime: z.coerce.date(),
        maxPlayers: z.number().int().min(2).max(30),
        venueId: z.string().optional(),
      })
      .parse(req.body);

    const event = await createManualEvent(body);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

/** POST /api/events/:id/join — a player joins an open event. */
eventRoutes.post('/:id/join', async (req, res, next) => {
  try {
    const body = z.object({ userId: z.string().min(1) }).parse(req.body);
    const event = await joinEvent(req.params.id, body.userId);
    res.json(event);
  } catch (err) {
    next(err);
  }
});
