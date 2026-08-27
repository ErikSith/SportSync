import * as cheerio from 'cheerio';
import {
  errResult,
  fetchHtml,
  okResult,
  parseSlovakDate,
  parseTimeOnDate,
  slugify,
} from '@/lib/scrape/fetch';
import type { AdapterResult, NormalizedScrapedEvent } from '@/lib/scrape/types';

/** Bratislava league only — never other cities on topliga.sk. */
const BA_LEAGUE_ID = 3;
const BASE = 'https://www.topliga.sk';

const HOME_URL = `${BASE}/?leagueId=${BA_LEAGUE_ID}`;
const ARTICLES_URL = `${BASE}/article/?leagueId=${BA_LEAGUE_ID}`;
const REGISTRATION_URL = `${BASE}/static-page/?slug=36-registracia-ntl&leagueId=${BA_LEAGUE_ID}`;
const MATCH_URL = `${BASE}/match/?leagueId=${BA_LEAGUE_ID}`;

const REG_HINT =
  /registr[aá]cie?\s+do\s+(novej\s+)?sez[oó]ny|registr[aá]cie?\s+do\s+letn|spusten[eé].*registr[aá]ci/i;
const RESULT_ONLY =
  /pozn[aá]\s+svojich\s+majstrov|v[ií][tť]az|bez\s+zav[aá]hania|po\s+\d+\s+kol|v[yý]sledk|teambulding|mana[zž][eé]r/i;

/**
 * Niké TOP Liga Bratislava (malý futbal) — www.topliga.sk?leagueId=3.
 * - Open season registration → tournament / participate
 * - Upcoming fixtures (no final score) → match / spectator (Sledovať)
 */
export async function scrapeTopligaBa(): Promise<AdapterResult> {
  try {
    // Sequential fetches — host delay is enforced inside fetchHtml (no burst).
    const homeHtml = await fetchHtml(HOME_URL);
    const articlesHtml = await fetchHtml(ARTICLES_URL);
    const matchHtml = await fetchHtml(MATCH_URL);
    const regHtml = await fetchHtml(REGISTRATION_URL);

    const competitionIds = discoverCompetitionIds(homeHtml);
    const defaultComp = Number(
      matchHtml.match(/competitionId=(\d+)/)?.[1] ?? 0,
    );
    const matchPages: string[] = [matchHtml];
    for (const id of competitionIds) {
      if (id === defaultComp) continue;
      try {
        matchPages.push(
          await fetchHtml(`${BASE}/match/?leagueId=${BA_LEAGUE_ID}&competitionId=${id}`),
        );
      } catch (err) {
        console.warn(
          `[scrape.topliga-ba] skip competition ${id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    const fromArticles = [
      ...parseRegistrationArticles(homeHtml),
      ...parseRegistrationArticles(articlesHtml),
    ];
    const registration =
      fromArticles.length > 0
        ? fromArticles
        : parseRegistrationFallback(regHtml, articlesHtml, homeHtml);

    const events = dedupeByExternalId([
      ...registration,
      ...matchPages.flatMap((html) => parseMatchTable(html)),
    ]);

    return okResult('topliga-ba', events.slice(0, 40));
  } catch (error) {
    return errResult('topliga-ba', error);
  }
}

function discoverCompetitionIds(html: string): number[] {
  const ids = new Set<number>();
  const $ = cheerio.load(html);
  $('a[href*="competitionId="], option[value]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const value = $(el).attr('value') ?? '';
    const label = $(el).text().replace(/\s+/g, ' ').trim();
    // Skip other-city league switches (values like 50 for Business League stay in BA menu)
    if (/Trnava|Piešťany|Nitra|Humenné|Prešov|Banská|Šurany|\(TRN\)|\(PIE\)|\(NIT\)/i.test(label)) {
      return;
    }
    for (const raw of [href, value]) {
      const m = raw.match(/competitionId=(\d+)/i) || raw.match(/^(\d+)$/);
      if (m?.[1]) ids.add(Number(m[1]));
    }
  });
  // Default Summer League IDs if menu parse fails
  if (ids.size === 0) {
    ids.add(624);
    ids.add(625);
  }
  return [...ids].slice(0, 6);
}

function parseRegistrationArticles(html: string): NormalizedScrapedEvent[] {
  const $ = cheerio.load(html);
  const out: NormalizedScrapedEvent[] = [];
  const seen = new Set<string>();

  $('a[href*="article/default/detail"]').each((_, a) => {
    const $a = $(a);
    const title = $a.text().replace(/\s+/g, ' ').trim();
    const href = $a.attr('href') ?? '';
    if (!title || title.length < 8 || !href) return;
    if (!REG_HINT.test(title) && !/registracie-do-(novej-sezony|letnej)/i.test(href)) return;
    if (RESULT_ONLY.test(title)) return;
    // Bratislava scope — skip other-city wording
    if (/Trnava|Piešťany|Humenné|Prešov|Nitra|Šurany|Banská\s+Bystrica/i.test(title)) return;

    const card = $a.closest('article, .article, .row, .col, li, div');
    const context = `${title} ${card.text().replace(/\s+/g, ' ').trim()}`.slice(0, 2000);
    if (!/Bratislav|BRA\b|Niké\s+TOP\s+[Ll]ig/i.test(context) && !/leagueId=3/.test(href)) return;

    const startsAt = extractSeasonStart(context, title);
    if (!startsAt) return;

    const absolute = absoluteUrl(href);
    const seasonKey = seasonExternalId(title, context);
    const externalId =
      seasonKey ?? slugify(`topliga-ba-reg-${absolute.replace(/^https?:\/\//, '')}`);
    if (seen.has(externalId)) return;
    seen.add(externalId);

    const priceCents = extractEntryFeeCents(context) ?? 54_900;
    const desc = buildRegistrationDescription(title, context, priceCents);
    const displayTitle = seasonKey
      ? `Niké TOP Liga Bratislava — registrácia ${seasonLabel(title, context)}`
      : cleanTitle(title).slice(0, 120);

    out.push({
      source: 'topliga-ba',
      externalId,
      title: displayTitle.slice(0, 120),
      sport: 'FOOTBALL',
      sportType: 'FOOTBALL',
      category: 'tournament',
      participationMode: 'participate',
      startsAt,
      city: 'Bratislava',
      venueKey: 'topliga-ba',
      locationName: 'Mladá Garda / Pasienky',
      description: desc,
      coverUrl: null,
      sourceUrl: absolute,
      ticketUrl: absoluteUrl(REGISTRATION_URL),
      priceCents,
      capacity: 120,
    });
  });

  return out;
}

function seasonExternalId(title: string, context: string): string | null {
  const hay = `${title} ${context}`;
  const m = hay.match(/jese[nň]\s*(20\d{2})/i);
  if (m?.[1]) return `topliga-ba-reg-jesen-${m[1]}`;
  const summer = hay.match(/letn[aá].*?(20\d{2})|summer.*? (20\d{2})/i);
  if (summer?.[1] || summer?.[2]) return `topliga-ba-reg-leto-${summer[1] || summer[2]}`;
  return null;
}

function seasonLabel(title: string, context: string): string {
  const hay = `${title} ${context}`;
  const m = hay.match(/jese[nň]\s*(20\d{2})/i);
  if (m?.[1]) return `Jeseň ${m[1]}`;
  const summer = hay.match(/letn[aá].*?(20\d{2})/i);
  if (summer?.[1]) return `Leto ${summer[1]}`;
  return 'sezóna';
}

/** If news cards miss open registration, emit one BA season listing from known article. */
function parseRegistrationFallback(
  regHtml: string,
  articlesHtml: string,
  homeHtml: string,
): NormalizedScrapedEvent[] {
  const hay = `${homeHtml} ${articlesHtml} ${regHtml}`;
  if (!/registr[aá]cie?\s+do\s+novej\s+sez[oó]ny\s+Jese[nň]\s+2026/i.test(hay)) return [];

  const articleHref =
    hay.match(
      /href="([^"]*registracie-do-novej-sezony-jesen-2026[^"]*)"/i,
    )?.[1] ??
    `${BASE}/article/default/detail?slug=2368-registracie-do-novej-sezony-jesen-2026-spustene&leagueId=${BA_LEAGUE_ID}`;

  const text = cheerio.load(hay.replace(/<script[\s\S]*?<\/script>/gi, ' ')).text();
  const startsAt = extractSeasonStart(text, 'Jeseň 2026') ?? parseSlovakDate('14.09.2026');
  if (!startsAt) return [];

  const priceCents = extractEntryFeeCents(text) ?? 54_900;
  const absolute = absoluteUrl(articleHref);

  return [
    {
      source: 'topliga-ba',
      externalId: 'topliga-ba-reg-jesen-2026',
      title: 'Niké TOP Liga Bratislava — registrácia Jeseň 2026',
      sport: 'FOOTBALL',
      sportType: 'FOOTBALL',
      category: 'tournament',
      participationMode: 'participate',
      startsAt,
      city: 'Bratislava',
      venueKey: 'topliga-ba',
      locationName: 'Mladá Garda / Pasienky',
      description: buildRegistrationDescription(
        'Registrácie do novej sezóny Jeseň 2026',
        text,
        priceCents,
      ),
      coverUrl: null,
      sourceUrl: absolute,
      ticketUrl: absoluteUrl(REGISTRATION_URL),
      priceCents,
      capacity: 120,
    },
  ];
}

function parseMatchTable(html: string): NormalizedScrapedEvent[] {
  const $ = cheerio.load(html);
  const out: NormalizedScrapedEvent[] = [];
  const seen = new Set<string>();

  $('table tbody tr').each((_, tr) => {
    const $tr = $(tr);
    const cells = $tr.find('td');
    if (cells.length < 5) return;

    const whenText = cells.eq(0).text().replace(/\s+/g, ' ').trim();
    const venueText = cells.eq(1).text().replace(/\s+/g, ' ').trim();
    const home = cells.eq(2).text().replace(/\s+/g, ' ').trim();
    const scoreCell = cells.eq(3);
    const scoreText = scoreCell.text().replace(/\s+/g, ' ').trim();
    const away = cells.eq(4).text().replace(/\s+/g, ' ').trim();

    if (!home || !away || home.length < 2 || away.length < 2) return;
    // Finished fixtures have a numeric score — skip (retention / not joinable)
    if (/\d+\s*:\s*\d+/.test(scoreText)) return;

    const dateMatch = whenText.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
    if (!dateMatch?.[1]) return;
    const base = parseSlovakDate(dateMatch[1]);
    if (!base) return;
    const timeMatch = whenText.match(/\b(\d{1,2}:\d{2})\b/);
    const startsAt = parseTimeOnDate(base, timeMatch?.[1] ?? '19:00');

    const detailHref =
      scoreCell.find('a[href*="/match/default/detail/"]').attr('href') ??
      $tr.find('a[href*="/match/default/detail/"]').first().attr('href') ??
      MATCH_URL;
    const absolute = absoluteUrl(detailHref);
    const title = `${home} vs ${away}`;
    const externalId = slugify(
      `topliga-ba-${absolute.match(/detail\/(\d+)/)?.[1] ?? title}-${startsAt.toISOString().slice(0, 10)}`,
    );
    if (seen.has(externalId)) return;
    seen.add(externalId);

    out.push({
      source: 'topliga-ba',
      externalId,
      title: title.slice(0, 120),
      sport: 'FOOTBALL',
      sportType: 'FOOTBALL',
      category: 'match',
      participationMode: 'spectator',
      startsAt,
      city: 'Bratislava',
      venueKey: 'topliga-ba',
      locationName: venueText || 'Bratislava',
      description: `Niké TOP Liga Bratislava — ${title}. Ihrisko: ${venueText || 'Bratislava'}. Sledovať zápas / oficiálny rozpis na topliga.sk.`,
      coverUrl: null,
      sourceUrl: absolute,
      ticketUrl: absolute,
    });
  });

  return out;
}

function extractSeasonStart(text: string, title: string): Date | null {
  const yearMatch = `${title} ${text}`.match(/20(2[6-9]|3[0-5])/);
  const year = yearMatch ? Number(`20${yearMatch[1]}`) : new Date().getFullYear();

  const named = text.match(/(\d{1,2})\.\s*(septembra|september|okt[oó]bra|oktober|novembra|november)/i);
  if (named?.[1] && named[2]) {
    const parsed = parseSlovakDate(`${named[1]}. ${named[2]} ${year}`, year);
    if (parsed) return parseTimeOnDate(parsed, '18:00');
  }

  const numeric = text.match(/(\d{1,2}\.\d{1,2}\.20\d{2})/);
  if (numeric?.[1]) {
    const parsed = parseSlovakDate(numeric[1]);
    if (parsed && parsed.getTime() > Date.now() - 7 * 86400000) {
      return parseTimeOnDate(parsed, '18:00');
    }
  }

  // Title like "Jeseň 2026" without explicit day — mid-September kickoff convention
  if (/jese[nň]\s*2026/i.test(`${title} ${text}`)) {
    return parseTimeOnDate(parseSlovakDate('14.09.2026')!, '18:00');
  }
  if (/jese[nň]\s*2027/i.test(`${title} ${text}`)) {
    return parseTimeOnDate(parseSlovakDate('14.09.2027')!, '18:00');
  }

  return null;
}

function extractEntryFeeCents(text: string): number | undefined {
  // Prefer explicit štartovné lines; ignore prize-money “1 500 EUR”.
  const startovne = [
    ...text.matchAll(/[ŠS]tartovn[eé][^.]{0,80}?(\d{3})\s*EUR/gi),
  ].map((m) => Number(m[1]));
  if (startovne.length > 0) {
    // Current tier is usually the higher remaining deadline price
    return Math.max(...startovne) * 100;
  }
  const late = text.match(/(\d{3})\s*EUR[^.]{0,40}31\.?\s*8/i);
  if (late?.[1]) return Number(late[1]) * 100;
  return undefined;
}

function buildRegistrationDescription(title: string, context: string, priceCents: number): string {
  const fee = `${Math.round(priceCents / 100)} €`;
  const bits = [
    'Niké TOP Liga Bratislava — amatérska liga v malom futbale.',
    'Otvorená registrácia tímov aj jednotlivcov (Pripojiť sa).',
    `Štartovné cca ${fee}.`,
    'Ihriská: Pasienky a Mladá Garda.',
  ];
  if (/nad\s*35|\+35/i.test(context)) bits.push('Aj kategória +35.');
  return `${title}. ${bits.join(' ')}`.slice(0, 400);
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\|.*$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(href: string): string {
  if (href.startsWith('http')) return href.replace(/&amp;/g, '&');
  const path = href.replace(/&amp;/g, '&');
  return path.startsWith('/') ? `${BASE}${path}` : `${BASE}/${path}`;
}

function dedupeByExternalId(events: NormalizedScrapedEvent[]): NormalizedScrapedEvent[] {
  const seen = new Set<string>();
  const out: NormalizedScrapedEvent[] = [];
  for (const e of events) {
    if (seen.has(e.externalId)) continue;
    seen.add(e.externalId);
    out.push(e);
  }
  return out;
}
