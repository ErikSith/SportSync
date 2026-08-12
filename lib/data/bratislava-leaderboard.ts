import { createClient } from '@/lib/supabase/server';

export interface BratislavaVenueEntry {
  rank: number;
  venueId: string;
  name: string;
  city: string;
  sports: string[];
  verified: boolean;
  coverUrl: string | null;
  /** Total number of events hosted at the venue (all-time). */
  totalEvents: number;
  /** Events scheduled in the future. */
  upcomingEvents: number;
  /** Sum of registered_count across all events. */
  totalRegistrations: number;
  /** Distinct players who registered for any event at the venue. */
  uniquePlayers: number;
  /** Average fill rate across events that had a capacity set (0-100). */
  avgFillRate: number;
  /** Composite popularity score used for ranking. */
  score: number;
}

/**
 * Aggregate performance metrics for Bratislava-based venues and rank them by a
 * composite "popularity" score.
 *
 * Score weights (tuned for the VISION.md "City Leaderboards" pillar):
 *  - unique players are the strongest signal of a venue's real community pull
 *  - total registrations reward high-throughput venues
 *  - upcoming events reward currently-active venues
 *  - verified venues get a small boost for trust
 */
export async function getBratislavaVenueLeaderboard(limit = 20): Promise<BratislavaVenueEntry[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: venues, error } = await supabase
    .from('venues')
    .select('id, name, city, sports, verified, cover_url')
    .eq('city', 'Bratislava')
    .order('name', { ascending: true });

  if (error || !venues || venues.length === 0) return [];

  const venueIds = venues.map((v) => v.id as string);

  const { data: events } = await supabase
    .from('events')
    .select('id, venue_id, capacity, registered_count, status, starts_at')
    .in('venue_id', venueIds);

  const { data: regs } = events && events.length > 0
    ? await supabase
        .from('event_registrations')
        .select('event_id, user_id')
        .in('event_id', events.map((e) => e.id as string))
    : { data: [] };

  const eventByVenue = new Map<string, typeof events>();
  for (const e of events ?? []) {
    const vid = e.venue_id as string;
    const list = eventByVenue.get(vid) ?? [];
    list.push(e);
    eventByVenue.set(vid, list);
  }

  const regByEvent = new Map<string, Set<string>>();
  for (const r of regs ?? []) {
    const eid = r.event_id as string;
    const uid = r.user_id as string;
    const set = regByEvent.get(eid) ?? new Set<string>();
    set.add(uid);
    regByEvent.set(eid, set);
  }

  const entries: BratislavaVenueEntry[] = venues.map((v) => {
    const vid = v.id as string;
    const vEvents = eventByVenue.get(vid) ?? [];
    const totalEvents = vEvents.length;
    let upcomingEvents = 0;
    let totalRegistrations = 0;
    let totalCapacity = 0;
    let capacityCount = 0;
    const uniquePlayers = new Set<string>();

    for (const e of vEvents) {
      if ((e.starts_at as string) >= now) upcomingEvents++;
      const regCount = (e.registered_count as number) ?? 0;
      totalRegistrations += regCount;
      if (e.capacity != null) {
        totalCapacity += e.capacity as number;
        capacityCount++;
      }
      const players = regByEvent.get(e.id as string);
      if (players) for (const p of players) uniquePlayers.add(p);
    }

    const avgFillRate = totalCapacity > 0 ? Math.round((totalRegistrations / totalCapacity) * 100) : 0;
    const verifiedBoost = v.verified ? 1.15 : 1;

    const score = Math.round(
      (uniquePlayers.size * 3 + totalRegistrations * 1 + upcomingEvents * 5) * verifiedBoost,
    );

    return {
      rank: 0,
      venueId: vid,
      name: v.name as string,
      city: v.city as string,
      sports: (v.sports as string[]) ?? [],
      verified: Boolean(v.verified),
      coverUrl: (v.cover_url as string) ?? null,
      totalEvents,
      upcomingEvents,
      totalRegistrations,
      uniquePlayers: uniquePlayers.size,
      avgFillRate,
      score,
    };
  });

  entries.sort((a, b) => b.score - a.score || b.totalEvents - a.totalEvents);
  entries.forEach((e, i) => (e.rank = i + 1));

  return entries.slice(0, limit);
}