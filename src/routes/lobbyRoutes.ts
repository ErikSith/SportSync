import { Sport } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { HttpError } from '../middleware/errorHandler';
import { createLobbyRequest } from '../services/lobbyService';

export const lobbyRoutes = Router();

/**
 * POST /api/lobby-requests
 * "Založiť Lobby" button on the frontend. Persists the intent as PENDING with
 * GPS coordinates and an auto-resolved city; CrewAI agents pick it up via
 * GET /api/ai/pending-requests.
 */
lobbyRoutes.post('/', async (req, res, next) => {
  try {
    const body = z
      .object({
        userId: z.string().min(1),
        sport: z.nativeEnum(Sport),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        city: z.string().optional(),
        preferredTime: z.coerce.date().refine((d) => d > new Date(), {
          message: 'preferredTime must be in the future',
        }),
      })
      .parse(req.body);

    const request = await createLobbyRequest(body);
    res.status(201).json({
      message: 'Request queued. An AI agent will match you with nearby players.',
      request,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/lobby-requests/:id — the frontend polls this to show match status. */
lobbyRoutes.get('/:id', async (req, res, next) => {
  try {
    const request = await prisma.lobbyRequest.findUnique({
      where: { id: req.params.id },
      include: {
        matchedEvent: {
          include: {
            participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          },
        },
      },
    });
    if (!request) throw new HttpError(404, 'Lobby request not found');
    res.json(request);
  } catch (err) {
    next(err);
  }
});

/** GET /api/lobby-requests/user/:userId — all requests of one user. */
lobbyRoutes.get('/user/:userId', async (req, res, next) => {
  try {
    const requests = await prisma.lobbyRequest.findMany({
      where: { userId: req.params.userId },
      include: { matchedEvent: { select: { id: true, title: true, dateTime: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ count: requests.length, requests });
  } catch (err) {
    next(err);
  }
});
