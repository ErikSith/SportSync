import { createClient } from '@/lib/supabase/server';
import { DEFAULT_RADIUS_KM } from '@/lib/geo';

export interface VenueOccupancyStats {
  venueId: string;
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  avgCapacity: number;
  avgFillRate: number;
  totalRegistrations: number;
  uniquePlayers: number;
}

export interface VenueEventTrend {
  month: string;
  events: number;
  registrations: number;
  avgFillRate: number;
}

export interface VenueSportDistribution {
  sport: string;
  events: number;
  percentage: number;
}

export interface VenueCoachRelation {
  coachId: string;
  coachName: string;
  lessonCount: number;
  upcomingLessons: number;
}

/**
 * Get comprehensive occupancy and performance stats for a venue.
 */
export async function getVenueOccupancyStats(venueId: string): Promise<VenueOccupancyStats | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: events, error } = await supabase
    .from('events')
    .select('id, capacity, registered_count, status, starts_at')
    .eq('venue_id', venueId);

  if (error || !events) return null;

  let totalEvents = events.length;
  let upcomingEvents = 0;
  let completedEvents = 0;
  let totalCapacity = 0;
  let totalRegistered = 0;
  let capacityCount = 0;
  const uniquePlayers = new Set<string>();

  for (const e of events) {
    if (e.status === 'completed' || (e.starts_at as string) < now) {
      completedEvents++;
    } else {
      upcomingEvents++;
    }

    if (e.capacity != null) {
      totalCapacity += e.capacity as number;
      capacityCount++;
    }
    totalRegistered += (e.registered_count as number) ?? 0;
  }

  // Get unique player count from event_registrations
  const { data: regs } = await supabase
    .from('event_registrations')
    .select('user_id')
    .in('event_id', events.map((e) => e.id as string));

  for (const r of regs ?? []) {
    uniquePlayers.add(r.user_id as string);
  }

  return {
    venueId,
    totalEvents,
    upcomingEvents,
    completedEvents,
    avgCapacity: capacityCount > 0 ? Math.round(totalCapacity / capacityCount) : 0,
    avgFillRate: totalCapacity > 0 ? Math.round((totalRegistered / totalCapacity) * 100) : 0,
    totalRegistrations: totalRegistered,
    uniquePlayers: uniquePlayers.size,
  };
}

/**
 * Monthly event trends for a venue (last 6 months).
 */
export async function getVenueEventTrends(venueId: string): Promise<VenueEventTrend[]> {
  const supabase = await createClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: events, error } = await supabase
    .from('events')
    .select('id, starts_at, registered_count, capacity')
    .eq('venue_id', venueId)
    .gte('starts_at', sixMonthsAgo.toISOString())
    .order('starts_at', { ascending: true });

  if (error || !events) return [];

  const monthMap = new Map<string, { events: number; registrations: number; totalCapacity: number }>();

  for (const e of events) {
    const date = new Date(e.starts_at as string);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthMap.get(month) ?? { events: 0, registrations: 0, totalCapacity: 0 };
    entry.events++;
    entry.registrations += (e.registered_count as number) ?? 0;
    entry.totalCapacity += (e.capacity as number) ?? 0;
    monthMap.set(month, entry);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      events: data.events,
      registrations: data.registrations,
      avgFillRate: data.totalCapacity > 0 ? Math.round((data.registrations / data.totalCapacity) * 100) : 0,
    }));
}

/**
 * Sport distribution for events at a venue.
 */
export async function getVenueSportDistribution(venueId: string): Promise<VenueSportDistribution[]> {
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from('events')
    .select('sport')
    .eq('venue_id', venueId);

  if (error || !events || events.length === 0) return [];

  const sportMap = new Map<string, number>();
  for (const e of events) {
    const sport = e.sport as string;
    sportMap.set(sport, (sportMap.get(sport) ?? 0) + 1);
  }

  const total = events.length;
  return Array.from(sportMap.entries())
    .map(([sport, count]) => ({
      sport,
      events: count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.events - a.events);
}

/**
 * Coaches linked to a venue via training lessons.
 */
export async function getVenueCoachRelations(venueId: string): Promise<VenueCoachRelation[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: lessons, error } = await supabase
    .from('training_lessons')
    .select('id, coach_id, starts_at, status, profiles!inner(full_name, username)')
    .eq('venue_id', venueId);

  if (error || !lessons) return [];

  const coachMap = new Map<string, { coachName: string; lessonCount: number; upcomingLessons: number }>();

  for (const l of lessons) {
    const coachId = l.coach_id as string;
    const profile = l.profiles as unknown as { full_name?: string | null; username?: string };
    const coachName = profile?.full_name ?? profile?.username ?? 'Unknown';
    const entry = coachMap.get(coachId) ?? { coachName, lessonCount: 0, upcomingLessons: 0 };
    entry.lessonCount++;
    if ((l.starts_at as string) >= now) entry.upcomingLessons++;
    coachMap.set(coachId, entry);
  }

  return Array.from(coachMap.entries()).map(([coachId, data]) => ({
    coachId,
    coachName: data.coachName,
    lessonCount: data.lessonCount,
    upcomingLessons: data.upcomingLessons,
  }));
}

/**
 * Consolidated venue dashboard data for the manage page.
 */
export async function getVenueDashboard(venueId: string) {
  const [stats, trends, sports, coaches] = await Promise.all([
    getVenueOccupancyStats(venueId),
    getVenueEventTrends(venueId),
    getVenueSportDistribution(venueId),
    getVenueCoachRelations(venueId),
  ]);

  return { stats, trends, sports, coaches };
}