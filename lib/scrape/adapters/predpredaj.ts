import * as cheerio from 'cheerio';
import {
  errResult,
  fetchHtml,
  okResult,
  parseSlovakDate,
  parseTimeOnDate,
  slugify,
} from '@/lib/scrape/fetch';
import type { AdapterResult, NormalizedScrapedEvent, ParticipationMode } from '@/lib/scrape/types';
import type { SportTypeKey } from '@/lib/ai/theme-config';

const SPORT_URL = 'https://predpredaj.zoznam.sk/sk/kategoria/sport/';
const BASE = 'https://predpredaj.zoznam.sk';

/**
 * Ticket / registration listings from Predpredaj sport category.
 * Spectator: vstupenky, zápasy, permanentky, Davis Cup, fight nights.
 * Participate: registration flows (/sk/registracie/…) e.g. charity runs.
 * Source: https://predpredaj.zoznam.sk/sk/kategoria/sport/
 */
export async function scrapePredpredaj(): Promise<AdapterResult> {
  try {
    const html = await fetchHtml(SPORT_URL);
    const $ = cheerio.load(html);
    const events: NormalizedScrapedEvent[] = [];
    const seen = new Set<string>();

    $('article.box').each((_, el) => {
      const $el = $(el);
      const title =
        $el.find('.box-item-title').first().text().replace(/\s+/g, ' ').trim() ||
        $el.find('img').first().attr('alt')?.trim() ||
        '';
      if (!title || title.length < 3) return;
      if (/dar[cč]ekov[yý]\s+poukaz/i.test(title)) return;
      if (/autoshow|kustom\s*city/i.test(title)) return;

      const href =
        $el.find('a.box-item-btn, a[href*="/listky/"], a[href*="/registracie/"], a[href*="/presale/"]').first().attr('href') ??
        '';
      if (!href) return;

      const dateText = $el.find('.box-item-date').first().text().replace(/\s+/g, ' ').trim();
      const locationText = $el
        .find('.box-item-lacation, .box-item-location')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim();

      const startsAt = resolveStartsAt(dateText, href);
      if (!startsAt) return;

      const absolute = absoluteUrl(href);
      const externalId = slugify(href.replace(/^https?:\/\//, '').replace(/\/+$/, ''));
      if (seen.has(externalId)) return;
      seen.add(externalId);

      const participationMode = classifyParticipation(href, title);
      const { sport, sportType } = detectSport(title, locationText);
      const city = detectCity(locationText);
      const venueKey = venueKeyFor(city, locationText);

      events.push({
        source: 'predpredaj',
        externalId,
        title: title.slice(0, 120),
        sport,
        sportType,
        category: participationMode === 'participate' ? 'fitness' : 'match',
        participationMode,
        startsAt,
        city,
        venueKey,
        description: buildDescription(title, locationText, dateText, participationMode),
        coverUrl: null,
        sourceUrl: absolute,
        ticketUrl: absolute,
      });
    });

    return okResult('predpredaj', events.slice(0, 40));
  } catch (error) {
    return errResult('predpredaj', error);
  }
}

function classifyParticipation(href: string, title: string): ParticipationMode {
  if (/\/registracie\//i.test(href)) return 'participate';
  if (/prihl[aá]ška|registr[aá]cia|beh|run|charit/i.test(title) && !/vstupenk/i.test(title)) {
    return 'participate';
  }
  return 'spectator';
}

function resolveStartsAt(dateText: string, href: string): Date | null {
  const fromText = dateText.match(/(\d{1,2}\.\d{1,2}\.\d{4})(?:\s+(\d{1,2}:\d{2}))?/);
  if (fromText?.[1]) {
    const base = parseSlovakDate(fromText[1]);
    if (base) return parseTimeOnDate(base, fromText[2] ?? '18:00');
  }

  const fromHref = href.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (fromHref) {
    const year = Number(fromHref[1]);
    const month = Number(fromHref[2]);
    const day = Number(fromHref[3]);
    return new Date(Date.UTC(year, month - 1, day, 18, 0, 0));
  }

  // Season passes: pin to next Saturday-ish so they stay "upcoming" for discovery
  if (/sezóna|sez[oó]na|2026\/27|26\/27/i.test(dateText) || /permanentka/i.test(href)) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 14);
    d.setUTCHours(18, 0, 0, 0);
    return d;
  }

  return null;
}

function detectSport(
  title: string,
  location: string,
): { sport: string; sportType: SportTypeKey } {
  const t = `${title} ${location}`;
  if (/davis\s*cup|tenis|ntc/i.test(t)) return { sport: 'TENNIS', sportType: 'TENNIS' };
  if (/hokej|hc\s|zimn[yý]\s+[sš]tadi/i.test(t)) return { sport: 'HOCKEY', sportType: 'OTHER' };
  if (/futbal|fc\s|mfk\s|[sš]tadi[oó]n|dac\s*1904|slovan|inter\s*bratislav|spartak|podbrezov/i.test(t)) {
    return { sport: 'FOOTBALL', sportType: 'FOOTBALL' };
  }
  if (/kr[aá]li\s+ulice|streetball|3x3/i.test(t)) return { sport: 'BASKETBALL', sportType: 'BASKETBALL' };
  if (/fight\s*night|gladi[aá]tor|mma|box/i.test(t)) return { sport: 'COMBAT', sportType: 'OTHER' };
  if (/h[aá]dzan/i.test(t)) return { sport: 'HANDBALL', sportType: 'OTHER' };
  if (/basket/i.test(t)) return { sport: 'BASKETBALL', sportType: 'BASKETBALL' };
  return { sport: 'OTHER', sportType: 'OTHER' };
}

function detectCity(location: string): string {
  if (/petr[zž]alka|odboj[aá]rov|tipos|river\s*park|incheba|sklod|bratislav/i.test(location)) {
    return 'Bratislava';
  }
  if (/ko[sš]ic/i.test(location)) return 'Košice';
  if (/pre[sš]ov/i.test(location)) return 'Prešov';
  if (/trnav/i.test(location)) return 'Trnava';
  if (/ve[ľl]k[yý]\s*krt[ií][sš]/i.test(location)) return 'Veľký Krtíš';
  if (/[žz]ilin/i.test(location)) return 'Žilina';
  if (/nitra/i.test(location)) return 'Nitra';
  if (/tren[cč]/i.test(location)) return 'Trenčín';
  if (/bansk/i.test(location)) return 'Banská Bystrica';
  return 'Bratislava';
}

function venueKeyFor(city: string, location: string): string {
  if (/tipos|odboj[aá]rov|nepel/i.test(location)) return 'tipos-arena';
  if (/ntc\s*ko[sš]ice|popradsk/i.test(location)) return 'ntc-kosice';
  if (/teheln/i.test(location)) return 'tehelne-pole';
  if (/gopass|trnavsk/i.test(location)) return 'gopass-arena';
  if (/ntc|tenisov/i.test(location)) return 'ntc-bratislava';
  // Prefer real Bratislava facilities over ticket-portal placeholders
  if (city === 'Košice') return 'ntc-kosice';
  if (city === 'Bratislava') return 'tehelne-pole';
  return 'tehelne-pole';
}

function buildDescription(
  title: string,
  location: string,
  dateText: string,
  mode: ParticipationMode,
): string {
  const where = location || 'Slovensko';
  const when = dateText || 'termín na Predpredaj.sk';
  if (mode === 'participate') {
    return `${title}. Registrácia / účasť — ${when}. Miesto: ${where}. Zdroj: predpredaj.zoznam.sk`;
  }
  return `${title}. Vstupenky pre divákov — ${when}. Miesto: ${where}. Zdroj: predpredaj.zoznam.sk`;
}

function absoluteUrl(href: string): string {
  try {
    return new URL(href, BASE).toString();
  } catch {
    return href;
  }
}
