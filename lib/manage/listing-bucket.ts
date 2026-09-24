/**
 * Manage-hub create destinations → feed pages.
 *
 * | Bucket      | Create route                         | Lands on              |
 * |-------------|--------------------------|-----------|
 * | event       | /manage/events/create                | /events               |
 * | group_class | /manage/events/create?bucket=…       | /skupinove-cvicenia   |
 * | camps       | /manage/programs/create?kind=camps   | /tabory               |
 * | workshops   | /manage/programs/create?kind=…       | /programs             |
 * | courses     | /manage/programs/create?kind=…       | /kruzky               |
 * | tournament  | /tournaments/create                  | /tournaments          |
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

/** Programs create `?kind=` → listing bucket. */
export function programKindToListingBucket(
  kind: string | undefined | null,
): Extract<ManageListingBucket, 'camps' | 'workshops' | 'courses'> {
  if (kind === 'workshops' || kind === 'courses') return kind;
  return 'camps';
}

export function manageListingSuccessPath(bucket: ManageListingBucket): string {
  switch (bucket) {
    case 'group_class':
      return '/skupinove-cvicenia';
    case 'camps':
      return '/tabory';
    case 'workshops':
      return '/programs';
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
