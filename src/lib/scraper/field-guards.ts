/**
 * Deterministic anti-hallucination guards for Gemini-extracted fields.
 * Prompt rules alone are soft; this layer cleans or drops junk before upsert.
 *
 * SportSync write targets (see db-service):
 * - title            → events.title / tournaments.name (feed card)
 * - sportType        → sport + sport_type (icon / filter)
 * - category         → Event vs Tournament vs programKind routing
 * - startTime/endTime/timeKnown → starts_at, start_time, end_time
 * - locationName     → venue_id resolve only (NOT shown raw on cards)
 * - city             → must resolve to Bratislava or event is skipped upstream
 * - priceText        → price_cents / entry_fee
 * - description      → events.description (truncated + aggregator notice)
 * - isForKids/Women  → for_kids / for_women badges
 * - ageCategory      → prepended into description (“Vek: …”)
 * - originalUrl      → source_url / ticket_url
 */

import type { ScrapedEvent } from './types';
import { looksLikeNewsOrResultTitle } from '@/lib/scrape/news-result';
import { looksLikeNavOrSectionTitle } from '@/lib/feed/group-class';

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Transport / parking / “how to get there” — must never become locationName. */
const LOCATION_JUNK =
  /\b(doprav\w*|parkovan\w*|parkovisk\w*|p\s*\+\s*r|mhd|autobus\w*|elektrick\w*|trolej\w*|vlak\w*|zastavk\w*|ako\s+sa\s+dost\w*|navigac\w*|gps|waze|google\s*maps|minut[ayu]?\s+(od|do)|min\.?\s+(od|do)|vzdialenos\w*|dojazd\w*|pristupov\w*|bezbarier\w*)\b/i;

/** Venue / street-like tokens — keep if present alongside junk. */
const VENUE_OR_ADDRESS =
  /\b(arena|aréna|hala|hale|kurt|ihrisko|stadion|štadión|centrum|club|klub|academy|akademi\w*|studio|štúdio|fitnes|gym|sport|šport|tenis|padel|bazen|bazén|ntc|tower|park)\b|\d{1,4}\s*\/?\s*[a-z]?\b|[A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ][a-záäčďéíľĺňóôŕšťúýž]+ova\b/i;

/** Opening hours / rental / contact masquerading as events. */
const TITLE_NOISE =
  /^(cenn[ií]k|pren[aá]jom|otv[aá]racie\s+hodiny|opening\s+hours|kontakt|contact|o\s+n[aá]s|gdpr|cookies?|newsletter|prihl[aá]ste\s+sa\s+na\s+odber|sledujte\s+n[aá]s|vitajte|welcome)\b/i;

const TITLE_JOB_OR_OPS =
  /\b(brigada|brigáda|hlad[aá]me\s+tr[eé]ner|pracovn[aá]\s+ponuka|stavanie\s+haly|uzavierka\s+arealu|uzávierka\s+areálu)\b/i;

/** Marketing fluff / legal / logistics — strip from description. */
const DESCRIPTION_JUNK_LINE =
  /\b(doprav\w*|parkovan\w*|cookies?|gdpr|newsletter|sledujte\s+n[aá]s|instagram|facebook|tiktok|objednajte\s+si\s+kurt|otv[aá]racie\s+hodiny|ako\s+sa\s+dost\w*)\b/i;

const SOCIAL_OR_MAIL = /^(mailto:|tel:|javascript:)/i;
const GENERIC_SPORT =
  /^(sport|šport|other|iné|ine|nezaradene|nezaradené|aktivita|event|podujatie)$/i;

export type FieldGuardRejectionReason =
  | 'title_noise'
  | 'title_news'
  | 'title_too_long'
  | 'location_junk'
  | 'bad_url'
  | 'no_usable_fields';

export interface FieldGuardResult {
  event: ScrapedEvent | null;
  /** Why the whole event was dropped (null = kept, possibly cleaned). */
  rejected: FieldGuardRejectionReason | null;
  /** Fields that were cleared or rewritten. */
  cleaned: string[];
}

function splitVenueCandidate(raw: string): string | null {
  const parts = raw
    .split(/\s*[|•·]\s*|\s+[–—]\s+|\s+-\s+(?=[A-ZÁÄČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ])/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (LOCATION_JUNK.test(part) && !VENUE_OR_ADDRESS.test(part)) continue;
    if (LOCATION_JUNK.test(part)) {
      // “NTC Aréna – parkovanie zadarmo” → keep left of junk clause
      const cut = part.search(LOCATION_JUNK);
      const before = cut > 0 ? part.slice(0, cut).replace(/[,;:\s–—-]+$/g, '').trim() : '';
      if (before && before.length >= 3 && VENUE_OR_ADDRESS.test(before)) {
        return before;
      }
      continue;
    }
    if (part.length >= 3 && part.length <= 120) return part;
  }

  // No delimiter — try cutting junk from the end of a single string
  const cut = raw.search(LOCATION_JUNK);
  if (cut > 3) {
    const before = raw.slice(0, cut).replace(/[,;:\s–—-]+$/g, '').trim();
    if (before.length >= 3 && VENUE_OR_ADDRESS.test(before)) return before;
  }
  return null;
}

/** Clean locationName for venue matching. Returns null if unusable. */
export function sanitizeLocationName(raw: string | null | undefined): string | null {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!value || value.length < 2) return null;
  if (value.length > 160) return null;

  if (LOCATION_JUNK.test(value)) {
    const candidate = splitVenueCandidate(value);
    if (!candidate) return null;
    if (LOCATION_JUNK.test(candidate) && !VENUE_OR_ADDRESS.test(candidate)) {
      return null;
    }
    return candidate.slice(0, 120);
  }

  // Phone / email accidentally in location
  if (/@|\+?\d{3,}[\s-]?\d{3}/.test(value) && !VENUE_OR_ADDRESS.test(value)) {
    return null;
  }

  return value.slice(0, 120);
}

/** Keep only a short price token for price_cents parsing. */
export function sanitizePriceText(raw: string | null | undefined): string | null {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!value) return null;

  if (/^(zadarmo|free|0\s*€?)$/i.test(value)) return 'Zadarmo';
  if (/zadarmo|free/i.test(value) && value.length <= 40) return 'Zadarmo';

  // Reject membership / hourly court-hire blurbs without a single clear fee
  if (
    /\b(mesacne|mesačne|clenstvo|členstvo|\/\s*hod|za\s+hodinu|prenajom|prenájom)\b/i.test(
      value,
    ) &&
    !/\b(startovne|štartovné|vstupne|vstupné|entry)\b/i.test(value)
  ) {
    const fee = value.match(/(\d+(?:[,.]\d{1,2})?\s*€)/);
    // “15 €/hod” court hire → drop (not an event ticket)
    if (/\/\s*hod|za\s+hodinu/i.test(value)) return null;
    if (!fee || value.length > 50) return null;
  }

  const euro = value.match(/(\d+(?:[,.]\d{1,2})?\s*€)/);
  if (euro) {
    // Long payment-terms paragraphs → keep only the euro token
    if (value.length > 48) return euro[1]!.replace(/\s+/g, ' ');
    return value.length <= 48 ? value : euro[1]!;
  }

  if (value.length > 48) return null;
  return value;
}

/** Short player-facing facts only; logistics / marketing → null. */
export function sanitizeDescription(raw: string | null | undefined): string | null {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!value) return null;
  if (value.length < 8) return null;

  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !DESCRIPTION_JUNK_LINE.test(s));

  if (sentences.length === 0) return null;

  const kept = sentences.slice(0, 2).join(' ').trim();
  if (kept.length < 8) return null;
  // Pure CTA / marketing
  if (
    /^(prid[aá]jte\s+sa|nenechajte\s+si|te[sš][ií]me\s+sa|sledujte|objavte|najlep[sš][ií])/i.test(
      kept,
    )
  ) {
    return null;
  }
  return kept.slice(0, 280);
}

export function sanitizeTitle(raw: string): string | null {
  let title = raw.replace(/\s+/g, ' ').trim();
  if (!title || title.length < 3) return null;

  // Drop trailing logistics clauses Gemini sometimes appends
  title = title
    .replace(/\s*[|–—-]\s*(doprav[ay]|parkovan|mhd).*$/i, '')
    .replace(/\s*\((doprav[ay]|parkovan|mhd)[^)]*\)\s*$/i, '')
    .trim();

  if (TITLE_NOISE.test(title) || TITLE_JOB_OR_OPS.test(title)) return null;
  if (looksLikeNavOrSectionTitle(title)) return null;
  // Full sentences as titles (“Príďte si zahrať padel u nás v sobotu…”)
  if (title.length > 120) return null;
  if (title.length > 80 && /[.!?]$/.test(title)) return null;
  if ((title.match(/\s/g) ?? []).length > 14) return null;

  return title.slice(0, 120);
}

export function sanitizeSportType(raw: string | null | undefined): string | null {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!value || value.length > 40) return null;
  if (GENERIC_SPORT.test(fold(value))) return null;
  if (LOCATION_JUNK.test(value) || /@|https?:/i.test(value)) return null;
  // Capitalize lightly for display consistency
  return value.slice(0, 40);
}

export function sanitizeAgeCategory(raw: string | null | undefined): string | null {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!value) return null;
  if (value.length > 40) return null;
  if (/^(vsetci|všetci|all|open|bez\s+obmedzenia|pre\s+vsetkych|pre\s+všetkých)$/i.test(value)) {
    return null;
  }
  // Must look like an age band / U-category
  if (
    !/\b(u\s*\d{1,2}|\d{1,2}\s*[-–—]\s*\d{1,2}|rokov|roky|junior|mini|dospeli|dospelí|senior)\b/i.test(
      value,
    )
  ) {
    return null;
  }
  return value.slice(0, 40);
}

export function sanitizeCity(raw: string | null | undefined): string | null {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!value) return null;
  if (LOCATION_JUNK.test(value)) return null;
  if (/slovensko|slovakia|eu\b/i.test(value)) return null;
  // Street mistaken for city
  if (/\d/.test(value) || /ova\s+\d/i.test(value)) return null;
  return value.slice(0, 60);
}

function isAcceptableUrl(url: string): boolean {
  const t = url.trim();
  if (!t || SOCIAL_OR_MAIL.test(t)) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    // Obvious non-event destinations
    if (/facebook\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com/i.test(u.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean one scraped event. Returns rejected=null and cleaned fields when kept.
 * Dropping locationName is OK — venue is resolved from listing URL later.
 */
export function guardScrapedEventFields(event: ScrapedEvent): FieldGuardResult {
  const cleaned: string[] = [];

  const title = sanitizeTitle(event.title);
  if (!title) {
    return { event: null, rejected: 'title_noise', cleaned };
  }
  if (looksLikeNewsOrResultTitle(title, event.description)) {
    return { event: null, rejected: 'title_news', cleaned };
  }
  if (title !== event.title.trim()) cleaned.push('title');

  const locationName = sanitizeLocationName(event.locationName);
  if (event.locationName.trim() && !locationName) {
    cleaned.push('locationName');
  }
  // If location was pure junk with no venue fallback, still keep event —
  // db-service resolves venue from scrape URL. Use empty string as last resort.
  if (!locationName && LOCATION_JUNK.test(event.locationName)) {
    // already tracked
  }

  const priceText = sanitizePriceText(event.priceText);
  if ((event.priceText ?? '') !== (priceText ?? '')) cleaned.push('priceText');

  const description = sanitizeDescription(event.description);
  if ((event.description ?? '') !== (description ?? '')) cleaned.push('description');

  const sportType = sanitizeSportType(event.sportType) ?? event.sportType.trim().slice(0, 40);
  if (sportType !== event.sportType.trim()) cleaned.push('sportType');

  const ageCategory = sanitizeAgeCategory(event.ageCategory);
  if ((event.ageCategory ?? '') !== (ageCategory ?? '')) cleaned.push('ageCategory');

  const city = sanitizeCity(event.city);
  if ((event.city ?? '') !== (city ?? '')) cleaned.push('city');

  const detailUrl = event.detailUrl?.trim() || undefined;
  const originalUrl = event.originalUrl.trim();
  if (!isAcceptableUrl(originalUrl) && !(detailUrl && isAcceptableUrl(detailUrl))) {
    return { event: null, rejected: 'bad_url', cleaned };
  }

  const next: ScrapedEvent = {
    ...event,
    title,
    sportType,
    locationName: locationName ?? '',
    priceText,
    description,
    ageCategory,
    city,
    endTime: event.endTime?.trim() || null,
  };

  if (!next.title || next.title.length < 3) {
    return { event: null, rejected: 'no_usable_fields', cleaned };
  }

  return { event: next, rejected: null, cleaned };
}

/** Map + filter a batch; logs skips for scrape diagnostics. */
export function applyFieldGuards(
  events: ScrapedEvent[],
  pageUrl?: string,
): ScrapedEvent[] {
  const out: ScrapedEvent[] = [];
  for (const event of events) {
    const { event: next, rejected, cleaned } = guardScrapedEventFields(event);
    if (rejected || !next) {
      console.log(
        `[scraper.guards] skip (${rejected ?? 'unknown'}): ${event.title}` +
          (pageUrl ? ` @ ${pageUrl}` : ''),
      );
      continue;
    }
    if (cleaned.length > 0) {
      console.log(
        `[scraper.guards] cleaned [${cleaned.join(', ')}]: ${next.title}`,
      );
    }
    out.push(next);
  }
  return out;
}
