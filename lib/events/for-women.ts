/**
 * Detect activities that are exclusively for women — used both at scrape
 * (persist `for_women`) and in the "Pre ženy" feed filter.
 *
 * Conservative: ladies-only / W4W / pre ženy, not mixed "ženy a muži" opens.
 */

export interface WomenAudienceInput {
  title?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  venueName?: string | null;
  sourceName?: string | null;
  locationName?: string | null;
  /** Already persisted / adapter-set flag. */
  forWomen?: boolean | null;
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function haystack(input: WomenAudienceInput): string {
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

/** Mixed / open-to-all copy — never tag as women-only. */
const MIXED_AUDIENCE =
  /muzi\s*(a|aj|,|&|and|\/)\s*zeny|zeny\s*(a|aj|,|&|and|\/)\s*muzi|pre vsetkych|open to (all|everyone)|mix(ed)?\s*(doubles|pary|kategoria|open)|mixovane/;

const WOMEN_SOURCE =
  /ladies-only|women-only|\/pre-zeny|prezeny|w4w|women-for-women/;

const EXPLICIT_WOMEN =
  /pre zeny|len pre zeny|women\s+only|ladies\s+only|women for women|\bw4w\b|damsky|zensky turnaj|zenska kategoria|zenske (open|kolo|liga)|ladies\s*(night|padel|tenis|tennis|yoga|joga|fitness|run|cup|open)|joga pre zeny|yoga for women|female only|girl power|zensky padel|tenis pre zeny|padel pre zeny|fitness pre zeny|beh pre zeny|zeny only|only women|ladies cup|womens?\s+(only|open|cup|night|league|padel|tennis)|zeny 30\+|zeny 40\+/;

export function detectExplicitWomenAudience(input: WomenAudienceInput): boolean {
  if (input.forWomen) return true;
  const hay = haystack(input);
  if (!hay || MIXED_AUDIENCE.test(hay)) return false;
  if (WOMEN_SOURCE.test(hay)) return true;
  const title = fold(input.title ?? '');
  if (!title) return EXPLICIT_WOMEN.test(hay);
  if (MIXED_AUDIENCE.test(title)) return false;
  if (/^(zeny|ladies|women)\b/.test(title)) return true;
  if (/\b(zeny|ladies|women)\b/.test(title)) return true;
  return EXPLICIT_WOMEN.test(hay);
}

export function tagScrapedEventWomen<T extends WomenAudienceInput>(
  event: T,
): T & { forWomen: boolean } {
  return {
    ...event,
    forWomen: detectExplicitWomenAudience(event),
  };
}
