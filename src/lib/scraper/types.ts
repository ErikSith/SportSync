import { z } from 'zod';

export const ScrapedEventSchema = z.object({
  title: z.string().describe('Presný názov športovej udalosti alebo turnaja'),
  sportType: z
    .string()
    .describe('Druh športu (napr. Padel, Futbal, Tenis, Joga, Beh)'),
  isTournament: z
    .boolean()
    .describe(
      'True len ak ide o turnaj s otvorenou prihláškou hráča. False pre ligový zápas Tím vs Tím (divák / Sledovať).',
    ),
  isGroupClass: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'True ak ide o opakovanú skupinovú lekciu/tréning na tom istom športovisku v obvykle rovnakom čase',
    ),

  // FILTRE PRE ŽENY A DETI
  isForWomenOnly: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "True ak je akcia určená výhradne pre ženy/dievčatá (napr. 'Ženský turnaj', 'Joga pre ženy', 'Ladies Cup')",
    ),
  isForKids: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "True ak je akcia určená pre deti, mládež, rodiny s deťmi alebo juniorky/juniorov (napr. 'Detský tábor', 'Turnaj do 14 rokov', 'Baby joga')",
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
      'Dátum a čas začiatku vo formáte ISO 8601 string (napr. 2026-09-05T09:00:00+02:00). Ak čas nie je na stránke, použi poludnie 12:00 a timeKnown=false.',
    ),
  timeKnown: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'True LEN ak je HH:MM explicitne pri udalosti. False ak je len dátum (napr. „26.9. Rozlúčka so sezónou“) — nikdy nevymýšľaj 10:00/14:00.',
    ),
  endTime: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Dátum a čas konca ak je uvedený. Pri viacdňovom festivale/turnaji (5.–9. novembra) nastav posledný deň.',
    ),
  locationName: z.string().describe('Názov športoviska alebo adresa'),
  priceText: z
    .string()
    .optional()
    .nullable()
    .describe("Cena (napr. '15 €', 'Zadarmo')"),
  description: z
    .string()
    .optional()
    .nullable()
    .describe('Stručný výťah pravidiel alebo pokynov (max 2 vety)'),
  originalUrl: z
    .string()
    .url()
    .describe('Priama URL adresa zdroja/rezervačného systému'),
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
            description: 'Presný názov športovej udalosti alebo turnaja',
          },
          sportType: {
            type: 'string',
            description: 'Druh športu (napr. Padel, Futbal, Tenis, Joga, Beh)',
          },
          isTournament: {
            type: 'boolean',
            description:
              'True len pre turnaj s otvorenou prihláškou. False pre zápas Tím vs Tím (divák).',
          },
          isGroupClass: {
            type: 'boolean',
            description:
              'True ak ide o opakovanú skupinovú lekciu/tréning na tom istom športovisku v obvykle rovnakom čase',
          },
          isForWomenOnly: {
            type: 'boolean',
            description:
              "True ak je akcia určená výhradne pre ženy/dievčatá (napr. 'Ženský turnaj', 'Joga pre ženy', 'Ladies Cup')",
          },
          isForKids: {
            type: 'boolean',
            description:
              "True ak je akcia určená pre deti, mládež, rodiny s deťmi alebo juniorky/juniorov (napr. 'Detský tábor', 'Turnaj do 14 rokov', 'Baby joga')",
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
          originalUrl: {
            type: 'string',
            description: 'Priama URL adresa zdroja/rezervačného systému',
          },
        },
        required: [
          'title',
          'sportType',
          'isTournament',
          'isGroupClass',
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
