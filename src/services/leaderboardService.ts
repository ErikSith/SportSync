import { Sport } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { awardKarma } from './karmaService';

/**
 * City rankings, e.g. "Rank 1 Padel in Bratislava". Points on this board are
 * fed exclusively by karmaService — every action (hosting, joining, mercenary
 * rescues, lesson bookings, match results) that awards karma for a given
 * sport+city also bumps this table, so the ranking reflects overall "Smart
 * Social Proof" reputation rather than a narrow win/loss counter.
 */
export async function getLeaderboard(params: {
  city: string;
  sport: Sport;
  season?: string;
  limit: number;
}) {
  const season = params.season ?? String(new Date().getFullYear());
  const entries = await prisma.leaderboard.findMany({
    where: {
      city: { equals: params.city, mode: 'insensitive' },
      sport: params.sport,
      season,
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true, skillRating: true, karmaPoints: true } } },
    orderBy: { rank: 'asc' },
    take: params.limit,
  });
  return { city: params.city, sport: params.sport, season, entries };
}

/**
 * Records a match result. Winners/losers get karma (MATCH_WON/MATCH_LOST),
 * which recomputes ranks for the affected city+sport board through
 * karmaService. Designed to be called by AI agents after a completed event.
 */
export async function recordResult(params: {
  city: string;
  sport: Sport;
  winnerIds: string[];
  loserIds: string[];
  season?: string;
}) {
  const season = params.season ?? String(new Date().getFullYear());

  await prisma.$transaction(async (tx) => {
    for (const userId of params.winnerIds) {
      await awardKarma(userId, 'MATCH_WON', { client: tx, sport: params.sport, city: params.city, season });
    }
    for (const userId of params.loserIds) {
      await awardKarma(userId, 'MATCH_LOST', { client: tx, sport: params.sport, city: params.city, season });
    }
  });

  return getLeaderboard({ city: params.city, sport: params.sport, season, limit: 100 });
}
