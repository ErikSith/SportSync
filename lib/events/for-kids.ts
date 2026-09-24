/**
 * Detect activities that are explicitly for children — used both at scrape
 * (persist `events.for_kids`) and in the "Pre deti" feed filter.
 *
 * Conservative: mothers want kidstown / pre deti / mini / U6–U12, not
 * junior/ITF tournaments for 16–18.
 */

export interface KidsAudienceInput {
  title?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  venueName?: string | null;
  sourceName?: string | null;
  locationName?: string | null;
  /** Already persisted / adapter-set flag. */
  forKids?: boolean | null;
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Adult-only title markers shared with for-kids / for-women classifiers. */
export function titleLooksAdultOnly(title: string | null | undefined): boolean {
  return /\bdospeli\b|\bdospelych\b|\badults?\b|\b18\s*\+|pre dosp/.test(fold(title ?? ''));
}

function haystack(input: KidsAudienceInput): string {
  return fold(
    [
      input.title,
      input.description,
      input.sourceUrl,
      input.venueName,
      input.sourceName,
      input.locationName,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

/** Kidstown, detské plávanie, STZ tenis-deti, kids club URLs. */
const KIDS_SOURCE =
  /kidstown|detskeplavanie|detske-plavanie|\/tenis-deti\/|kids?-?club|detsky-klub|detskyklub/;

/**
 * Phrases that mean "this listing is for children" — not generic "family"
 * and not teen/junior competition.
 */
const EXPLICIT_KIDS =
  /pre deti|pre dieta|pre deticky|pre najmensich|pre predskol|pre skolkar|detsk[eaoy]|deti od\s*\d|deti\s+\d+\s*[-–]\s*\d+|skola korcul|letna skola|kidstown|\bkids\b|zumba\s*kids?|kids?\s*(yoga|joga|zumba|fitness|camp|club|tenis|padel|plavanie|swim)|joga pre deti|fitness\s*&\s*fun|babatk|dojcat|baby\s*(swim|yoga|gym|club)|plavanie pre (deti|babatk|dojcat)|detske plavanie|rodic.{0,16}dieta|mama a dieta|otec a dieta|parent\s*(&|and)\s*child|mini[\s-]*(tenis|padel|futbal|hockey|hokej)|minitenis|\bu\s*-?\s*(6|7|8|9|10|11|12)\b|do\s*(6|7|8|9|10|11|12)\s*rokov|\b\d{1,2}\s*\+|od\s*\d{1,2}(\s*[-–]\s*\d{1,2})?\s*rokov|predskol|skolka|detsky tabor|detska atletika|detsky tenis|detske ihrisko|ihrisko pre deti|pre malych aj velkych|rodiny s detmi|boxeracik|vek:\s*deti|movement\s*(kids|mini)/;

/** Explicit adult-only markers — override kids flag from Gemini / copy noise. */
const EXPLICIT_ADULT =
  /\bdospeli\b|\bdospelych\b|\badults?\b|\b18\s*\+|pre dosp|nezadan|singles?\s*party|\bsingles\b|sportovy\s+vecer|vecer\s+pre\s+nezadan/;

export function detectExplicitKidsAudience(input: KidsAudienceInput): boolean {
  const title = fold(input.title ?? '');
  if (titleLooksAdultOnly(input.title)) return false;
  // Adult social / singles nights — never "Pre deti" even if scrape forced for_kids.
  if (
    /\bnezadan\b|\bsingles?\b|sportovy\s+vecer|vecer\s+pre|party\b/.test(title) &&
    !/\bdeti\b|\bkids\b|pre deti|detsk/.test(title)
  ) {
    return false;
  }

  if (input.forKids) {
    // Gemini sometimes marks mixed schedules as kids — trust title adult markers first.
    return true;
  }
  const hay = haystack(input);
  if (!hay) return false;
  if (
    EXPLICIT_ADULT.test(hay) &&
    !/\bdeti\b|\bkids\b|pre deti|\b\d{1,2}\s*\+|movement\s*mini/.test(title)
  ) {
    return false;
  }
  if (KIDS_SOURCE.test(hay)) return true;
  // "Deti a mládež…", "Gi Deti", "… pre deti"
  if (/\bdeti\b/.test(title)) return true;
  return EXPLICIT_KIDS.test(hay);
}

export function tagScrapedEventKids<T extends KidsAudienceInput>(event: T): T & { forKids: boolean } {
  return {
    ...event,
    forKids: detectExplicitKidsAudience(event),
  };
}
