/**
 * DB-backed Bratislava area feeds.
 * Borough filters use venues.district, then events/tournaments by venue_id.
 */

import {
  findDistrictById,
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
    console.error('[area-feed.getVenueIdsForDistrict]', error.message, error);
    return [];
  }

  return (data ?? []).map((row) => row.id as string);
}

/** Union of venue ids across one or more boroughs. */
export async function getVenueIdsForDistricts(districtIds: string[]): Promise<string[]> {
  const unique = [...new Set(districtIds.filter((id) => Boolean(findDistrictById(id))))];
  if (unique.length === 0) return [];
  if (unique.length === 1) return getVenueIdsForDistrict(unique[0]!);

  const batches = await Promise.all(unique.map((id) => getVenueIdsForDistrict(id)));
  return [...new Set(batches.flat())];
}

function locationDistrictIds(location: ResolvedFeedLocation): string[] {
  if (location.districtIds.length > 0) return location.districtIds;
  if (location.area !== 'near_me' && location.area !== 'bratislava') return [location.area];
  return [];
}

export async function getEventsForArea(input: {
  location: ResolvedFeedLocation;
  type?: EventType | 'ALL';
  participationMode?: ParticipationMode | 'all';
}): Promise<EventFeedResult> {
  const { location, type = 'ALL', participationMode } = input;
  const districtIds = locationDistrictIds(location);

  try {
    let feed: EventFeedResult;

    if (location.area === 'near_me') {
      feed = await getNearbyEventsFeed({
        lat: location.lat,
        lng: location.lng,
        type,
        participationMode,
        radiusKm: location.radiusKm,
        allowExtended: location.allowExtended,
      });
    } else if (districtIds.length === 0) {
      feed = await getCityEventsFeed({
        city: 'Bratislava',
        type,
        participationMode,
        lat: location.lat,
        lng: location.lng,
      });
    } else {
      const venueIds = await getVenueIdsForDistricts(districtIds);
      feed = await getEventsAtVenuesFeed({
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
            title: event.title,
            textParts: [event.venueName],
          }),
        );
        if (filtered.length > 0) {
          feed = {
            ...cityFeed,
            events: filtered,
            message: cityFeed.message,
          };
        }
      }
    }

    if (feed.events.length > 0) {
      return {
        ...feed,
        message:
          feed.events.length === 0
            ? `No events in ${location.label} right now.`
            : feed.message,
      };
    }

    // Last resort: all active events (includes null lat/lng)
    return getAllActiveEventsFeed({
      type,
      participationMode,
      lat: location.lat,
      lng: location.lng,
    });
  } catch (error) {
    console.error('[area-feed.getEventsForArea]', error);
    try {
      return await getAllActiveEventsFeed({
        type,
        participationMode,
        lat: location.lat,
        lng: location.lng,
      });
    } catch (fallbackError) {
      console.error('[area-feed.getEventsForArea] fallback failed:', fallbackError);
      return { events: [], radiusKm: 0, showExtended: true, usedAllEventsFallback: true };
    }
  }
}

export async function getVenuesForArea(input: {
  location: ResolvedFeedLocation;
}): Promise<VenueFeedResult> {
  const { location } = input;
  const districtIds = locationDistrictIds(location);

  if (location.area === 'near_me') {
    return getNearbyVenuesFeed({
      lat: location.lat,
      lng: location.lng,
      radiusKm: location.radiusKm,
      allowExtended: location.allowExtended,
    });
  }

  if (districtIds.length === 0) {
    return getCityVenuesFeed({
      city: 'Bratislava',
      lat: location.lat,
      lng: location.lng,
    });
  }

  if (districtIds.length === 1) {
    const feed = await getDistrictVenuesFeed({
      districtId: districtIds[0]!,
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

  const feeds = await Promise.all(
    districtIds.map((districtId) =>
      getDistrictVenuesFeed({
        districtId,
        lat: location.lat,
        lng: location.lng,
      }),
    ),
  );
  const seen = new Set<string>();
  const venues = feeds
    .flatMap((feed) => feed.venues)
    .filter((venue) => {
      if (seen.has(venue.id)) return false;
      seen.add(venue.id);
      return true;
    });

  return {
    venues,
    radiusKm: 0,
    showExtended: false,
    message: venues.length === 0 ? `No venues in ${location.label} right now.` : undefined,
  };
}

export async function getTournamentsForArea(input: {
  location: ResolvedFeedLocation;
}): Promise<TournamentCardData[]> {
  const { location } = input;
  const districtIds = locationDistrictIds(location);

  if (location.area === 'near_me' || districtIds.length === 0) {
    const all = await getUpcomingTournaments({});
    return all.filter((t) =>
      matchesFeedArea(location, {
        lat: t.venueLatitude,
        lng: t.venueLongitude,
        city: t.venueCity,
        title: t.name,
        textParts: [t.venueName, t.venueAddress],
      }),
    );
  }

  const venueIds = await getVenueIdsForDistricts(districtIds);
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
      title: t.name,
      textParts: [t.venueName, t.venueAddress],
    }),
  );
}
