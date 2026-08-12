/**
 * DB-backed Bratislava area feeds.
 * Borough filters use venues.district, then events/tournaments by venue_id.
 */

import {
  findDistrictById,
  isBratislavaCity,
  matchesFeedArea,
  type ResolvedFeedLocation,
} from '@/lib/cities';
import { createClient } from '@/lib/supabase/server';
import {
  getAllActiveEventsFeed,
  getCityEventsFeed,
  getEventsAtVenuesFeed,
  getNearbyEventsFeed,
  type EventFeedResult,
  type ParticipationMode,
} from '@/lib/data/events';
import type { EventType } from '@/lib/constants/events';
import {
  getCityVenuesFeed,
  getDistrictVenuesFeed,
  getNearbyVenuesFeed,
  type VenueFeedResult,
} from '@/lib/data/venues';
import {
  getUpcomingTournaments,
  getUpcomingTournamentsAtVenues,
  type TournamentCardData,
} from '@/lib/data/tournaments';

/** Venue ids in a Bratislava borough from the database. */
export async function getVenueIdsForDistrict(districtId: string): Promise<string[]> {
  const district = findDistrictById(districtId);
  if (!district) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('venues')
    .select('id')
    .eq('district', districtId);

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[area-feed.getVenueIdsForDistrict]', error.message);
    }
    return [];
  }

  return (data ?? []).map((row) => row.id as string);
}

export async function getEventsForArea(input: {
  location: ResolvedFeedLocation;
  type?: EventType | 'ALL';
  participationMode?: ParticipationMode | 'all';
}): Promise<EventFeedResult> {
  const { location, type = 'ALL', participationMode } = input;

  if (location.area === 'near_me') {
    return getNearbyEventsFeed({
      lat: location.lat,
      lng: location.lng,
      type,
      participationMode,
      radiusKm: location.radiusKm,
      allowExtended: location.allowExtended,
    });
  }

  if (location.area === 'bratislava') {
    return getCityEventsFeed({
      city: 'Bratislava',
      type,
      participationMode,
      lat: location.lat,
      lng: location.lng,
    });
  }

  const venueIds = await getVenueIdsForDistrict(location.area);
  const feed = await getEventsAtVenuesFeed({
    venueIds,
    lat: location.lat,
    lng: location.lng,
    type,
    participationMode,
  });

  // Fallback: geo/keyword match when borough has few tagged venues yet
  if (feed.events.length === 0) {
    const cityFeed = await getCityEventsFeed({
      city: 'Bratislava',
      type,
      participationMode,
      lat: location.lat,
      lng: location.lng,
    });
    const filtered = cityFeed.events.filter((event) =>
      matchesFeedArea(location, {
        lat: event.latitude,
        lng: event.longitude,
        city: event.city,
        textParts: [event.venueName, event.title, event.description],
      }),
    );
    if (filtered.length > 0) {
      return {
        ...cityFeed,
        events: filtered,
        message: cityFeed.message,
      };
    }
    // Last resort: all active events across cities
    return getAllActiveEventsFeed({
      type,
      participationMode,
      lat: location.lat,
      lng: location.lng,
    });
  }

  return {
    ...feed,
    message:
      feed.events.length === 0
        ? `No events in ${location.label} right now.`
        : feed.message,
  };
}

export async function getVenuesForArea(input: {
  location: ResolvedFeedLocation;
}): Promise<VenueFeedResult> {
  const { location } = input;

  if (location.area === 'near_me') {
    return getNearbyVenuesFeed({
      lat: location.lat,
      lng: location.lng,
      radiusKm: location.radiusKm,
      allowExtended: location.allowExtended,
    });
  }

  if (location.area === 'bratislava') {
    return getCityVenuesFeed({
      city: 'Bratislava',
      lat: location.lat,
      lng: location.lng,
    });
  }

  const feed = await getDistrictVenuesFeed({
    districtId: location.area,
    lat: location.lat,
    lng: location.lng,
  });

  return {
    ...feed,
    message:
      feed.venues.length === 0
        ? `No venues in ${location.label} right now.`
        : feed.message,
  };
}

export async function getTournamentsForArea(input: {
  location: ResolvedFeedLocation;
}): Promise<TournamentCardData[]> {
  const { location } = input;

  if (location.area === 'bratislava') {
    const all = await getUpcomingTournaments({});
    return all.filter(
      (t) =>
        isBratislavaCity(t.venueCity) ||
        matchesFeedArea(location, {
          lat: t.venueLatitude,
          lng: t.venueLongitude,
          city: t.venueCity,
          textParts: [t.venueName, t.venueAddress, t.name],
        }),
    );
  }

  if (location.area === 'near_me') {
    const all = await getUpcomingTournaments({});
    const nearby = all.filter((t) =>
      matchesFeedArea(location, {
        lat: t.venueLatitude,
        lng: t.venueLongitude,
        city: t.venueCity,
        textParts: [t.venueName, t.venueAddress, t.name],
      }),
    );
    return nearby.length > 0 ? nearby : all;
  }

  const venueIds = await getVenueIdsForDistrict(location.area);
  if (venueIds.length > 0) {
    const atVenues = await getUpcomingTournamentsAtVenues(venueIds, 50);
    if (atVenues.length > 0) return atVenues;
  }

  // Fallback: keyword / geo match when borough venues are sparse
  const all = await getUpcomingTournaments({});
  return all.filter((t) =>
    matchesFeedArea(location, {
      lat: t.venueLatitude,
      lng: t.venueLongitude,
      city: t.venueCity,
      textParts: [t.venueName, t.venueAddress, t.name],
    }),
  );
}
