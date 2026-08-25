/**
 * Named Bratislava scrape adapters — lazy-loaded so Edge cron can parse
 * **one** adapter per Worker isolate instead of compiling the whole fleet.
 *
 * Full `runAllScrapers()` stays Node-only (`scripts/scrape-events.ts`).
 */

import type { AdapterResult, ScrapeAdapterId } from '@/lib/scrape/types';

export type ScraperFn = () => Promise<AdapterResult>;

/** Same order as the previous sequential midnight crawl. */
export const SCRAPE_ADAPTER_IDS: readonly ScrapeAdapterId[] = [
  'aurial-padel',
  'padel-ba',
  'ntc-ba',
  'ofa-mma',
  'chaos-mma',
  'prostor',
  'wakelake',
  'divoka-voda',
  'pbc-bowling',
  'bnc-ba',
  'sipky-sk',
  'ba-marathon',
  'stupava-trophy',
  'horsky-beh',
  'topliga-ba',
  'areal-nevadzova',
  'k2-lezenie',
  'block-dock',
  'form-factory',
  'nivy-zone',
  'sk-slovan',
  'hc-slovan',
  'gopass-arena',
  'stz',
  'predpredaj',
  'citylife',
] as const;

/** 30 min slots × 26 adapters ≈ 13 h per venue (12 h cadence, never a midnight burst). */
export const SCRAPE_SHARD_SLOT_MS = 30 * 60 * 1000;

/** Hard cap: one Cheerio parse job per Cloudflare Worker invocation. */
export const EDGE_ADAPTERS_PER_INVOCATION = 1;

export function isEdgeScrapeRuntime(): boolean {
  return (
    process.env.NEXT_RUNTIME === 'edge' ||
    typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime !== 'undefined'
  );
}

export function scrapeSlotIndex(now = Date.now()): number {
  const n = SCRAPE_ADAPTER_IDS.length;
  if (n === 0) return 0;
  return Math.floor(now / SCRAPE_SHARD_SLOT_MS) % n;
}

export async function loadNamedScraper(id: ScrapeAdapterId): Promise<ScraperFn | null> {
  switch (id) {
    case 'aurial-padel':
      return (await import('@/lib/scrape/adapters/aurial-padel')).scrapeAurialPadel;
    case 'padel-ba':
      return (await import('@/lib/scrape/adapters/padel-ba')).scrapePadelBa;
    case 'ntc-ba':
      return (await import('@/lib/scrape/adapters/ntc-ba')).scrapeNtcBa;
    case 'ofa-mma':
      return (await import('@/lib/scrape/adapters/ofa-mma')).scrapeOfaMma;
    case 'chaos-mma':
      return (await import('@/lib/scrape/adapters/chaos-mma')).scrapeChaosMma;
    case 'prostor':
      return (await import('@/lib/scrape/adapters/prostor')).scrapeProstor;
    case 'wakelake':
      return (await import('@/lib/scrape/adapters/wakelake')).scrapeWakelake;
    case 'divoka-voda':
      return (await import('@/lib/scrape/adapters/divoka-voda')).scrapeDivokaVoda;
    case 'pbc-bowling':
      return (await import('@/lib/scrape/adapters/pbc-bowling')).scrapePbcBowling;
    case 'bnc-ba':
      return (await import('@/lib/scrape/adapters/bnc-ba')).scrapeBncBa;
    case 'sipky-sk':
      return (await import('@/lib/scrape/adapters/sipky-sk')).scrapeSipkySk;
    case 'ba-marathon':
      return (await import('@/lib/scrape/adapters/ba-marathon')).scrapeBaMarathon;
    case 'stupava-trophy':
      return (await import('@/lib/scrape/adapters/stupava-trophy')).scrapeStupavaTrophy;
    case 'horsky-beh':
      return (await import('@/lib/scrape/adapters/horsky-beh')).scrapeHorskyBeh;
    case 'topliga-ba':
      return (await import('@/lib/scrape/adapters/topliga-ba')).scrapeTopligaBa;
    case 'areal-nevadzova':
      return (await import('@/lib/scrape/adapters/areal-nevadzova')).scrapeArealNevadzova;
    case 'k2-lezenie':
      return (await import('@/lib/scrape/adapters/k2-lezenie')).scrapeK2Lezenie;
    case 'block-dock':
      return (await import('@/lib/scrape/adapters/block-dock')).scrapeBlockDock;
    case 'form-factory':
      return (await import('@/lib/scrape/adapters/form-factory')).scrapeFormFactory;
    case 'nivy-zone':
      return (await import('@/lib/scrape/adapters/nivy-zone')).scrapeNivyZone;
    case 'sk-slovan':
      return (await import('@/lib/scrape/adapters/sk-slovan')).scrapeSkSlovan;
    case 'hc-slovan':
      return (await import('@/lib/scrape/adapters/hc-slovan')).scrapeHcSlovan;
    case 'gopass-arena':
      return (await import('@/lib/scrape/adapters/gopass-arena')).scrapeGopassArena;
    case 'stz':
      return (await import('@/lib/scrape/adapters/stz')).scrapeStz;
    case 'predpredaj':
      return (await import('@/lib/scrape/adapters/predpredaj')).scrapePredpredaj;
    case 'citylife':
      return (await import('@/lib/scrape/adapters/citylife')).scrapeCitylife;
    default:
      return null;
  }
}
