/**
 * Gopass Aréna — follow homepage event cards into /e-… detail pages for
 * verified time, tickets, and spectator participation.
 */
import * as cheerio from 'cheerio';
import { detectEventSport } from '@/lib/constants/sports';
import { resolveSportType } from '@/lib/ai/theme-config';
import {
  applyDetailToNormalized,
  discoverDetailUrls,
  enrichFromDetailPage,
  matchDetailUrl,
} from '@/lib/scrape/detail-enrich';
import {
  errResult,
  fetchHtml,
  MAX_LOOP_ITERATIONS,
  okResult,
  parseSlovakDate,
  slugify,
  truncateHtmlForParse,
} from '@/lib/scrape/fetch';
import type { AdapterResult, NormalizedScrapedEvent } from '@/lib/scrape/types';
import { HOST_DELAY_MS, sleep } from '@/src/lib/scraper/fetcher';

const HOME = 'https://gopassarena.sk/';
const MAX_DETAILS = 12;

function randomDelay(): number {
  return (
    HOST_DELAY_MS.min +
    Math.floor(Math.random() * (HOST_DELAY_MS.max - HOST_DELAY_MS.min + 1))
  );
}

export async function scrapeGopassArena(): Promise<AdapterResult> {
  try {
    const html = await fetchHtml(HOME);
    const $ = cheerio.load(truncateHtmlForParse(html));
    const detailLinks = discoverDetailUrls(html, HOME).filter((l) =>
      /\/e-\d+/i.test(l.url),
    );

    // Also harvest /e- links from any sport-ish anchors
    $('a[href*="/e-"]').each((_, el) => {
      const href = ($(el).attr('href') ?? '').trim();
      if (!href) return;
      try {
        const abs = new URL(href, HOME).toString().split('#')[0]!.replace(/\/$/, '');
        if (!/\/e-\d+/i.test(abs)) return;
        if (detailLinks.some((l) => l.url === abs)) return;
        detailLinks.push({
          url: abs,
          anchorText: $(el).text().replace(/\s+/g, ' ').trim().slice(0, 160),
        });
      } catch {
        /* ignore */
      }
    });

    const drafts: Array<{ title: string; href: string; teaserDate: Date | null }> = [];
    const seenHref = new Set<string>();

    for (const link of detailLinks) {
      if (seenHref.has(link.url)) continue;
      seenHref.add(link.url);
      const title =
        link.anchorText.replace(/\s+/g, ' ').trim() ||
        link.url.split('/').pop()?.replace(/-/g, ' ') ||
        'Gopass event';
      // Prefer sport / spectacle listings; still keep explicit /e- ticket pages
      const sportish =
        /sport|basket|volej|slovan|eurobasket|globetrotter|hockey|hokej|tenis|show|exhib/i.test(
          `${title} ${link.url}`,
        );
      if (!sportish && drafts.length >= 4) continue;
      drafts.push({ title: title.slice(0, 120), href: link.url, teaserDate: null });
    }

    // Fallback: parse homepage text cards when no /e- links found
    if (drafts.length === 0) {
      $('a, article, .event, h3, h2').each((_, el) => {
        const $el = $(el);
        const text = $el.text().replace(/\s+/g, ' ').trim();
        if (text.length < 8 || text.length > 200) return;
        const isSport =
          /sport|basket|volej|slovan|eurobasket|globetrotter|challenge cup|bc\s|vk\s/i.test(
            text,
          );
        if (!isSport) return;
        const href = $el.closest('a').attr('href') || $el.attr('href');
        const abs = href ? new URL(href, HOME).toString() : HOME;
        const dm = text.match(/(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}|[A-Z][a-z]{2}\s+\d{1,2})/);
        drafts.push({
          title: text.slice(0, 120),
          href: abs,
          teaserDate: dm?.[1] ? parseSlovakDate(dm[1]) : null,
        });
      });
    }

    const events: NormalizedScrapedEvent[] = [];
    const seen = new Set<string>();
    let fetched = 0;

    for (const draft of drafts.slice(0, MAX_DETAILS)) {
      if (++fetched > MAX_LOOP_ITERATIONS) break;
      if (fetched > 1) await sleep(randomDelay());

      const matched =
        matchDetailUrl(draft.title, detailLinks) ||
        (/\/e-\d+/i.test(draft.href) ? draft.href : null);

      let event: NormalizedScrapedEvent & {
        timeKnown?: boolean;
        sourceExcerpt?: string | null;
        sourceEvidence?: import('@/src/lib/scraper/source-evidence').SourceEvidence | null;
      };

      if (matched && /\/e-\d+/i.test(matched)) {
        const detail = await enrichFromDetailPage(matched);
        if (!detail || !detail.startsAt) continue;

        const sport = detectEventSport(detail.title || draft.title, 'BASKETBALL');
        const base: NormalizedScrapedEvent = {
          source: 'gopass-arena',
          externalId: `gopass-${slugify(matched)}-${detail.startsAt.toISOString().slice(0, 10)}`,
          title: (detail.title || draft.title).slice(0, 120),
          sport,
          sportType: resolveSportType(sport),
          category: 'match',
          participationMode: 'spectator',
          startsAt: detail.startsAt,
          city: 'Bratislava',
          venueKey: 'gopass-arena',
          description:
            detail.description ||
            'Športové / show podujatie v Gopass Aréne — vstup ako divák (vstupenky).',
          locationName: detail.locationName || 'Gopass Aréna',
          sourceUrl: detail.url,
          ticketUrl: detail.ticketUrl || detail.url,
          priceCents:
            detail.priceText && /zadarmo|free/i.test(detail.priceText)
              ? 0
              : detail.priceText?.match(/(\d+)/)
                ? Number(detail.priceText.match(/(\d+)/)![1]) * 100
                : undefined,
          forKids: detail.forKids,
          forWomen: detail.forWomen,
        };
        event = applyDetailToNormalized(base, detail);
      } else {
        continue;
      }

      if (seen.has(event.externalId)) continue;
      seen.add(event.externalId);
      events.push(event);
    }

    return okResult('gopass-arena', events);
  } catch (error) {
    return errResult('gopass-arena', error);
  }
}
