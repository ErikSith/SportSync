/**
 * Venue CTAs should open the sports facility itself — not a scrape listing,
 * tournament calendar, or third-party ticket cart.
 */
const LISTING_PATH_RE =
  /^\/(?:turnaje?|eventy|events?|rozvrh|schedule|aktuality|calendar|kalendar|tag|listky|tournaments?|registracie|presale|rezervacie?|booking)(?:\/|$)/i;

export function toVenueHomepageUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!/^https?:$/i.test(url.protocol)) return null;
    url.hash = '';
    url.search = '';
    if (LISTING_PATH_RE.test(url.pathname)) {
      url.pathname = '/';
    }
    if (url.pathname === '/') {
      return `${url.origin}/`;
    }
    return url.toString();
  } catch {
    return value;
  }
}
