/**
 * Attach okres + mestská časť to scraped events (fixed source or dynamic resolve).
 */

import {
  boroughToSlug,
  districtForBorough,
  resolveBorough,
  type BratislavaBorough,
  type BratislavaDistrict,
  type ParsedEvent,
} from '@/lib/scrape/bratislava-location';
import {
  scrapingSourceByAdapter,
  scrapingSourceByVenueKey,
  VENUE_BOROUGH_OVERRIDES,
} from '@/lib/scrape/scraping-sources';
import type { NormalizedScrapedEvent } from '@/lib/scrape/types';

export interface TaggedLocation {
  district: BratislavaDistrict;
  borough: BratislavaBorough;
  districtSlug: string;
}

function locationFromVenueKey(venueKey: string): TaggedLocation | null {
  const override = VENUE_BOROUGH_OVERRIDES[venueKey];
  if (override) {
    return {
      district: override.district,
      borough: override.borough,
      districtSlug: boroughToSlug(override.borough),
    };
  }
  const source = scrapingSourceByVenueKey(venueKey);
  if (source && source.borough !== 'Dynamic' && source.district !== 'Bratislava (Všeobecné)') {
    return {
      district: source.district,
      borough: source.borough,
      districtSlug: boroughToSlug(source.borough),
    };
  }
  return null;
}

/**
 * Resolve district/borough for a scraped event:
 * 1) venue-key override
 * 2) fixed scraping source
 * 3) dynamic keyword parse (aggregators / unknown)
 */
export function tagScrapedEventLocation(event: NormalizedScrapedEvent): NormalizedScrapedEvent {
  const fromVenue = locationFromVenueKey(event.venueKey);
  if (fromVenue) {
    return {
      ...event,
      district: fromVenue.district,
      borough: fromVenue.borough,
      requiresAiGraphic: true,
      coverUrl: null,
    };
  }

  const source = scrapingSourceByAdapter(event.source);
  if (
    source &&
    source.borough !== 'Dynamic' &&
    source.district !== 'Bratislava (Všeobecné)'
  ) {
    return {
      ...event,
      district: source.district,
      borough: source.borough,
      requiresAiGraphic: true,
      coverUrl: null,
    };
  }

  const address = event.address ?? '';
  const text = [event.locationName, event.title, event.description, event.city]
    .filter(Boolean)
    .join(' ');
  const resolved = resolveBorough(address, text);
  if (resolved) {
    return {
      ...event,
      district: resolved.district,
      borough: resolved.borough,
      address: address || event.address,
      locationName: event.locationName,
      requiresAiGraphic: true,
      coverUrl: null,
    };
  }

  return {
    ...event,
    requiresAiGraphic: true,
    coverUrl: null,
  };
}

/** Map a tagged scraped event into the canonical ParsedEvent contract. */
export function toParsedEvent(event: NormalizedScrapedEvent): ParsedEvent | null {
  if (!event.district || !event.borough) return null;

  const price =
    event.priceCents != null && event.priceCents > 0
      ? `${(event.priceCents / 100).toFixed(2)} EUR`
      : undefined;

  return {
    title: event.title,
    description: event.description ?? '',
    startDate: event.startsAt,
    locationName: event.locationName ?? event.venueKey,
    address: event.address ?? '',
    district: event.district,
    borough: event.borough,
    price,
    sourceUrl: event.sourceUrl ?? event.ticketUrl ?? '',
    category: event.category,
    requiresAiGraphic: true,
  };
}

export function boroughSlugForEvent(event: NormalizedScrapedEvent): string | null {
  if (event.borough) return boroughToSlug(event.borough);
  const fromVenue = locationFromVenueKey(event.venueKey);
  return fromVenue?.districtSlug ?? null;
}

export function ensureDistrictMatchesBorough(
  borough: BratislavaBorough,
  district?: BratislavaDistrict | null,
): BratislavaDistrict {
  const expected = districtForBorough(borough);
  if (district && district !== expected) return expected;
  return expected;
}
