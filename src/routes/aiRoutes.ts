import { Sport } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { awardKarma } from '../services/karmaService';
import { agentAuth } from '../middleware/agentAuth';
import {
  claimRequests,
  createLobbyByAgent,
  findCandidatePlayers,
  getPendingRequests,
} from '../services/lobbyService';
import { getPlayersInRadius, scanForMissingPlayers } from '../services/mercenaryService';
import { recordResult } from '../services/leaderboardService';

const sportEnum = z.nativeEnum(Sport);

export const aiRoutes = Router();
aiRoutes.use(agentAuth);

/**
 * GET /api/ai/pending-requests
 * CrewAI agents poll this endpoint in a loop. Each request comes enriched with
 * compatible_request_ids (same sport, ±2h, within 20 km) so the agent can
 * immediately decide which requests to bundle into one lobby.
 */
aiRoutes.get('/pending-requests', async (req, res, next) => {
  try {
    const query = z
      .object({
        sport: sportEnum.optional(),
        city: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
      })
      .parse(req.query);

    const requests = await getPendingRequests(query);
    res.json({ count: requests.length, requests });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ai/claim-requests
 * Atomically flips PENDING -> PROCESSING_BY_AI so concurrent agents never
 * process the same request twice.
 */
aiRoutes.post('/claim-requests', async (req, res, next) => {
  try {
    const body = z.object({ requestIds: z.array(z.string()).min(1) }).parse(req.body);
    const result = await claimRequests(body.requestIds, res.locals.agentId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ai/create-lobby
 * The agent found compatible players and creates + confirms the match.
 * Validates the 20 km rule for every matched request; everything runs in a
 * single transaction (event + participants + request statuses -> MATCHED).
 */
aiRoutes.post('/create-lobby', async (req, res, next) => {
  try {
    const body = z
      .object({
        sport: sportEnum,
        title: z.string().min(3),
        description: z.string().optional(),
        city: z.string().min(1),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        dateTime: z.coerce.date(),
        maxPlayers: z.number().int().min(2).max(30),
        matchedRequestIds: z.array(z.string()).min(1),
      })
      .parse(req.body);

    const event = await createLobbyByAgent({ ...body, agentId: res.locals.agentId });
    res.status(201).json({ message: 'Lobby created and confirmed by AI agent', event });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/ai/candidate-players
 * Player discovery inside a radius — used by agents when a lobby still needs
 * more people than there are pending requests.
 */
aiRoutes.get('/candidate-players', async (req, res, next) => {
  try {
    const query = z
      .object({
        lat: z.coerce.number().min(-90).max(90),
        lng: z.coerce.number().min(-180).max(180),
        sport: sportEnum,
        radiusKm: z.coerce.number().positive().max(100).default(20),
      })
      .parse(req.query);

    const players = await findCandidatePlayers(query);
    res.json({ count: players.length, players });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ai/mercenary-scan
 * Lets an agent trigger the Mercenary +1 scan on demand (the same logic also
 * runs on a cron schedule server-side). Returns the emergency calls created.
 */
aiRoutes.post('/mercenary-scan', async (_req, res, next) => {
  try {
    const result = await scanForMissingPlayers(res.locals.agentId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/ai/mercenary/:id/players-in-radius
 * Who can the agent contact about an emergency call (non-participants within
 * the notification radius, sorted by distance).
 */
aiRoutes.get('/mercenary/:id/players-in-radius', async (req, res, next) => {
  try {
    const players = await getPlayersInRadius(req.params.id);
    res.json({ count: players.length, players });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ai/record-result
 * Agent reports a finished match; leaderboard points and city ranks are
 * recomputed automatically.
 */
aiRoutes.post('/record-result', async (req, res, next) => {
  try {
    const body = z
      .object({
        city: z.string().min(1),
        sport: sportEnum,
        winnerIds: z.array(z.string()).min(1),
        loserIds: z.array(z.string()).min(1),
        season: z.string().optional(),
      })
      .parse(req.body);

    const board = await recordResult(body);
    res.json(board);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ai/no-show
 * Retention mechanic: an agent reports that a player accepted a slot (event,
 * mercenary call, lesson, tournament) and never showed up. Applies a karma
 * penalty that also drags down their city+sport Leaderboard rank, discouraging
 * flaking without any human moderator involved.
 */
aiRoutes.post('/no-show', async (req, res, next) => {
  try {
    const body = z
      .object({
        userId: z.string().min(1),
        sport: sportEnum,
        city: z.string().min(1),
        season: z.string().optional(),
      })
      .parse(req.body);

    const user = await awardKarma(body.userId, 'NO_SHOW_PENALTY', {
      sport: body.sport,
      city: body.city,
      season: body.season,
    });
    res.json({ message: 'No-show penalty applied', user });
  } catch (err) {
    next(err);
  }
});
