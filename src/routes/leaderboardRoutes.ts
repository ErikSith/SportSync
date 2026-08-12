import { Sport } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { getCityKarmaLeaderboard } from '../services/karmaService';
import { getLeaderboard } from '../services/leaderboardService';

export const leaderboardRoutes = Router();

/**
 * GET /api/leaderboard?city=Bratislava&sport=PADEL
 * City rankings, e.g. "Rank 1 Padel in Bratislava" — karma-driven Smart Social Proof.
 */
leaderboardRoutes.get('/', async (req, res, next) => {
  try {
    const query = z
      .object({
        city: z.string().min(1),
        sport: z.nativeEnum(Sport),
        season: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      })
      .parse(req.query);

    const board = await getLeaderboard(query);
    res.json(board);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leaderboard/karma?city=Bratislava
 * Cross-sport city reputation ranking driven purely by karmaPoints — the
 * overall "Smart Social Proof" score shown on profile / city hub screens.
 */
leaderboardRoutes.get('/karma', async (req, res, next) => {
  try {
    const query = z
      .object({
        city: z.string().min(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      })
      .parse(req.query);

    const board = await getCityKarmaLeaderboard(query);
    res.json(board);
  } catch (err) {
    next(err);
  }
});
