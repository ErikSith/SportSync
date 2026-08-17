import { startOfAppDay } from '@/lib/datetime/bratislava';

/** How long after `starts_at` a listing still appears once the calendar day has rolled. */
export const FEED_ACTIVE_GRACE_HOURS = 2;

/**
 * Lower bound for feed queries.
 * Keep the whole Bratislava calendar day (today's rozpisy stay listed after you
 * open a lesson), plus a 2h overnight tail so late events don't vanish at 00:01.
 */
export function activeFeedSince(now = new Date()): Date {
  const grace = new Date(now.getTime() - FEED_ACTIVE_GRACE_HOURS * 60 * 60 * 1000);
  const dayStart = startOfAppDay(now);
  return dayStart < grace ? dayStart : grace;
}

export function activeFeedSinceIso(now = new Date()): string {
  return activeFeedSince(now).toISOString();
}

/**
 * Floor for feed `starts_at` filters.
 * When a date window is active, never go earlier than the feed floor
 * (keeps today's lessons visible while browsing / after returning from a page).
 */
export function feedStartsAtFloor(windowFrom?: Date | null, now = new Date()): string {
  const grace = activeFeedSince(now);
  if (!windowFrom) return grace.toISOString();
  return (windowFrom > grace ? windowFrom : grace).toISOString();
}
