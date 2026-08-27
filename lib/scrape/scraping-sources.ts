/**
 * Scraping source registry with Bratislava okres + mestská časť mapping.
 * Fixed venues inherit district/borough; aggregators use `Dynamic` + resolveBorough().
 */

import type {
  BratislavaBorough,
  BratislavaDistrict,
} from '@/lib/scrape/bratislava-location';
import type { ScrapeAdapterId } from '@/lib/scrape/types';

/** Aggregator / city-wide sources before dynamic borough resolution. */
export type ScrapingSourceDistrict = BratislavaDistrict | 'Bratislava (Všeobecné)';
export type ScrapingSourceBorough = BratislavaBorough | 'Dynamic';

export interface ScrapingSource {
  id: string;
  name: string;
  url: string;
  category: string;
  district: ScrapingSourceDistrict;
  borough: ScrapingSourceBorough;
  /** Existing adapter id when this source is wired into `runAllScrapers`. */
  adapterId?: ScrapeAdapterId;
  /** Venue seed key used on upsert. */
  venueKey?: string;
}

export const SCRAPING_SOURCES: ScrapingSource[] = [
  // Bratislava I
  {
    id: 'nivy-zone',
    name: 'Nivy Zone Events',
    url: 'https://nivy.com/podujatia',
    category: 'Community/Yoga',
    district: 'Bratislava I',
    borough: 'Staré Mesto',
    adapterId: 'nivy-zone',
    venueKey: 'nivy-zone',
  },
  {
    id: 'ba-marathon',
    name: 'Bratislava Marathon',
    url: 'https://www.bratislavamarathon.com/',
    category: 'Running',
    district: 'Bratislava I',
    borough: 'Staré Mesto',
    adapterId: 'ba-marathon',
    venueKey: 'ba-marathon',
  },
  {
    id: 'fitup-stare-mesto',
    name: 'FitUP Staré Mesto',
    url: 'https://fitup.sk/',
    category: 'Fitness',
    district: 'Bratislava I',
    borough: 'Staré Mesto',
  },
  {
    id: 'golem-central',
    name: 'Golem Club Central',
    url: 'https://www.golemclub.sk/',
    category: 'Fitness/Group',
    district: 'Bratislava I',
    borough: 'Staré Mesto',
  },

  // Bratislava II
  {
    id: 'aurial-padel',
    name: 'Aurial Padel',
    url: 'https://aurialpadel.sk/',
    category: 'Padel',
    district: 'Bratislava II',
    borough: 'Ružinov',
    adapterId: 'aurial-padel',
    venueKey: 'aurial-padel',
  },
  {
    id: 'fitcamp',
    name: 'FitCamp Drieňová',
    url: 'https://fitcamp.sk/',
    category: 'Crossfit/Fitness',
    district: 'Bratislava II',
    borough: 'Ružinov',
    adapterId: 'form-factory',
    venueKey: 'form-factory-fitcamp',
  },
  {
    id: 'form-factory',
    name: 'Form Factory Bratislava',
    url: 'https://www.formfactory.sk/',
    category: 'Fitness/Group',
    district: 'Bratislava II',
    borough: 'Ružinov',
    adapterId: 'form-factory',
    venueKey: 'form-factory-fitcamp',
  },
  {
    id: 'areal-nevadzova',
    name: 'Športový Areál Nevädzová',
    url: 'https://www.arealnevadzova.sk/',
    category: 'Football/Volleyball',
    district: 'Bratislava II',
    borough: 'Ružinov',
    adapterId: 'areal-nevadzova',
    venueKey: 'areal-nevadzova',
  },
  {
    id: 'block-dock',
    name: 'Block Dock Bouldering',
    url: 'https://blockdock.sk/',
    category: 'Climbing',
    district: 'Bratislava II',
    borough: 'Ružinov',
    adapterId: 'block-dock',
    venueKey: 'block-dock',
  },

  // Bratislava III
  {
    id: 'pasienky',
    name: 'Mestská plaváreň Pasienky',
    url: 'https://starz.sk/',
    category: 'Swimming/Aquatics',
    district: 'Bratislava III',
    borough: 'Nové Mesto',
  },
  {
    id: 'ntc-ba',
    name: 'National Tennis Center (NTC)',
    url: 'https://www.ntc.sk/',
    category: 'Tennis/Squash',
    district: 'Bratislava III',
    borough: 'Nové Mesto',
    adapterId: 'ntc-ba',
    venueKey: 'ntc-bratislava',
  },
  {
    id: 'k2-climbing',
    name: 'K2 Lezecká stena',
    url: 'https://www.lezeckastena.sk/',
    category: 'Climbing',
    district: 'Bratislava III',
    borough: 'Nové Mesto',
    adapterId: 'k2-lezenie',
    venueKey: 'k2-lezenie',
  },
  {
    id: '3x3-sport',
    name: '3x3 SportFest',
    url: 'https://www.3x3sport.sk/',
    category: 'Floorball/Streetball',
    district: 'Bratislava III',
    borough: 'Nové Mesto',
  },
  {
    id: 'bnc-ba',
    name: 'BNC Bratislava',
    url: 'https://www.bnc-sk.sk/',
    category: 'Bowling',
    district: 'Bratislava III',
    borough: 'Nové Mesto',
    adapterId: 'bnc-ba',
    venueKey: 'bnc-ba',
  },

  // Bratislava IV
  {
    id: 'hangair',
    name: 'Hangair Action Sports Academy',
    url: 'https://hangair.sk/',
    category: 'Action Sports/Freestyle',
    // Hangair sits in Vajnory (BA III) — taxonomy is authoritative over district label.
    district: 'Bratislava III',
    borough: 'Vajnory',
  },
  {
    id: 'vodarenska-zahrada',
    name: 'Vodárenská záhrada',
    url: 'https://kamdomesta.sk/bratislava/sport',
    category: 'Yoga/Outdoor',
    district: 'Bratislava IV',
    borough: 'Karlova Ves',
  },
  {
    id: 'lamac-sport',
    name: 'Runfest Lamač / KarpatyRun',
    url: 'https://www.lamac.sk/',
    category: 'Running/Trail',
    district: 'Bratislava IV',
    borough: 'Lamač',
  },

  // Bratislava V
  {
    id: 'wakelake',
    name: 'Wakelake',
    url: 'https://wakelake.sk/',
    category: 'Water Sports/Volleyball',
    district: 'Bratislava V',
    borough: 'Petržalka',
    adapterId: 'wakelake',
    venueKey: 'wakelake',
  },
  {
    id: 'drazdiak-outdoor',
    name: 'Veľký Draždiak Events',
    url: 'https://www.petrzalka.sk/',
    category: 'Beach Volleyball/Swimming',
    district: 'Bratislava V',
    borough: 'Petržalka',
  },
  {
    id: 'topliga',
    name: 'Niké Topliga Bratislava',
    url: 'https://www.topliga.sk/?leagueId=3',
    category: 'Small Football',
    district: 'Bratislava V',
    borough: 'Petržalka',
    adapterId: 'topliga-ba',
    venueKey: 'topliga-ba',
  },

  // Aggregators — dynamic borough recognition
  {
    id: 'codnes-ba',
    name: 'CoDnes Šport',
    url: 'https://bratislava.codnes.sk/sport',
    category: 'Aggregator',
    district: 'Bratislava (Všeobecné)',
    borough: 'Dynamic',
  },
  {
    id: 'kamdomesta-ba',
    name: 'KamDoMesta Šport',
    url: 'https://kamdomesta.sk/bratislava/sport',
    category: 'Aggregator',
    district: 'Bratislava (Všeobecné)',
    borough: 'Dynamic',
    // citylife covers similar city-wide sport listings today
    adapterId: 'citylife',
  },
];

/** Extra venue → borough overrides for multi-site / legacy adapters. */
export const VENUE_BOROUGH_OVERRIDES: Record<
  string,
  { district: BratislavaDistrict; borough: BratislavaBorough }
> = {
  'tehelne-pole': { district: 'Bratislava III', borough: 'Nové Mesto' },
  'tipos-arena': { district: 'Bratislava III', borough: 'Nové Mesto' },
  'gopass-arena': { district: 'Bratislava III', borough: 'Nové Mesto' },
  'form-factory-fitcamp': { district: 'Bratislava II', borough: 'Ružinov' },
  'form-factory-farskeho': { district: 'Bratislava V', borough: 'Petržalka' },
  'form-factory-nivy': { district: 'Bratislava I', borough: 'Staré Mesto' },
  'form-factory-bbc': { district: 'Bratislava II', borough: 'Ružinov' },
  'aurial-padel': { district: 'Bratislava II', borough: 'Ružinov' },
  'aurial-padel-raca': { district: 'Bratislava III', borough: 'Rača' },
  'ntc-bratislava': { district: 'Bratislava III', borough: 'Nové Mesto' },
  'divoka-voda': { district: 'Bratislava V', borough: 'Čunovo' },
  'citylife-eurovea': { district: 'Bratislava I', borough: 'Staré Mesto' },
  'citylife-grassalkovich': { district: 'Bratislava I', borough: 'Staré Mesto' },
  'horsky-beh': { district: 'Bratislava IV', borough: 'Lamač' },
};

const byId = new Map(SCRAPING_SOURCES.map((s) => [s.id, s]));
const byAdapter = new Map(
  SCRAPING_SOURCES.filter((s) => s.adapterId).map((s) => [s.adapterId!, s]),
);
const byVenueKey = new Map(
  SCRAPING_SOURCES.filter((s) => s.venueKey).map((s) => [s.venueKey!, s]),
);

export function scrapingSourceById(id: string): ScrapingSource | undefined {
  return byId.get(id);
}

export function scrapingSourceByAdapter(adapterId: ScrapeAdapterId | string): ScrapingSource | undefined {
  return byAdapter.get(adapterId as ScrapeAdapterId);
}

export function scrapingSourceByVenueKey(venueKey: string): ScrapingSource | undefined {
  return byVenueKey.get(venueKey);
}

export function isDynamicBoroughSource(source: ScrapingSource): boolean {
  return source.borough === 'Dynamic';
}
