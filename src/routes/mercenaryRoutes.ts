import { Sport } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { claimNotification, getActiveNotifications } from '../services/mercenaryService';

export const mercenaryRoutes = Router();

/**
 * GET /api/mercenary?lat=..&lng=..&sport=..
 * Active "Mercenary +1" emergency calls. With lat/lng only calls whose radius
 * covers the player are returned.
 */
mercenaryRoutes.get('/', async (req, res, next) => {
  try {
    const query = z
      .object({
        lat: z.coerce.number().min(-90).max(90).optional(),
        lng: z.coerce.number().min(-180).max(180).optional(),
        sport: z.nativeEnum(Sport).optional(),
      })
      .parse(req.query);

    const notifications = await getActiveNotifications(query);
    res.json({ count: notifications.length, notifications });
  } catch (err) {
    next(err);
  }
});

/** POST /api/mercenary/:id/claim — a player answers the emergency call. */
mercenaryRoutes.post('/:id/claim', async (req, res, next) => {
  try {
    const body = z.object({ userId: z.string().min(1) }).parse(req.body);
    const result = await claimNotification(req.params.id, body.userId);
    res.json({ message: 'Slot claimed. See you on the court!', ...result });
  } catch (err) {
    next(err);
  }
});
