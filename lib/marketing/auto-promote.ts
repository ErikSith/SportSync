import { createClient } from '@/lib/supabase/server';

export interface PromoteResult {
  ok: boolean;
  underfilledEvents: number;
  promotionsCreated: number;
  error?: string;
}

/**
 * Auto-promotion engine for Venue Owners.
 *
 * Scans events at a venue that are underfilled (< 50% capacity or
 * < 5 registered) and starting within the next 7 days, then writes
 * a platform_signal that the notification layer can pick up.
 */
export async function autoPromoteVenueEvents(venueId: string): Promise<PromoteResult> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, sport, city, starts_at, capacity, registered_count, status')
    .eq('venue_id', venueId)
    .eq('status', 'open')
    .gte('starts_at', now)
    .lte('starts_at', sevenDays.toISOString());

  if (error) {
    return { ok: false, underfilledEvents: 0, promotionsCreated: 0, error: error.message };
  }

  if (!events || events.length === 0) {
    return { ok: true, underfilledEvents: 0, promotionsCreated: 0 };
  }

  const underfilled = events.filter((e) => {
    const capacity = (e.capacity as number) ?? 0;
    const registered = (e.registered_count as number) ?? 0;
    if (capacity === 0) return false;
    const fillRate = registered / capacity;
    return fillRate < 0.5 || registered < 5;
  });

  if (underfilled.length === 0) {
    return { ok: true, underfilledEvents: 0, promotionsCreated: 0 };
  }

  let created = 0;
  for (const event of underfilled) {
    const capacity = (event.capacity as number) ?? 0;
    const registered = (event.registered_count as number) ?? 0;
    const spotsLeft = capacity - registered;

    const message =
      spotsLeft > 0
        ? `🚨 Only ${spotsLeft} spot(s) left for "${event.title as string}" (${event.sport as string}) on ${new Date(event.starts_at as string).toLocaleDateString('en-GB')} in ${event.city as string}. Promote now to fill up!`
        : `📢 "${event.title as string}" (${event.sport as string}) is open for registration. Spread the word!`;

    const { error: signalError } = await supabase.from('platform_signals').insert({
      event_name: 'marketing.promote_event',
      payload: {
        venueId,
        eventId: event.id as string,
        title: event.title as string,
        sport: event.sport as string,
        city: event.city as string,
        startsAt: event.starts_at as string,
        capacity,
        registered,
        spotsLeft,
        message,
        suggestedAction: 'push_notification',
      },
    });

    if (!signalError) created++;
  }

  return {
    ok: true,
    underfilledEvents: underfilled.length,
    promotionsCreated: created,
  };
}

/**
 * Get underfilled events for a venue (for display in the manage dashboard).
 */
export async function getUnderfilledEvents(venueId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, sport, city, starts_at, capacity, registered_count, status')
    .eq('venue_id', venueId)
    .eq('status', 'open')
    .gte('starts_at', now)
    .lte('starts_at', sevenDays.toISOString());

  if (error || !events) return [];

  return events
    .filter((e) => {
      const capacity = (e.capacity as number) ?? 0;
      const registered = (e.registered_count as number) ?? 0;
      if (capacity === 0) return false;
      return registered / capacity < 0.5 || registered < 5;
    })
    .map((e) => ({
      id: e.id as string,
      title: e.title as string,
      sport: e.sport as string,
      city: e.city as string,
      startsAt: e.starts_at as string,
      capacity: (e.capacity as number) ?? 0,
      registered: (e.registered_count as number) ?? 0,
      spotsLeft: ((e.capacity as number) ?? 0) - ((e.registered_count as number) ?? 0),
      fillRate: ((e.capacity as number) ?? 0) > 0
        ? Math.round((((e.registered_count as number) ?? 0) / ((e.capacity as number) ?? 0)) * 100)
        : 0,
    }));
}