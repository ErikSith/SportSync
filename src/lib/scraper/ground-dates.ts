import { applyDateOnlyTimeUnknown } from './date-only-time';
import { applyMultiDayDateRanges } from './multi-day-range';
import type { ScrapedEvent } from './types';

/**
 * Canonical post-extract date grounding for the Gemini scraper pipeline.
 * 1) date-only rows → timeKnown=false + noon anchors (keep multi-day ends)
 * 2) page text ranges ("5 novembra - 9 novembra") → fill missing endTime
 *
 * Always run this before DB upsert so festival ranges cannot be dropped again.
 */
export function groundScrapedEventDates(
  cleanText: string,
  events: ScrapedEvent[],
): ScrapedEvent[] {
  return applyMultiDayDateRanges(cleanText, applyDateOnlyTimeUnknown(cleanText, events));
}
