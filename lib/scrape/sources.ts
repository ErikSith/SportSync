import type { EventSport } from '@/lib/constants/sports';
import type {
  BratislavaBorough,
  BratislavaDistrict,
} from '@/lib/scrape/bratislava-location';
import { scrapingSourceByAdapter } from '@/lib/scrape/scraping-sources';
import type { ScrapeAdapterId } from '@/lib/scrape/types';

/** Incoming sport labels from product config → canonical EventSport. */
export type ScrapeSportAlias =
  | EventSport
  | 'MARTIAL_ARTS'
  | 'WATER_SPORTS'
  | 'BOWLING'
  | 'DARTS'
  | 'CLIMBING'
  | 'YOGA';

export interface ScrapeTarget {
  id: ScrapeAdapterId;
  name: string;
  url: string;
  /** Product-facing sport label (may be an alias). */
  sport: ScrapeSportAlias;
  venueKey: string;
  /** Extra paths relative to `url` (events / tournaments / schedule). */
  paths?: string[];
  /** Official okres — filled from SCRAPING_SOURCES when available. */
  district?: BratislavaDistrict;
  /** Official mestská časť — filled from SCRAPING_SOURCES when available. */
  borough?: BratislavaBorough;
}

/** Map product aliases to DB `events.sport` values. */
export function canonicalScrapeSport(alias: ScrapeSportAlias | string): EventSport {
  const key = alias.toUpperCase();
  switch (key) {
    case 'MARTIAL_ARTS':
      return 'COMBAT';
    case 'WATER_SPORTS':
      return 'SWIMMING';
    case 'DARTS':
      return 'OTHER';
    case 'BOWLING':
      return 'BOWLING';
    case 'CLIMBING':
      return 'CLIMBING';
    case 'YOGA':
      return 'YOGA';
    default:
      return (key as EventSport) || 'OTHER';
  }
}

/**
 * 20 Bratislava scrape targets — text-only news, schedules, open trainings, tournaments.
 * URLs are clean (no markdown). Adapter id matches `ScrapeAdapterId`.
 */
export const SCRAPE_TARGETS: ScrapeTarget[] = [
  {
    id: 'aurial-padel',
    name: 'Aurial Padel Club',
    url: 'https://aurialpadel.sk/',
    sport: 'PADEL',
    venueKey: 'aurial-padel',
    paths: ['turnaje'],
  },
  {
    id: 'padel-ba',
    name: 'Arena Padel Bratislava',
    url: 'https://arenapadel.sk/',
    sport: 'PADEL',
    venueKey: 'padel-ba',
    paths: ['turnaje/'],
  },
  {
    id: 'ntc-ba',
    name: 'NTC Bratislava',
    url: 'https://www.ntc.sk/',
    sport: 'TENNIS',
    venueKey: 'ntc-bratislava',
    paths: ['aktuality.html', 'podujatia.html'],
  },
  {
    id: 'ofa-mma',
    name: 'OFA Gym',
    url: 'https://www.ofa-gym.sk/',
    sport: 'MARTIAL_ARTS',
    venueKey: 'ofa-mma',
  },
  {
    id: 'chaos-mma',
    name: 'Chaos MMA',
    url: 'https://mammal.sk/clenovia/kolektivni-clenovia/chaos-bratislava/',
    sport: 'MARTIAL_ARTS',
    venueKey: 'chaos-mma',
  },
  {
    id: 'prostor',
    name: 'Crossfit Prostor',
    url: 'https://www.crossfitproton.sk/',
    sport: 'FITNESS',
    venueKey: 'prostor',
  },
  {
    id: 'wakelake',
    name: 'Wakelake',
    url: 'https://www.wakelake.sk/',
    sport: 'WATER_SPORTS',
    venueKey: 'wakelake',
  },
  {
    id: 'divoka-voda',
    name: 'Divoká Voda Čunovo',
    url: 'https://www.divokavoda.sk/',
    sport: 'WATER_SPORTS',
    venueKey: 'divoka-voda',
  },
  {
    id: 'pbc-bowling',
    name: 'PBC Bowling',
    url: 'http://www.bowlingpbc.sk/',
    sport: 'BOWLING',
    venueKey: 'pbc-bowling',
  },
  {
    id: 'bnc-ba',
    name: 'BNC Bratislava',
    url: 'https://www.bnc-sk.sk/',
    sport: 'BOWLING',
    venueKey: 'bnc-ba',
  },
  {
    id: 'sipky-sk',
    name: 'Slovenská šípkarská federácia',
    url: 'https://www.slovakiadart.sk/',
    sport: 'DARTS',
    venueKey: 'sipky-sk',
  },
  {
    id: 'ba-marathon',
    name: 'Bratislava Marathon',
    url: 'https://www.bratislavamarathon.com/',
    sport: 'RUNNING',
    venueKey: 'ba-marathon',
  },
  {
    id: 'stupava-trophy',
    name: 'Stupava Trophy',
    url: 'https://www.stupavatrophy.sk/',
    sport: 'RUNNING',
    venueKey: 'stupava-trophy',
  },
  {
    id: 'horsky-beh',
    name: 'Horský Beh Karpaty',
    url: 'https://www.horskybeh.sk/',
    sport: 'RUNNING',
    venueKey: 'horsky-beh',
  },
  {
    id: 'topliga-ba',
    name: 'Niké Topliga Bratislava',
    url: 'https://www.topliga.sk/?leagueId=3',
    sport: 'FOOTBALL',
    venueKey: 'topliga-ba',
  },
  {
    id: 'areal-nevadzova',
    name: 'Športový areál Nevädzová',
    url: 'https://www.arealnevadzova.sk/',
    sport: 'FOOTBALL',
    venueKey: 'areal-nevadzova',
  },
  {
    id: 'k2-lezenie',
    name: 'K2 Lezecká stena',
    url: 'https://www.lezeckastena.sk/',
    sport: 'CLIMBING',
    venueKey: 'k2-lezenie',
  },
  {
    id: 'block-dock',
    name: 'Block Dock Bouldering',
    url: 'https://www.blockdock.sk/',
    sport: 'CLIMBING',
    venueKey: 'block-dock',
  },
  {
    id: 'form-factory',
    name: 'Form Factory Bratislava',
    url: 'https://www.formfactory.sk/',
    sport: 'FITNESS',
    venueKey: 'form-factory-fitcamp',
    paths: ['eventy/'],
  },
  {
    id: 'nivy-zone',
    name: 'Nivy Zóna Eventy',
    url: 'https://nivy.com/',
    sport: 'YOGA',
    venueKey: 'nivy-zone',
  },
];

export function scrapeTargetById(id: string): ScrapeTarget | undefined {
  const target = SCRAPE_TARGETS.find((t) => t.id === id);
  if (!target) return undefined;
  return withLocation(target);
}

function withLocation(target: ScrapeTarget): ScrapeTarget {
  if (target.district && target.borough) return target;
  const source = scrapingSourceByAdapter(target.id);
  if (!source || source.borough === 'Dynamic' || source.district === 'Bratislava (Všeobecné)') {
    return target;
  }
  return {
    ...target,
    district: source.district,
    borough: source.borough,
  };
}

/** All scrape targets with okres / mestská časť attached when configured. */
export function scrapeTargetsWithLocation(): ScrapeTarget[] {
  return SCRAPE_TARGETS.map(withLocation);
}
