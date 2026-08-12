import {
  eventIdentityKey,
  preferIdentityEvent,
} from '@/lib/events/event-identity';
import type { NormalizedScrapedEvent } from '@/lib/scrape/types';

function scoreScraped(event: NormalizedScrapedEvent): number {
  return (
    (event.registeredCount ?? 0) * 100 +
    (event.venueKey ? 20 : 0) +
    (event.sourceUrl || event.ticketUrl ? 10 : 0) +
    (event.coverUrl ? 5 : 0)
  );
}

function preferScraped(
  a: NormalizedScrapedEvent,
  b: NormalizedScrapedEvent,
): NormalizedScrapedEvent {
  const sa = scoreScraped(a);
  const sb = scoreScraped(b);
  if (sb !== sa) return sb > sa ? b : a;
  return a.externalId <= b.externalId ? a : b;
}

/** Collapse same title + local minute within a scrape batch; keep chronological order. */
export function prepareScrapedEventsForUpsert(
  events: NormalizedScrapedEvent[],
): NormalizedScrapedEvent[] {
  const byKey = new Map<string, NormalizedScrapedEvent>();
  for (const event of events) {
    const key = eventIdentityKey(event.title, event.startsAt);
    const prev = byKey.get(key);
    byKey.set(key, prev ? preferScraped(prev, event) : event);
  }

  return [...byKey.values()].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
}

type SoftRow = {
  id: string;
  title: string | null;
  starts_at: string;
};

/** Match open/draft rows that already occupy the same title + local minute. */
export function pickSoftIdentityMatch<T extends SoftRow>(
  candidates: T[],
  title: string,
  startsAt: Date | string,
): T | null {
  const key = eventIdentityKey(title, startsAt);
  for (const row of candidates) {
    if (!row.title) continue;
    if (eventIdentityKey(row.title, row.starts_at) === key) return row;
  }
  return null;
}

export function softMatchWindow(startsAt: Date): { from: string; to: string } {
  const t = startsAt.getTime();
  return {
    from: new Date(t - 90_000).toISOString(),
    to: new Date(t + 90_000).toISOString(),
  };
}

export { preferIdentityEvent };
