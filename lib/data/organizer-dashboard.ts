import { createClient } from '@/lib/supabase/server';
import { parseDbInstant } from '@/lib/datetime/bratislava';

export interface OrganizerContentItem {
  id: string;
  kind: 'event' | 'tournament';
  title: string;
  sport: string;
  startsAt: Date;
  status: string;
  href: string;
}

/** Upcoming events and tournaments organized by the signed-in profile. */
export async function getOrganizerUpcomingContent(profileId: string): Promise<OrganizerContentItem[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [eventsResult, tournamentsResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, sport, starts_at, status')
      .eq('organizer_id', profileId)
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(10),
    supabase
      .from('tournaments')
      .select('id, name, sport, starts_at, status')
      .eq('organizer_id', profileId)
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(10),
  ]);

  const items: OrganizerContentItem[] = [];

  for (const row of eventsResult.data ?? []) {
    items.push({
      id: row.id as string,
      kind: 'event',
      title: row.title as string,
      sport: row.sport as string,
      startsAt: parseDbInstant(row.starts_at as string),
      status: row.status as string,
      href: '/events',
    });
  }

  for (const row of tournamentsResult.data ?? []) {
    items.push({
      id: row.id as string,
      kind: 'tournament',
      title: row.name as string,
      sport: row.sport as string,
      startsAt: parseDbInstant(row.starts_at as string),
      status: row.status as string,
      href: '/tournaments',
    });
  }

  return items.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
