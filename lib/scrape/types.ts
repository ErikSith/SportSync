import type { SportTypeKey } from '@/lib/ai/theme-config';
import type {
  BratislavaBorough,
  BratislavaDistrict,
} from '@/lib/scrape/bratislava-location';

export type ParticipationMode = 'spectator' | 'participate';
export type ScrapeCategory = 'match' | 'fitness' | 'tournament' | 'nightlife';

export type {
  BratislavaBorough,
  BratislavaDistrict,
  ParsedEvent,
} from '@/lib/scrape/bratislava-location';

/** Legacy + 20 Bratislava SCRAPE_TARGETS ids. */
export type ScrapeAdapterId =
  | 'sk-slovan'
  | 'hc-slovan'
  | 'gopass-arena'
  | 'form-factory'
  | 'arena-padel'
  | 'aurial-padel'
  | 'subdeck'
  | 'stz'
  | 'predpredaj'
  | 'citylife'
  | 'padel-ba'
  | 'ntc-ba'
  | 'ofa-mma'
  | 'chaos-mma'
  | 'prostor'
  | 'wakelake'
  | 'divoka-voda'
  | 'pbc-bowling'
  | 'bnc-ba'
  | 'sipky-sk'
  | 'ba-marathon'
  | 'stupava-trophy'
  | 'horsky-beh'
  | 'topliga-ba'
  | 'areal-nevadzova'
  | 'k2-lezenie'
  | 'block-dock'
  | 'nivy-zone'
  | 'venue-web';

export interface NormalizedScrapedEvent {
  source: ScrapeAdapterId;
  externalId: string;
  title: string;
  sport: string;
  sportType: SportTypeKey;
  category: ScrapeCategory;
  participationMode: ParticipationMode;
  startsAt: Date;
  city: string;
  venueKey: string;
  description?: string;
  /** Venue / place label extracted from listing. */
  locationName?: string;
  /** Free-text address for dynamic borough resolution. */
  address?: string;
  /** Official okres (I–V) after location tagging. */
  district?: BratislavaDistrict;
  /** Official mestská časť after location tagging. */
  borough?: BratislavaBorough;
  /** Always true — never persist third-party photos; Cover Factory generates graphics. */
  requiresAiGraphic?: boolean;
  /** Always ignored on upsert — Cover Factory owns covers (rights-safe). */
  coverUrl?: string | null;
  sourceUrl?: string | null;
  ticketUrl?: string | null;
  priceCents?: number;
  capacity?: number | null;
  registeredCount?: number;
  /** Kids-oriented activity (CityLife Kidstown, "pre deti", etc.). */
  forKids?: boolean;
}

export interface AdapterResult {
  source: ScrapeAdapterId;
  events: NormalizedScrapedEvent[];
  error?: string;
}

export interface ScrapeRunReport {
  created: number;
  updated: number;
  /** Unchanged rows left alone after compare, or failed writes. */
  skipped: number;
  unchanged: number;
  adapters: Array<{ source: ScrapeAdapterId; count: number; error?: string }>;
}

export const VENUE_SEEDS: Array<{
  key: string;
  name: string;
  address: string;
  city: string;
  sports: string[];
  latitude: number;
  longitude: number;
  websiteUrl: string;
  /** Bratislava borough slug for `venues.district` area filters. */
  district?: string;
}> = [
  {
    key: 'tehelne-pole',
    name: 'Tehelné pole',
    address: 'Viktora Tegelhoffa 4, Bratislava',
    city: 'Bratislava',
    sports: ['FOOTBALL'],
    latitude: 48.1636,
    longitude: 17.1386,
    websiteUrl: 'https://www.skslovan.com/',
    district: 'nove-mesto',
  },
  {
    key: 'tipos-arena',
    name: 'TIPOS Aréna',
    address: 'Odbojárov 9, Bratislava',
    city: 'Bratislava',
    sports: ['HOCKEY'],
    latitude: 48.1628,
    longitude: 17.1395,
    websiteUrl: 'https://www.hcslovan.sk/',
    district: 'nove-mesto',
  },
  {
    key: 'gopass-arena',
    name: 'Gopass Aréna',
    address: 'Trnavská cesta 29, Bratislava',
    city: 'Bratislava',
    sports: ['BASKETBALL', 'VOLLEYBALL'],
    latitude: 48.1645,
    longitude: 17.1378,
    websiteUrl: 'https://gopassarena.sk/',
    district: 'nove-mesto',
  },
  {
    key: 'form-factory-fitcamp',
    name: 'Form Factory FitCamp',
    address: 'Drieňová 11/A, Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.1562,
    longitude: 17.1475,
    websiteUrl: 'https://fitcamp.formfactory.sk/',
    district: 'ruzinov',
  },
  {
    key: 'form-factory-farskeho',
    name: 'Form Factory Farského',
    address: 'Farského 14, Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.1405,
    longitude: 17.1338,
    websiteUrl: 'https://www.formfactory.sk/',
    district: 'petrzalka',
  },
  {
    key: 'form-factory-nivy',
    name: 'Form Factory OC Nivy',
    address: 'Mlynské nivy 16, Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.1468,
    longitude: 17.1272,
    websiteUrl: 'https://www.formfactory.sk/',
    district: 'stare-mesto',
  },
  {
    key: 'form-factory-bbc',
    name: 'Form Factory BBC',
    address: 'Plynárenská 7/A, Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.1422,
    longitude: 17.1285,
    websiteUrl: 'https://www.formfactory.sk/',
    district: 'ruzinov',
  },
  {
    key: 'form-factory-cassovar',
    name: 'Form Factory Cassovar',
    address: 'Cassovar, Košice',
    city: 'Košice',
    sports: ['FITNESS'],
    latitude: 48.7164,
    longitude: 21.2611,
    websiteUrl: 'https://www.formfactory.sk/',
  },
  {
    key: 'form-factory-mirage',
    name: 'Form Factory Mirage',
    address: 'Mirage, Žilina',
    city: 'Žilina',
    sports: ['FITNESS'],
    latitude: 49.2231,
    longitude: 18.7394,
    websiteUrl: 'https://www.formfactory.sk/',
  },
  {
    key: 'form-factory-trencin',
    name: 'Form Factory OC MAX Trenčín',
    address: 'OC MAX, Trenčín',
    city: 'Trenčín',
    sports: ['FITNESS'],
    latitude: 48.8945,
    longitude: 18.0444,
    websiteUrl: 'https://www.formfactory.sk/',
  },
  {
    key: 'form-factory-bpark',
    name: 'Form Factory BPark',
    address: 'BPark, Považská Bystrica',
    city: 'Považská Bystrica',
    sports: ['FITNESS'],
    latitude: 49.1215,
    longitude: 18.4478,
    websiteUrl: 'https://www.formfactory.sk/',
  },
  {
    key: 'aurial-padel',
    name: 'Aurial Padel Bratislava',
    address: 'Bajkalská 7, Bratislava',
    city: 'Bratislava',
    sports: ['PADEL'],
    latitude: 48.1569,
    longitude: 17.1402,
    websiteUrl: 'https://aurialpadel.sk/',
    district: 'ruzinov',
  },
  {
    key: 'aurial-padel-raca',
    name: 'Aurial Padel Rača',
    address: 'Na Pántoch 8, Bratislava',
    city: 'Bratislava',
    sports: ['PADEL'],
    latitude: 48.2045,
    longitude: 17.1508,
    websiteUrl: 'https://aurialpadel.sk/',
    district: 'raca',
  },
  {
    key: 'padel-ba',
    name: 'Padel Bratislava',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['PADEL'],
    latitude: 48.1486,
    longitude: 17.1077,
    websiteUrl: 'https://www.padelbratislava.sk/',
    district: 'ruzinov',
  },
  {
    key: 'ntc-kosice',
    name: 'NTC Košice',
    address: 'Popradská 84/E, Košice',
    city: 'Košice',
    sports: ['TENNIS'],
    latitude: 48.7164,
    longitude: 21.2381,
    websiteUrl: 'https://www.stz.sk/',
  },
  {
    key: 'ntc-bratislava',
    name: 'Národné tenisové centrum Bratislava',
    address: 'Trnavská cesta, Bratislava',
    city: 'Bratislava',
    sports: ['TENNIS'],
    latitude: 48.1655,
    longitude: 17.1368,
    websiteUrl: 'https://www.ntc.sk/',
    district: 'nove-mesto',
  },
  {
    key: 'ofa-mma',
    name: 'OFA Gym',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['COMBAT'],
    latitude: 48.1486,
    longitude: 17.1077,
    websiteUrl: 'https://ofa.sk/',
    district: 'stare-mesto',
  },
  {
    key: 'chaos-mma',
    name: 'Chaos MMA',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['COMBAT'],
    latitude: 48.155,
    longitude: 17.12,
    websiteUrl: 'https://www.chaosgym.sk/',
    district: 'ruzinov',
  },
  {
    key: 'prostor',
    name: 'Crossfit Prostor',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.152,
    longitude: 17.11,
    websiteUrl: 'https://www.prostor.sk/',
    district: 'ruzinov',
  },
  {
    key: 'wakelake',
    name: 'Wakelake',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['SWIMMING'],
    latitude: 48.12,
    longitude: 17.15,
    websiteUrl: 'https://www.wakelake.sk/',
    district: 'petrzalka',
  },
  {
    key: 'divoka-voda',
    name: 'Divoká Voda Čunovo',
    address: 'Čunovo, Bratislava',
    city: 'Bratislava',
    sports: ['SWIMMING'],
    latitude: 48.0297,
    longitude: 17.1897,
    websiteUrl: 'https://www.divokavoda.sk/',
    district: 'cunovo',
  },
  {
    key: 'pbc-bowling',
    name: 'PBC Bowling',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['OTHER'],
    latitude: 48.15,
    longitude: 17.11,
    websiteUrl: 'http://www.pbc.sk/',
    district: 'stare-mesto',
  },
  {
    key: 'bnc-ba',
    name: 'BNC Bratislava',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['OTHER'],
    latitude: 48.151,
    longitude: 17.112,
    websiteUrl: 'https://www.bnc.sk/',
    district: 'nove-mesto',
  },
  {
    key: 'sipky-sk',
    name: 'Slovenská Šípková Federácia',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['OTHER'],
    latitude: 48.1486,
    longitude: 17.1077,
    websiteUrl: 'https://www.sipky.sk/',
    district: 'stare-mesto',
  },
  {
    key: 'ba-marathon',
    name: 'Bratislava Marathon',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['RUNNING'],
    latitude: 48.1486,
    longitude: 17.1077,
    websiteUrl: 'https://www.bratislavamarathon.com/',
    district: 'stare-mesto',
  },
  {
    key: 'stupava-trophy',
    name: 'Stupava Trophy',
    address: 'Stupava',
    city: 'Stupava',
    sports: ['RUNNING'],
    latitude: 48.2747,
    longitude: 17.0317,
    websiteUrl: 'https://www.stupavatrophy.sk/',
  },
  {
    key: 'horsky-beh',
    name: 'Horský Beh Karpaty',
    address: 'Malé Karpaty',
    city: 'Bratislava',
    sports: ['RUNNING'],
    latitude: 48.2,
    longitude: 17.05,
    websiteUrl: 'https://www.horskybeh.sk/',
    district: 'lamac',
  },
  {
    key: 'topliga-ba',
    name: 'Niké Topliga Bratislava',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['FOOTBALL'],
    latitude: 48.1486,
    longitude: 17.1077,
    websiteUrl: 'https://bratislava.topliga.sk/',
    district: 'petrzalka',
  },
  {
    key: 'areal-nevadzova',
    name: 'Športový areál Nevädzová',
    address: 'Nevädzová, Bratislava',
    city: 'Bratislava',
    sports: ['FOOTBALL'],
    latitude: 48.1558,
    longitude: 17.1525,
    websiteUrl: 'https://www.arealnevadzova.sk/',
    district: 'ruzinov',
  },
  {
    key: 'k2-lezenie',
    name: 'K2 Lezecká stena',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['OTHER'],
    latitude: 48.16,
    longitude: 17.13,
    websiteUrl: 'https://www.lezeckastena.sk/',
    district: 'nove-mesto',
  },
  {
    key: 'block-dock',
    name: 'Block Dock Bouldering',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['OTHER'],
    latitude: 48.145,
    longitude: 17.125,
    websiteUrl: 'https://www.blockdock.sk/',
    district: 'ruzinov',
  },
  {
    key: 'nivy-zone',
    name: 'Nivy Zóna',
    address: 'Mlynské nivy 16, Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.1468,
    longitude: 17.1272,
    websiteUrl: 'https://nivy.com/',
    district: 'stare-mesto',
  },
  {
    key: 'citylife-eurovea',
    name: 'Eurovea (Dunaj)',
    address: 'Pribinova, Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.1405,
    longitude: 17.1225,
    websiteUrl: 'https://www.citylife.sk/',
    district: 'stare-mesto',
  },
  {
    key: 'citylife-grassalkovich',
    name: 'Grassalkovichova zahrada',
    address: 'Hodžovo námestie, Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.1494,
    longitude: 17.1077,
    websiteUrl: 'https://www.citylife.sk/',
    district: 'stare-mesto',
  },
];

/** Fallback Unsplash plates used only when Cover Factory cannot run. */
export const DEFAULT_COVERS: Record<string, string> = {
  FOOTBALL: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  HOCKEY: 'https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=800&q=80',
  BASKETBALL: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
  TENNIS: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
  PADEL: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
  FITNESS: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  NIGHTLIFE: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80',
  COMBAT: 'https://images.unsplash.com/photo-1549719386-90efe2c3b85e?w=800&q=80',
  RUNNING: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
  SWIMMING: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=800&q=80',
  SURFING: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80',
  OTHER: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
};
