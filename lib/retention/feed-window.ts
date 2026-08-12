/** How long after `starts_at` an event still appears in discovery feeds. */
export const FEED_ACTIVE_GRACE_HOURS = 2;

/** Lower bound for feed queries: `starts_at >= NOW() - 2 hours`. */
export function activeFeedSince(now = new Date()): Date {
  return new Date(now.getTime() - FEED_ACTIVE_GRACE_HOURS * 60 * 60 * 1000);
}

export function activeFeedSinceIso(now = new Date()): string {
  return activeFeedSince(now).toISOString();
}

/**
 * Floor for feed `starts_at` filters.
 * When a date window is active, never go earlier than the grace floor
 * (keeps recently started events visible during "today").
 */
export function feedStartsAtFloor(windowFrom?: Date | null, now = new Date()): string {
  const grace = activeFeedSince(now);
  if (!windowFrom) return grace.toISOString();
  return (windowFrom > grace ? windowFrom : grace).toISOString();
}
