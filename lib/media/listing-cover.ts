/**
 * Listing covers for events / tournaments.
 * Form Factory photography and brand assets must never be shown or persisted.
 * Stock Unsplash / facility stand-ins are also hidden until we have rights
 * to redistribute venue-looking imagery — UI uses a neutral gradient instead.
 */

export type ListingCoverContext = {
  source?: string | null;
  sourceUrl?: string | null;
  ticketUrl?: string | null;
  coverUrl?: string | null;
  venueName?: string | null;
  title?: string | null;
  name?: string | null;
};

const FORM_FACTORY_TEXT =
  /formfactory|form-factory|form\s*factory/i;

/** Stock plates (courts, tracks, gyms) — not cleared for redistribution yet. */
const STOCK_FACILITY_HOST =
  /(?:^|\.)(?:images\.)?unsplash\.com|(?:^|\.)pexels\.com|(?:^|\.)pixabay\.com/i;

export function isFormFactoryListing(ctx: ListingCoverContext): boolean {
  if ((ctx.source ?? '').trim().toLowerCase() === 'form-factory') return true;
  const hay = [
    ctx.sourceUrl,
    ctx.ticketUrl,
    ctx.coverUrl,
    ctx.venueName,
    ctx.title,
    ctx.name,
  ]
    .filter(Boolean)
    .join('\n');
  return FORM_FACTORY_TEXT.test(hay);
}

export function isStockFacilityImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    return STOCK_FACILITY_HOST.test(new URL(url).hostname);
  } catch {
    return STOCK_FACILITY_HOST.test(url);
  }
}

export function isBlockedOrganizerImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  if (FORM_FACTORY_TEXT.test(url)) return true;
  return isStockFacilityImageUrl(url);
}

/** Drop blocked covers so UI never renders venue/stock photos without rights. */
export function sanitizeListingCoverUrl(
  coverUrl: string | null | undefined,
  ctx: ListingCoverContext = {},
): string | null {
  if (isFormFactoryListing({ ...ctx, coverUrl })) return null;
  if (isBlockedOrganizerImageUrl(coverUrl)) return null;
  const trimmed = coverUrl?.trim();
  return trimmed ? trimmed : null;
}

export function sanitizeListingPhotos(
  photos: string[] | null | undefined,
  ctx: ListingCoverContext = {},
): string[] {
  if (isFormFactoryListing(ctx)) return [];
  return (photos ?? []).filter((url) => !isBlockedOrganizerImageUrl(url));
}
