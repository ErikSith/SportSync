/**
 * Shared venue-page scrape: Gemini default, card→detail fallback, browser
 * click-through, image OCR, Reenio.
 */
import {
  fetchHtml,
  htmlToCleanTextDetailed,
  pageHasEventSignal,
} from './fetcher';
import { extractEventsFromText } from './extractor';
import type { ScrapedEvent } from './types';
import { syncCategoryAndFlags } from './category';
import {
  crawlListingDetails,
  formatCrawledDetailsForExtract,
} from './browser';
import { detectBookingEmbed } from './booking/detect-embed';
import {
  DEFAULT_DAYS_AHEAD,
  resolveReenioSubject,
  scrapeReenioTerms,
} from './booking/reenio';
import {
  isMixedScrapePageKind,
  parseScrapePageKinds,
  scrapePageHasKind,
  shouldSkipEventExtractForKind,
  type ScrapePageKind,
} from '@/lib/scrape/scrape-page-kind';
import { extractEventsFromCardListing } from '@/lib/scrape/listing-card-seed';
import {
  extractEventsFromPageImages,
  listingTextLooksSparse,
} from '@/lib/scrape/page-image-extract';

/** Kinds that mean the admin expects Gemini extract even without classic event keywords. */
const FORCE_EXTRACT_KINDS: ReadonlySet<ScrapePageKind> = new Set([
  'schedule',
  'events',
  'tournaments',
  'kids_clubs',
  'kids_camps',
  'workshops',
]);

export type ScrapeVenuePageInput = {
  url: string;
  contentSelector?: string | null;
  bookingProvider?: string | null;
  bookingSubject?: string | null;
  /** Venue display name for Reenio locationName. */
  venueName?: string | null;
  daysAhead?: number;
  /** Admin scrape-page kind(s); kids/events tags bypass keyword pre-filter. */
  scrapePageKind?: string | null;
};

export type ScrapeVenuePageResult = {
  events: ScrapedEvent[];
  html: string;
  text: string;
  usedSelector: string | null;
  preferredMatched: boolean;
  /** How events were produced. */
  path:
    | 'gemini'
    | 'card-details'
    | 'browser-details'
    | 'page-images'
    | 'reenio-forced'
    | 'reenio-fallback'
    | 'empty';
  skippedGemini: boolean;
  reenioSubject: string | null;
  message?: string;
};

async function runReenio(opts: {
  subject: string;
  hostUrl: string;
  venueName?: string | null;
  daysAhead?: number;
}): Promise<ScrapedEvent[]> {
  return scrapeReenioTerms({
    subject: opts.subject,
    hostUrl: opts.hostUrl,
    daysAhead: opts.daysAhead ?? DEFAULT_DAYS_AHEAD,
    locationName: opts.venueName?.trim() || undefined,
    city: 'Bratislava',
  });
}

function mergeByTitle(primary: ScrapedEvent[], extra: ScrapedEvent[]): ScrapedEvent[] {
  const seen = new Set(
    primary.map((e) => e.title.toLowerCase().replace(/\s+/g, ' ').trim()),
  );
  const out = [...primary];
  for (const e of extra) {
    const key = e.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/**
 * Apply admin page-kind hints when Gemini/vision didn't set course/camp/kids flags.
 * Upsert also uses scrapePageKind — this keeps ScrapedEvent consistent for logs/tests.
 * Mixed multi-role pages only get soft title-based course tags (not page-wide force).
 */
function applyPageKindHints(
  events: ScrapedEvent[],
  scrapePageKind?: string | null,
): ScrapedEvent[] {
  if (!scrapePageKind || events.length === 0) return events;
  const mixed = isMixedScrapePageKind(scrapePageKind);
  const kids =
    scrapePageHasKind(scrapePageKind, 'kids_clubs') ||
    scrapePageHasKind(scrapePageKind, 'kids_camps');
  const dedicatedClubs =
    scrapePageHasKind(scrapePageKind, 'kids_clubs') && !mixed;
  const campsOnly =
    scrapePageHasKind(scrapePageKind, 'kids_camps') && !mixed;
  const workshopsOnly =
    scrapePageHasKind(scrapePageKind, 'workshops') && !mixed;

  return events.map((e) => {
    const oneOff =
      /podujatie|party|singles?|nezadan|ve[cč]er\s+pre|festival|koncert/i.test(
        e.title,
      );
    const isCamp =
      !oneOff && (e.isCamp || campsOnly || /t[aá]bor|camp/i.test(e.title));
    const isWorkshop =
      e.isWorkshop || workshopsOnly || /workshop|masterclass/i.test(e.title);
    const titleLooksClub = /kr[uú][zž]ok|kurz/i.test(e.title);
    const isCourse =
      !oneOff &&
      (e.isCourse ||
        (!isCamp &&
          !isWorkshop &&
          !e.isTournament &&
          (dedicatedClubs || titleLooksClub)));
    const titleKids =
      /det(i|sk)|junior|ml[aá]de[zž]|kr[uú][zž]ok|t[aá]bor|kids?\b/i.test(e.title);
    return syncCategoryAndFlags({
      ...e,
      category: undefined,
      isCamp: Boolean(isCamp),
      isWorkshop: Boolean(isWorkshop),
      isCourse: Boolean(isCourse),
      isTournament: Boolean(e.isTournament && !isCamp && !isWorkshop && !isCourse),
      isGroupClass: Boolean(
        e.isGroupClass && !isCamp && !isWorkshop && !isCourse && !oneOff,
      ),
      // Never blanket for_kids from mixed kids_clubs+events pages.
      isForKids: Boolean(
        e.isForKids || titleKids || ((kids && !mixed) && (isCamp || isCourse)),
      ),
    });
  });
}

/**
 * Fetch host URL and extract events (Gemini, card details, images, and/or Reenio).
 */
export async function scrapeVenuePage(
  input: ScrapeVenuePageInput,
): Promise<ScrapeVenuePageResult> {
  const html = await fetchHtml(input.url);
  const cleaned = htmlToCleanTextDetailed(html, input.contentSelector ?? null);
  const text = cleaned.text.slice(0, 48_000);
  const base = {
    html,
    text,
    usedSelector: cleaned.usedSelector,
    preferredMatched: cleaned.preferredMatched,
    reenioSubject: null as string | null,
  };

  const provider = (input.bookingProvider ?? '').trim().toLowerCase();
  const forceReenio = provider === 'reenio';

  if (forceReenio) {
    const subject = await resolveReenioSubject({
      bookingSubject: input.bookingSubject,
      html,
    });
    if (!subject) {
      return {
        ...base,
        events: [],
        path: 'empty',
        skippedGemini: true,
        message:
          'booking_provider=reenio but subject missing (set booking_subject or embed must expose subject)',
      };
    }
    const events = await runReenio({
      subject,
      hostUrl: input.url,
      venueName: input.venueName,
      daysAhead: input.daysAhead,
    });
    return {
      ...base,
      events,
      path: 'reenio-forced',
      skippedGemini: true,
      reenioSubject: subject,
    };
  }

  // --- Gemini path ---
  let geminiEvents: ScrapedEvent[] = [];
  let skippedGemini = false;
  let geminiBlocked = false;

  const kindForcesExtract =
    !shouldSkipEventExtractForKind(input.scrapePageKind) &&
    parseScrapePageKinds(input.scrapePageKind).some((k) =>
      FORCE_EXTRACT_KINDS.has(k),
    );

  if (!text || text.length < 40) {
    geminiBlocked = true;
    skippedGemini = true;
  } else if (!pageHasEventSignal(text) && !kindForcesExtract) {
    geminiBlocked = true;
    skippedGemini = true;
  } else {
    geminiEvents = await extractEventsFromText(input.url, text, {
      listingHtml: html,
    });
  }

  const sparse = listingTextLooksSparse(text);

  // --- Card grid → detail pages (RŠK krúžky, event cards, …) ---
  // When listing is only teasers, or Gemini returned nothing, follow child URLs.
  if (geminiEvents.length === 0 || sparse) {
    try {
      const fromCards = await extractEventsFromCardListing({
        listingUrl: input.url,
        listingHtml: html,
        listingCleanText: text,
        venueName: input.venueName,
        scrapePageKind: input.scrapePageKind,
      });
      if (fromCards.length > 0) {
        const merged = applyPageKindHints(
          mergeByTitle(geminiEvents, fromCards),
          input.scrapePageKind,
        );
        // Prefer card-details path when Gemini had nothing useful
        if (geminiEvents.length === 0) {
          return {
            ...base,
            events: merged,
            path: 'card-details',
            skippedGemini,
            message: `card-details:${fromCards.length}`,
          };
        }
        geminiEvents = merged;
      }
    } catch (err) {
      console.warn(
        '[scrape-venue-page] card-details failed:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  // --- Playwright / browser click-through when HTTP cards still empty ---
  if (geminiEvents.length === 0 || sparse) {
    try {
      const crawled = await crawlListingDetails(input.url, {
        listingHtml: html,
        mode: 'auto',
      });
      if (crawled.length > 0) {
        const detailBlob = formatCrawledDetailsForExtract(crawled);
        const fromBrowser = await extractEventsFromText(input.url, detailBlob);
        // Bind each event's originalUrl to the crawled detail when still listing URL
        const withDetailUrls = fromBrowser.map((e) => {
          const match = crawled.find(
            (p) =>
              e.originalUrl === p.detailUrl ||
              e.detailUrl === p.detailUrl ||
              (e.title &&
                p.anchorText &&
                p.anchorText.toLowerCase().includes(e.title.slice(0, 20).toLowerCase())),
          );
          const detailUrl = match?.detailUrl ?? e.detailUrl ?? e.originalUrl;
          return syncCategoryAndFlags({
            ...e,
            detailUrl,
            originalUrl: detailUrl,
          });
        });
        if (withDetailUrls.length > 0) {
          const merged = applyPageKindHints(
            mergeByTitle(geminiEvents, withDetailUrls),
            input.scrapePageKind,
          );
          if (geminiEvents.length === 0) {
            return {
              ...base,
              events: merged,
              path: 'browser-details',
              skippedGemini,
              message: `browser-details:${crawled.length}`,
            };
          }
          geminiEvents = merged;
        }
      }
    } catch (err) {
      console.warn(
        '[scrape-venue-page] browser-details failed:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (geminiEvents.length > 0) {
    return {
      ...base,
      events: applyPageKindHints(geminiEvents, input.scrapePageKind),
      path: 'gemini',
      skippedGemini: false,
    };
  }

  // --- Poster / flyer images when text is empty or tearsheets only ---
  if (sparse || text.length < 400) {
    try {
      const vision = await extractEventsFromPageImages({
        html,
        pageUrl: input.url,
      });
      if (vision.events.length > 0) {
        const events = applyPageKindHints(vision.events, input.scrapePageKind);
        return {
          ...base,
          events,
          path: 'page-images',
          skippedGemini,
          message: vision.message,
        };
      }
    } catch (err) {
      console.warn(
        '[scrape-venue-page] page-images failed:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  // --- Reenio fallback when Gemini empty / no usable text ---
  const embed = detectBookingEmbed(html);
  if (embed?.provider === 'reenio') {
    const subject = await resolveReenioSubject({
      bookingSubject: input.bookingSubject,
      html,
    });
    if (subject) {
      const events = await runReenio({
        subject,
        hostUrl: input.url,
        venueName: input.venueName,
        daysAhead: input.daysAhead,
      });
      if (events.length > 0 || geminiBlocked) {
        return {
          ...base,
          events,
          path: 'reenio-fallback',
          skippedGemini,
          reenioSubject: subject,
          message: geminiBlocked
            ? 'Gemini skipped — Reenio fallback'
            : 'Gemini returned 0 — Reenio fallback',
        };
      }
    }
  }

  return {
    ...base,
    events: [],
    path: 'empty',
    skippedGemini,
    message: geminiBlocked
      ? text.length < 40
        ? `Insufficient text (${text.length} chars)`
        : 'No event keywords on page'
      : 'No events extracted',
  };
}
