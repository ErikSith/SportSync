import { Prisma, PrismaClient, Sport } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Every action that feeds the "Smart Social Proof" reputation system. Positive
 * reasons reward reliability and community participation; NO_SHOW_PENALTY lets
 * CrewAI agents punish players who accepted a slot and never showed up, which
 * directly supports retention (module 4 — herné mechaniky & retencia).
 */
export type KarmaReason =
  | 'EVENT_HOSTED'
  | 'EVENT_JOINED'
  | 'MERCENARY_ACCEPTED'
  | 'LOBBY_MATCHED'
  | 'MATCH_WON'
  | 'MATCH_LOST'
  | 'LESSON_HOSTED'
  | 'LESSON_BOOKED'
  | 'TOURNAMENT_HOSTED'
  | 'TOURNAMENT_JOINED'
  | 'NO_SHOW_PENALTY';

const KARMA_POINTS: Record<KarmaReason, number> = {
  EVENT_HOSTED: 15,
  EVENT_JOINED: 5,
  MERCENARY_ACCEPTED: 25, // rescuing an understaffed match earns the biggest social-proof bonus
  LOBBY_MATCHED: 10,
  MATCH_WON: 8,
  MATCH_LOST: 2, // showing up and playing still counts as reliability
  LESSON_HOSTED: 12,
  LESSON_BOOKED: 4,
  TOURNAMENT_HOSTED: 20,
  TOURNAMENT_JOINED: 6,
  NO_SHOW_PENALTY: -30,
};

type TxClient = PrismaClient | Prisma.TransactionClient;

interface AwardKarmaOptions {
  /** Pass the active `prisma.$transaction` client to keep this atomic with the caller's writes. */
  client?: TxClient;
  /** When provided together with `city`, the same delta also feeds the city+sport Leaderboard. */
  sport?: Sport;
  city?: string;
  season?: string;
}

/**
 * Applies a karma delta to the user's global reputation score and, when a
 * sport + city are supplied, mirrors it into that city's per-sport Leaderboard
 * so rankings like "Rank 1 Padel Player in Bratislava" are karma-driven rather
 * than raw win counters.
 */
export async function awardKarma(userId: string, reason: KarmaReason, options: AwardKarmaOptions = {}) {
  const client = options.client ?? prisma;
  const delta = KARMA_POINTS[reason];

  const user = await client.user.update({
    where: { id: userId },
    data: { karmaPoints: { increment: delta } },
  });

  if (options.sport && options.city) {
    await bumpCityLeaderboard(client, userId, options.sport, options.city, options.season, delta, reason);
  }

  return user;
}

async function bumpCityLeaderboard(
  client: TxClient,
  userId: string,
  sport: Sport,
  city: string,
  season: string | undefined,
  delta: number,
  reason: KarmaReason,
): Promise<void> {
  const resolvedSeason = season ?? String(new Date().getFullYear());
  const isWin = reason === 'MATCH_WON';
  const isLoss = reason === 'MATCH_LOST';

  const existing = await client.leaderboard.findUnique({
    where: { userId_sport_city_season: { userId, sport, city, season: resolvedSeason } },
  });
  const points = Math.max(0, (existing?.points ?? 0) + delta);

  await client.leaderboard.upsert({
    where: { userId_sport_city_season: { userId, sport, city, season: resolvedSeason } },
    create: {
      userId,
      sport,
      city,
      season: resolvedSeason,
      rank: 0, // recomputed below
      points,
      wins: isWin ? 1 : 0,
      losses: isLoss ? 1 : 0,
    },
    update: {
      points,
      wins: { increment: isWin ? 1 : 0 },
      losses: { increment: isLoss ? 1 : 0 },
    },
  });

  const board = await client.leaderboard.findMany({
    where: { city, sport, season: resolvedSeason },
    orderBy: { points: 'desc' },
  });
  for (let i = 0; i < board.length; i++) {
    if (board[i].rank !== i + 1) {
      await client.leaderboard.update({ where: { id: board[i].id }, data: { rank: i + 1 } });
    }
  }
}

/** Global, cross-sport reputation ranking for a city — the "Smart Social Proof" board. */
export async function getCityKarmaLeaderboard(params: { city: string; limit: number }) {
  const users = await prisma.user.findMany({
    where: { city: { equals: params.city, mode: 'insensitive' } },
    orderBy: { karmaPoints: 'desc' },
    take: params.limit,
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      role: true,
      karmaPoints: true,
      preferredSports: true,
    },
  });

  return {
    city: params.city,
    entries: users.map((user, index) => ({ rank: index + 1, ...user })),
  };
}
