import { Sport } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { bookLesson, createLesson, getLesson, getLessonsFeed } from '../services/lessonService';

export const lessonRoutes = Router();

/** POST /api/lessons — COACH publishes a training lesson. */
lessonRoutes.post('/', async (req, res, next) => {
  try {
    const body = z
      .object({
        coachId: z.string().min(1),
        sport: z.nativeEnum(Sport),
        title: z.string().min(3),
        description: z.string().optional(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        city: z.string().optional(),
        dateTime: z.coerce.date().refine((d) => d > new Date(), {
          message: 'dateTime must be in the future',
        }),
        durationMinutes: z.number().int().min(15).max(480).optional(),
        capacity: z.number().int().min(1).max(50).optional(),
        priceCents: z.number().int().min(0).optional(),
      })
      .parse(req.body);

    const lesson = await createLesson(body);
    res.status(201).json(lesson);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/lessons?lat=..&lng=..&sport=..
 * "Trainer Discovery" screen — same 20km/50km geolocation engine as events.
 */
lessonRoutes.get('/', async (req, res, next) => {
  try {
    const query = z
      .object({
        lat: z.coerce.number().min(-90).max(90),
        lng: z.coerce.number().min(-180).max(180),
        sport: z.nativeEnum(Sport).optional(),
      })
      .parse(req.query);

    const feed = await getLessonsFeed(query);
    res.json(feed);
  } catch (err) {
    next(err);
  }
});

/** GET /api/lessons/:id — lesson detail with current bookings. */
lessonRoutes.get('/:id', async (req, res, next) => {
  try {
    const lesson = await getLesson(req.params.id);
    res.json(lesson);
  } catch (err) {
    next(err);
  }
});

/** POST /api/lessons/:id/book — a player books a slot with the coach. */
lessonRoutes.post('/:id/book', async (req, res, next) => {
  try {
    const body = z.object({ userId: z.string().min(1) }).parse(req.body);
    const lesson = await bookLesson(req.params.id, body.userId);
    res.json(lesson);
  } catch (err) {
    next(err);
  }
});
