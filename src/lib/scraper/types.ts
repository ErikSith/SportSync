import { z } from 'zod';

/** Six mutually exclusive SportSync listing categories. */
export const EventCategoryEnum = z.enum([
  'PODUJATIE', // Jednorazové komunitné akcie, zápasy, akcie bez špecifickej kategórie
  'SKUPINOVE_CVICENIE', // Pravidelné denné rozpisy vo fitku/štúdiu (Joga, Pilates, FitCamp)
  'TURNAJ', // Súťaže, ligy, poháre (pre dospelých aj deti a ženy)
  'WORKSHOP', // Krátkodobé intenzívne vzdelávacie/tréningové akcie
  'DETSKY_TABOR', // Viacdňové prázdnové denné/letné kempy pre deti
  'DETSKY_KRUZOK', // Celoročné alebo pravidelné tréningy po škole pre deti
]);

export type EventCategory = z.infer<typeof EventCategoryEnum>;

export const ScrapedEventSchema = z.object({
  title: z.string().describe('Presný názov športovej udalosti alebo akcie'),
  sportType: z
    .string()
    .describe('Druh športu (napr. Padel, Futbal, Tenis, Joga, Plávanie)'),

  // HLAVNÁ KATEGORIZÁCIA (presne jedna z 6) — Gemini povinné; adapters môžu vynechať (sync doplní)
  category: EventCategoryEnum.optional().describe(
    'Presné určenie typu akcie podľa jej charakteru',
  ),

  // Legacy boolean flags — derived from category in normalize; kept for upsert / adapters
  isTournament: z
    .boolean()
    .optional()
    .default(false)
    .describe('True keď category=TURNAJ (otvorená prihláška). False pre zápas Tím vs Tím.'),
  isGroupClass: z
    .boolean()
    .optional()
    .default(false)
    .describe('True keď category=SKUPINOVE_CVICENIE'),
  isCamp: z
    .boolean()
    .optional()
    .default(false)
    .describe('True keď category=DETSKY_TABOR'),
  isWorkshop: z
    .boolean()
    .optional()
    .default(false)
    .describe('True keď category=WORKSHOP'),
  isCourse: z
    .boolean()
    .optional()
    .default(false)
    .describe('True keď category=DETSKY_KRUZOK'),

  // CIEĽOVÉ SKUPINY & FILTRE
  isForWomenOnly: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "True ak je akcia určená výhradne pre ženy/dievčatá (napr. 'Ženský turnaj', 'Joga pre ženy')",
    ),
  isForKids: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'True ak je akcia určená pre deti, mládež, juniorov (krúžky, tábory, U12). DETSKY_* → vždy true.',
    ),
  ageCategory: z
    .string()
    .optional()
    .nullable()
    .describe(
      "Vekové obmedzenie ak je explicitne uvedené (napr. 'U12', '6-10 rokov', 'Dospelí')",
    ),

  startTime: z
    .string()
    .describe(
      'Dátum a čas začiatku vo formáte ISO 8601 (napr. 2026-08-15T09:00:00+02:00). Ak čas chýba, použi 12:00 a timeKnown=false.',
    ),
  timeKnown: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'True LEN ak je HH:MM explicitne pri udalosti. False ak je len dátum — nikdy nevymýšľaj čas.',
    ),
  endTime: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Dátum a čas konca ak je uvedený. Pri viacdňovom festivale/tábore (5.–9. novembra) nastav posledný deň.',
    ),
  locationName: z.string().describe('Názov športoviska alebo adresa konania'),
  city: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Mesto konania (Bratislava, Košice, …) — len ak je explicitne pri udalosti',
    ),
  priceText: z
    .string()
    .optional()
    .nullable()
    .describe("Cena (napr. '15 €', 'Zadarmo')"),
  description: z
    .string()
    .optional()
    .nullable()
    .describe('Stručný výťah pokynov alebo programu (max 2 vety)'),

  /**
   * Priama URL detailu podujatia (po prekliknutí z listingu).
   * Preferovaná pred originalUrl; normalize ju skopíruje do originalUrl.
   */
  detailUrl: z
    .string()
    .url()
    .optional()
    .describe('Priama URL adresa na detail podujatia, na ktorú scraper klikol'),
  /** Canonical source / booking URL used by upsert (filled from detailUrl when present). */
  originalUrl: z
    .string()
    .url()
    .describe('Priama URL adresa zdroja/rezervačného systému alebo detailu'),
});

export type ScrapedEvent = z.infer<typeof ScrapedEventSchema> & {
  /** Attached post-extract — not part of Gemini schema. */
  sourceExcerpt?: string | null;
  sourceEvidence?: import('./source-evidence').SourceEvidence | null;
};

export const ScrapedEventListSchema = z.object({
  events: z.array(ScrapedEventSchema),
});

export type ScrapedEventList = z.infer<typeof ScrapedEventListSchema>;

/** Gemini / OpenAPI-compatible JSON Schema for structured output. */
export const SCRAPED_EVENT_LIST_JSON_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Presný názov športovej udalosti alebo akcie',
          },
          sportType: {
            type: 'string',
            description: 'Druh športu (napr. Padel, Futbal, Tenis, Joga, Plávanie)',
          },
          category: {
            type: 'string',
            enum: [
              'PODUJATIE',
              'SKUPINOVE_CVICENIE',
              'TURNAJ',
              'WORKSHOP',
              'DETSKY_TABOR',
              'DETSKY_KRUZOK',
            ],
            description:
              'Presné určenie typu: PODUJATIE | SKUPINOVE_CVICENIE | TURNAJ | WORKSHOP | DETSKY_TABOR | DETSKY_KRUZOK',
          },
          isForWomenOnly: {
            type: 'boolean',
            description:
              "True ak je akcia výhradne pre ženy/dievčatá (napr. 'Joga pre ženy', 'Ladies Cup')",
          },
          isForKids: {
            type: 'boolean',
            description:
              'True pre deti/mládež/juniorov. DETSKY_TABOR a DETSKY_KRUZOK → vždy true.',
          },
          ageCategory: {
            type: 'string',
            nullable: true,
            description:
              "Vekové obmedzenie ak je explicitne uvedené (napr. 'U12', '6-10 rokov', 'Dospelí')",
          },
          startTime: {
            type: 'string',
            description:
              'ISO 8601 začiatok. Ak chýba HH:MM, použi 12:00 a timeKnown=false.',
          },
          timeKnown: {
            type: 'boolean',
            description:
              'True len pri explicitnom HH:MM. False pri samotnom dátume — nevymýšľaj čas.',
          },
          endTime: {
            type: 'string',
            nullable: true,
            description:
              'Koniec ak je uvedený. Pri viacdňovom rozsahu (5.–9. novembra) posledný deň.',
          },
          locationName: {
            type: 'string',
            description: 'Názov športoviska alebo adresa',
          },
          city: {
            type: 'string',
            nullable: true,
            description:
              'Mesto konania (Bratislava, Košice, …) — len ak je explicitne pri udalosti',
          },
          priceText: {
            type: 'string',
            nullable: true,
            description: "Cena (napr. '15 €', 'Zadarmo')",
          },
          description: {
            type: 'string',
            nullable: true,
            description: 'Stručný výťah pravidiel alebo pokynov (max 2 vety)',
          },
          detailUrl: {
            type: 'string',
            description:
              'Priama URL detailu podujatia (po prekliknutí). Inak URL listingu.',
          },
          originalUrl: {
            type: 'string',
            description:
              'Priama URL zdroja/rezervačného systému (synonymum detailUrl)',
          },
        },
        required: [
          'title',
          'sportType',
          'category',
          'isForWomenOnly',
          'isForKids',
          'startTime',
          'timeKnown',
          'locationName',
          'originalUrl',
        ],
      },
    },
  },
  required: ['events'],
} as const;

export const GEMINI_SCRAPER_SOURCE = 'gemini-web' as const;

export interface ScraperUpsertStats {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  tournamentsCreated: number;
  tournamentsUpdated: number;
}

export interface ScraperUrlResult {
  url: string;
  events: ScrapedEvent[];
  error?: string;
  /** True when Gemini was skipped (keyword pre-filter). Not a hard failure. */
  skippedGemini?: boolean;
}

export interface ScraperRunReport {
  dryRun: boolean;
  urls: number;
  extracted: number;
  upsert: ScraperUpsertStats;
  results: ScraperUrlResult[];
}

export interface MidnightPurgeStats {
  deletedEvents: number;
  deletedTournaments: number;
  deleted: number;
}

export interface MidnightSyncReport {
  ok: boolean;
  purge: MidnightPurgeStats;
  scrape: ScraperRunReport;
}
