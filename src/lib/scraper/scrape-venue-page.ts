/**
 * Shared venue-page scrape: Gemini default, Reenio force or empty-page fallback.
 */
import {
  fetchHtml,
  htmlToCleanTextDetailed,
  pageHasEventSignal,
} from './fetcher';
import { extractEventsFromText } from './extractor';
import type { ScrapedEvent } from './types';
import { detectBookingEmbed } from './booking/detect-embed';
import {
  DEFAULT_DAYS_AHEAD,
  resolveReenioSubject,
  scrapeReenioTerms,
} from './booking/reenio';

export type ScrapeVenuePageInput = {
  url: string;
  contentSelector?: string | null;
  bookingProvider?: string | null;
  bookingSubject?: string | null;
  /** Venue display name for Reenio locationName. */
  venueName?: string | null;
  daysAhead?: number;
};

export type ScrapeVenuePageResult = {
  events: ScrapedEvent[];
  html: string;
  text: string;
  usedSelector: string | null;
  preferredMatched: boolean;
  /** How events were produced. */
  path: 'gemini' | 'reenio-forced' | 'reenio-fallback' | 'empty';
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

/**
 * Fetch host URL and extract events (Gemini and/or Reenio).
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

  if (!text || text.length < 40) {
    geminiBlocked = true;
    skippedGemini = true;
  } else if (!pageHasEventSignal(text)) {
    geminiBlocked = true;
    skippedGemini = true;
  } else {
    geminiEvents = await extractEventsFromText(input.url, text, {
      listingHtml: html,
    });
  }

  if (geminiEvents.length > 0) {
    return {
      ...base,
      events: geminiEvents,
      path: 'gemini',
      skippedGemini: false,
    };
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
