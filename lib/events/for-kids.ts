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
  /pre deti|pre dieta|pre deticky|pre najmensich|pre predskol|pre skolkar|detsk[eaoy]|deti od\s*\d|deti\s+\d+\s*[-–]\s*\d+|skola korcul|letna skola|kidstown|\bkids\b|zumba\s*kids?|kids?\s*(yoga|joga|zumba|fitness|camp|club|tenis|padel|plavanie|swim)|joga pre deti|fitness\s*&\s*fun|babatk|dojcat|baby\s*(swim|yoga|gym|club)|plavanie pre (deti|babatk|dojcat)|detske plavanie|rodic.{0,16}dieta|mama a dieta|otec a dieta|parent\s*(&|and)\s*child|mini[\s-]*(tenis|padel|futbal|hockey|hokej)|minitenis|u\s*-?\s*(6|7|8|9|10|11|12)\b|do\s*(6|7|8|9|10|11|12)\s*rokov|predskol|skolka|detsky tabor|detska atletika|detsky tenis|detske ihrisko|ihrisko pre deti|pre malych aj velkych|rodiny s detmi/;

export function detectExplicitKidsAudience(input: KidsAudienceInput): boolean {
  if (input.forKids) return true;
  const hay = haystack(input);
  if (!hay) return false;
  if (KIDS_SOURCE.test(hay)) return true;
  const title = fold(input.title ?? '');
  if (/^deti\b/.test(title)) return true;
  return EXPLICIT_KIDS.test(hay);
}

export function tagScrapedEventKids<T extends KidsAudienceInput>(event: T): T & { forKids: boolean } {
  return {
    ...event,
    forKids: detectExplicitKidsAudience(event),
  };
}
