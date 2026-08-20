import { z } from 'zod';

export const ScrapedEventSchema = z.object({
  title: z.string().describe('Presný názov športovej udalosti alebo turnaja'),
  sportType: z
    .string()
    .describe('Druh športu (napr. Padel, Futbal, Tenis, Joga, Beh)'),
  isTournament: z
    .boolean()
    .describe(
      'True ak ide o turnaj/súťaž, False ak ide o tréning alebo rekreačnú lekciu',
    ),
  isGroupClass: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'True ak ide o opakovanú skupinovú lekciu/tréning na tom istom športovisku v obvykle rovnakom čase',
    ),
  startTime: z
    .string()
    .describe(
      'Dátum a čas začiatku vo formáte ISO 8601 string (napr. 2026-08-15T09:00:00Z)',
    ),
  endTime: z
    .string()
    .optional()
    .nullable()
    .describe('Dátum a čas konca ak je uvedený'),
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
  forKids: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'True len ak je aktivita vyslovene pre deti (pre deti, detský, Kidstown, mini, U6–U12). Nie junior/ITF do 18.',
    ),
  forWomen: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'True len ak je aktivita vyslovene pre ženy (pre ženy, ladies only, W4W, dámsky). Nie mix ženy+muži.',
    ),
});

export type ScrapedEvent = z.infer<typeof ScrapedEventSchema>;

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
              'True ak ide o turnaj/súťaž, False ak ide o tréning alebo rekreačnú lekciu',
          },
          isGroupClass: {
            type: 'boolean',
            description:
              'True ak ide o opakovanú skupinovú lekciu/tréning na tom istom športovisku v obvykle rovnakom čase',
          },
          startTime: {
            type: 'string',
            description:
              'Dátum a čas začiatku vo formáte ISO 8601 string (napr. 2026-08-15T09:00:00Z)',
          },
          endTime: {
            type: 'string',
            nullable: true,
            description: 'Dátum a čas konca ak je uvedený',
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
            description:
              'Priama URL adresa zdroja/rezervačného systému',
          },
          forKids: {
            type: 'boolean',
            description:
              'True len ak je aktivita vyslovene pre deti (pre deti, detský, Kidstown, mini, U6–U12). Nie junior/ITF do 18.',
          },
          forWomen: {
            type: 'boolean',
            description:
              'True len ak je aktivita vyslovene pre ženy (pre ženy, ladies only, W4W, dámsky). Nie mix ženy+muži.',
          },
        },
        required: [
          'title',
          'sportType',
          'isTournament',
          'isGroupClass',
          'startTime',
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
