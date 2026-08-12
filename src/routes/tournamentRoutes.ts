import { Sport, TournamentFormat, TournamentStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import {
  createTournament,
  getTournament,
  listTournaments,
  registerForTournament,
} from '../services/tournamentService';

export const tournamentRoutes = Router();

/** POST /api/tournaments — VENUE_MANAGER creates an official tournament at a venue they own. */
tournamentRoutes.post('/', async (req, res, next) => {
  try {
    const body = z
      .object({
        managerId: z.string().min(1),
        venueId: z.string().min(1),
        sport: z.nativeEnum(Sport),
        title: z.string().min(3),
        description: z.string().optional(),
        format: z.nativeEnum(TournamentFormat).optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        maxParticipants: z.number().int().min(2).max(256),
        entryFeeCents: z.number().int().min(0).optional(),
        prizePoolCents: z.number().int().min(0).optional(),
      })
      .parse(req.body);

    const tournament = await createTournament(body);
    res.status(201).json(tournament);
  } catch (err) {
    next(err);
  }
});

/** GET /api/tournaments — "Elite Tournaments" discovery screen. */
tournamentRoutes.get('/', async (req, res, next) => {
  try {
    const query = z
      .object({
        lat: z.coerce.number().min(-90).max(90).optional(),
        lng: z.coerce.number().min(-180).max(180).optional(),
        radiusKm: z.coerce.number().positive().max(200).optional(),
        sport: z.nativeEnum(Sport).optional(),
        city: z.string().optional(),
        status: z.nativeEnum(TournamentStatus).optional(),
      })
      .parse(req.query);

    const tournaments = await listTournaments(query);
    res.json({ count: tournaments.length, tournaments });
  } catch (err) {
    next(err);
  }
});

/** GET /api/tournaments/:id — tournament detail screen with participants. */
tournamentRoutes.get('/:id', async (req, res, next) => {
  try {
    const tournament = await getTournament(req.params.id);
    res.json(tournament);
  } catch (err) {
    next(err);
  }
});

/** POST /api/tournaments/:id/register — a player enters the tournament. */
tournamentRoutes.post('/:id/register', async (req, res, next) => {
  try {
    const body = z.object({ userId: z.string().min(1) }).parse(req.body);
    const participant = await registerForTournament(req.params.id, body.userId);
    res.status(201).json(participant);
  } catch (err) {
    next(err);
  }
});
