/**
 * Listing covers for events / tournaments.
 * Form Factory photography and brand assets must never be shown or persisted.
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

export function isBlockedOrganizerImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return FORM_FACTORY_TEXT.test(url);
}

/** Drop Form Factory covers so UI never renders their photos (or Unsplash stand-ins on FF rows). */
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
