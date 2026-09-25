/**
 * Rýchle akcie — 6 equal hubs (not a “programs” umbrella).
 *
 * | Bucket      | Create route                            | Lands on              |
 * |-------------|-----------------------------------------|-----------------------|
 * | event       | /manage/events/create                   | /events               |
 * | group_class | /manage/skupinove-cvicenia/create       | /skupinove-cvicenia   |
 * | workshops   | /manage/workshopy/create                | /workshopy            |
 * | camps       | /manage/tabory/create                   | /tabory               |
 * | courses     | /manage/kruzky/create                   | /kruzky               |
 * | tournament  | /tournaments/create                     | /tournaments          |
 */

export const MANAGE_LISTING_BUCKETS = [
  'event',
  'group_class',
  'camps',
  'workshops',
  'courses',
] as const;

export type ManageListingBucket = (typeof MANAGE_LISTING_BUCKETS)[number];

export function parseManageListingBucket(
  raw: string | undefined | null,
): ManageListingBucket {
  if (
    raw === 'group_class' ||
    raw === 'camps' ||
    raw === 'workshops' ||
    raw === 'courses'
  ) {
    return raw;
  }
  return 'event';
}

/** Legacy programs create `?kind=` → listing bucket. */
export function programKindToListingBucket(
  kind: string | undefined | null,
): Extract<ManageListingBucket, 'camps' | 'workshops' | 'courses'> {
  if (kind === 'workshops' || kind === 'courses') return kind;
  return 'camps';
}

/** Venue-owner / manage deep-link to create a Rýchla akcia of this type. */
export function manageListingCreatePath(bucket: ManageListingBucket): string {
  switch (bucket) {
    case 'group_class':
      return '/manage/skupinove-cvicenia/create';
    case 'camps':
      return '/manage/tabory/create';
    case 'workshops':
      return '/manage/workshopy/create';
    case 'courses':
      return '/manage/kruzky/create';
    default:
      return '/manage/events/create';
  }
}

export function manageListingSuccessPath(bucket: ManageListingBucket): string {
  switch (bucket) {
    case 'group_class':
      return '/skupinove-cvicenia';
    case 'camps':
      return '/tabory';
    case 'workshops':
      return '/workshopy';
    case 'courses':
      return '/kruzky';
    default:
      return '/events';
  }
}

/** Persist flags so feeds classify the row into the right hub page. */
export function listingPersistFields(bucket: ManageListingBucket): {
  externalId: string | null;
  themeConfig: Record<string, unknown>;
} {
  if (bucket === 'group_class') {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
        : `${Date.now().toString(36)}`;
    return {
      externalId: `class-manage-${id}`,
      themeConfig: { organizerListing: true, listingBucket: 'group_class' },
    };
  }

  if (bucket === 'camps' || bucket === 'workshops' || bucket === 'courses') {
    return {
      externalId: null,
      themeConfig: {
        programKind: bucket,
        organizerListing: true,
        listingBucket: 'program',
      },
    };
  }

  return {
    externalId: null,
    themeConfig: { organizerListing: true, listingBucket: 'event' },
  };
}

/** Hidden marker so manage-created watch tournaments resolve as Sledovať. */
export const MANAGE_WATCH_MARKER = '[[ss:watch]]';

export function applyManageWatchMarker(
  description: string,
  participation: 'participate' | 'spectator',
): string {
  const base = description.replace(/\n*\s*\[\[ss:watch\]\]\s*/gu, '').trim();
  if (participation !== 'spectator') return base;
  return base ? `${base}\n\n${MANAGE_WATCH_MARKER}` : MANAGE_WATCH_MARKER;
}

export function stripManageWatchMarker(description: string): {
  description: string;
  participation: 'participate' | 'spectator';
} {
  const has = description.includes(MANAGE_WATCH_MARKER);
  return {
    description: description.replace(/\n*\s*\[\[ss:watch\]\]\s*/gu, '').trim(),
    participation: has ? 'spectator' : 'participate',
  };
}

export type ManageCreateChipId =
  | 'event'
  | 'tournament'
  | 'group_class'
  | 'camp'
  | 'workshop'
  | 'course';

export function createChipFromListing(
  entityKind: 'event' | 'tournament',
  theme?: unknown,
): ManageCreateChipId {
  if (entityKind === 'tournament') return 'tournament';
  if (!theme || typeof theme !== 'object') return 'event';
  const cfg = theme as { listingBucket?: string; programKind?: string };
  if (cfg.listingBucket === 'group_class') return 'group_class';
  if (cfg.programKind === 'camps' || cfg.listingBucket === 'camps') return 'camp';
  if (cfg.programKind === 'workshops' || cfg.listingBucket === 'workshops') {
    return 'workshop';
  }
  if (cfg.programKind === 'courses' || cfg.listingBucket === 'courses') {
    return 'course';
  }
  return 'event';
}
