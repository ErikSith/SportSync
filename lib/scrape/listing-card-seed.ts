/**
 * When a listing page is only a card grid (titles + links), seed stubs from
 * those cards and enrich each detail page — same pattern as Gopass /e- cards.
 */
import { detectEventSport } from '@/lib/constants/sports';
import {
  discoverCardDetailLinks,
  enrichScrapedEventsWithDetails,
  MAX_DETAILS_PER_LISTING,
  type DiscoveredDetailLink,
} from '@/lib/scrape/detail-enrich';
import { scrapePageHasKind } from '@/lib/scrape/scrape-page-kind';
import { dateOnlySortInstant } from '@/src/lib/scraper/date-only-time';
import { syncCategoryAndFlags } from '@/src/lib/scraper/category';
import type { ScrapedEvent } from '@/src/lib/scraper/types';

const NAV_NOISE_TITLE =
  /^(späť|spat|back|viac|more|detail|čítaj|citaj|read|tu|here|link)$/i;

function titleFromLink(link: DiscoveredDetailLink): string {
  const fromAnchor = link.anchorText.replace(/\s+/g, ' ').trim();
  if (fromAnchor && !NAV_NOISE_TITLE.test(fromAnchor) && fromAnchor.length >= 3) {
    return fromAnchor.slice(0, 120);
  }
  const slug = link.url.split('/').pop()?.replace(/[-_]+/g, ' ').trim() ?? '';
  return (slug || 'Program').slice(0, 120);
}

function stubFlags(title: string, scrapePageKind?: string | null) {
  const t = title.toLowerCase();
  const isCamp = /t[aá]bor|camp|pr[aá]zdnin/i.test(t);
  const isWorkshop = /workshop|masterclass|semin[aá]r/i.test(t);
  const isTournament = /turnaj|tournament|cup|open\b/i.test(t);
  const isOneOff =
    /podujatie|party|singles?|nezadan|ve[cč]er\s+pre|festival|koncert/i.test(t);
  const kidsClubPage = scrapePageHasKind(scrapePageKind, 'kids_clubs');
  const dedicatedKidsClub =
    kidsClubPage && !scrapePageHasKind(scrapePageKind, 'events') &&
    !scrapePageHasKind(scrapePageKind, 'tournaments') &&
    !scrapePageHasKind(scrapePageKind, 'schedule');
  // Seasonal krúžok/kurz — not news cards / singles parties on mixed venue pages.
  const isCourse =
    !isOneOff &&
    (/kurz|course|s[eé]ria|kr[uú][zž]ok/i.test(t) ||
      (dedicatedKidsClub && !isCamp && !isWorkshop && !isTournament));
  const isGroupClass =
    !isCamp &&
    !isWorkshop &&
    !isTournament &&
    !isCourse &&
    !isOneOff &&
    (/lekcia|tr[eé]ning|class/i.test(t) ||
      scrapePageHasKind(scrapePageKind, 'schedule'));

  return {
    isCamp: Boolean(isCamp),
    isCourse: Boolean(isCourse),
    isWorkshop: Boolean(isWorkshop),
    isTournament: Boolean(isTournament && !isCamp && !isCourse),
    isGroupClass: Boolean(isGroupClass),
    isForKids:
      /det(i|sk)|junior|ml[aá]de[zž]|kr[uú][zž]ok|t[aá]bor/i.test(t) ||
      (dedicatedKidsClub && !isOneOff),
  };
}

/** Placeholder noon tomorrow — detail enrich / date grounding replace when known. */
function placeholderStartIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return dateOnlySortInstant(d.toISOString()).toISOString();
}

export function seedStubEventsFromCardLinks(
  links: DiscoveredDetailLink[],
  listingUrl: string,
  opts?: {
    venueName?: string | null;
    scrapePageKind?: string | null;
    max?: number;
  },
): ScrapedEvent[] {
  const max = opts?.max ?? MAX_DETAILS_PER_LISTING;
  const venueName = opts?.venueName?.trim() || 'Bratislava';
  const seen = new Set<string>();
  const out: ScrapedEvent[] = [];

  for (const link of links) {
    if (out.length >= max) break;
    const key = link.url.replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);

    const title = titleFromLink(link);
    if (NAV_NOISE_TITLE.test(title)) continue;
    const flags = stubFlags(title, opts?.scrapePageKind);

    out.push(
      syncCategoryAndFlags({
        title,
        sportType: detectEventSport(title, 'OTHER'),
        isTournament: flags.isTournament,
        isGroupClass: flags.isGroupClass,
        isCamp: flags.isCamp,
        isWorkshop: flags.isWorkshop,
        isCourse: flags.isCourse,
        isForWomenOnly: false,
        isForKids: flags.isForKids,
        ageCategory: null,
        startTime: placeholderStartIso(),
        timeKnown: false,
        endTime: null,
        locationName: venueName,
        city: 'Bratislava',
        priceText: null,
        description: null,
        originalUrl: link.url,
        detailUrl: link.url,
      }),
    );
  }

  return out;
}

/**
 * Card listing → detail pages: seed stubs from card links, then enrich each detail.
 */
export async function extractEventsFromCardListing(input: {
  listingUrl: string;
  listingHtml: string;
  listingCleanText?: string;
  venueName?: string | null;
  scrapePageKind?: string | null;
  maxDetails?: number;
}): Promise<ScrapedEvent[]> {
  const links = discoverCardDetailLinks(input.listingHtml, input.listingUrl);
  if (links.length === 0) return [];

  const stubs = seedStubEventsFromCardLinks(links, input.listingUrl, {
    venueName: input.venueName,
    scrapePageKind: input.scrapePageKind,
    max: input.maxDetails ?? MAX_DETAILS_PER_LISTING,
  });
  if (stubs.length === 0) return [];

  return enrichScrapedEventsWithDetails(
    stubs,
    input.listingUrl,
    input.listingCleanText ?? '',
    input.listingHtml,
    input.maxDetails ?? MAX_DETAILS_PER_LISTING,
  );
}
