/**
 * Match-result / press-release headlines are not bookable SportSync listings.
 * Join (prihlásiť sa) or Watch (sledovať) only — never “Pohánková postúpila…”.
 */

/** Past result / progress write-ups (STZ, club news). */
const NEWS_OR_RESULT_TITLE =
  /\b(post[uú]pil[ao]?|vypadl[ao]?|prehral[ao]?|vyhral[ao]?|pod[ľl]ah|finalist|v[ií][tť]azk?(ou|mi|om)|z[ií]skal[ao]?\s+(titul|striebro|zlato|bronz)|prebojoval|hladko\s+[ďd]alej|tesne\s+u[šs]lo|u[žz]\s+bez\s+slov[aá]kov|eur[oó]pskymi?\s+jednotkami|do\s+(osmi[čc]ky|[šs]tvr[tť]fin[aá]le|semifin[aá]le|fin[aá]le)|zabojuje\s+o|v\s+singapure|aktualit(y|a)?\s*\/?\s*news)\b/i;

/** Hub / chrome titles scraped from listing cards. */
const NEWS_LISTING_NOISE_TITLE =
  /^(aktuality(\s*\/?\s*news)?|news|novinky|[čc][ií]ta[ťt]\s+viac|read\s+more|viac\s+info|viac)$/i;

/**
 * Future event announced inside a news blurb — keep when registration / tickets
 * are explicit (same idea as the STZ HTML adapter).
 */
const UPCOMING_EVENT_HINT =
  /uskuto[cč]n[ií]|kon[aá]\s|term[ií]ne|t[yý][zž]dni\s+od|uz[aá]vierka\s+prihl|prihl[aá]sen[eé]|nominovan[eé]|vstupenk|predpredaj|ticketportal|otvoren[aá]\s+registr|prihl[aá]ste\s+sa|open\s+entry/i;

export function looksLikeNewsListingNoiseTitle(title: string): boolean {
  const t = title.replace(/\s+/g, ' ').trim();
  if (!t) return true;
  return NEWS_LISTING_NOISE_TITLE.test(t);
}

/**
 * True when the title (and optional body) is a results/news headline without
 * an actionable upcoming event.
 */
export function looksLikeNewsOrResultTitle(
  title: string,
  body?: string | null,
): boolean {
  const t = title.replace(/\s+/g, ' ').trim();
  if (!t) return true;
  if (looksLikeNewsListingNoiseTitle(t)) return true;
  if (!NEWS_OR_RESULT_TITLE.test(t)) return false;
  const combined = `${t} ${body ?? ''}`.trim();
  if (UPCOMING_EVENT_HINT.test(combined)) return false;
  return true;
}

/** Source URL is a federation / club news article, not a schedule or cup page. */
export function sourceUrlLooksLikeNewsArticle(url: string | null | undefined): boolean {
  const value = (url ?? '').toLowerCase();
  if (!value) return false;
  return /\/(?:aktualit|novink|news)(?:y|a|s)?(?:\/|$|\?)/i.test(value);
}
