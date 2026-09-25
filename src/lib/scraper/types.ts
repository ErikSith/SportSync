import { z } from 'zod';

/**
 * Six mutually exclusive listing categories — 1:1 with homepage Rýchle akcie tiles.
 * This is the exact column the scraper writes so each listing lands in the right hub group.
 */
export const EventCategoryEnum = z.enum([
  'PODUJATIE', // Eventy — /events
  'SKUPINOVE_CVICENIE', // Skupinové cvičenia — /skupinove-cvicenia
  'TURNAJ', // Turnaje — /tournaments
  'WORKSHOP', // Workshopy — /workshopy
  'DETSKY_TABOR', // Tábory — /tabory
  'DETSKY_KRUZOK', // Krúžky — /kruzky
]);

export type EventCategory = z.infer<typeof EventCategoryEnum>;

export const ScrapedEventSchema = z.object({
  title: z
    .string()
    .describe('Presný názov akcie. IBA názov, žiadne vety navyše.'),
  sportType: z
    .string()
    .describe(
      'Konkrétny druh športu (Padel, Futbal, Tenis, Joga, Plávanie). ' +
        "ZAKÁZANÉ: 'Šport', 'Event', názov klubu, mesto, doprava.",
    ),

  // HLAVNÁ KATEGORIZÁCIA = kolónka pre 6 skupín Rýchle akcie (1:1). Gemini povinné; adapters sync doplní.
  category: EventCategoryEnum.optional().describe(
    'Presná kolónka hubu: PODUJATIE=Eventy, TURNAJ=Turnaje, SKUPINOVE_CVICENIE=Skupinové cvičenia, ' +
      'WORKSHOP=Workshopy, DETSKY_TABOR=Tábory, DETSKY_KRUZOK=Krúžky. Práve jedna hodnota.',
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
      "Vekové obmedzenie LEN ak je explicitne na stránke (napr. 'U12', '6-10 rokov', 'Dospelí'). " +
        "ZAKÁZANÉ: 'pre všetkých', vymyslený vek, text z dopravy/cenníka.",
    ),

  // OCHRANA PRED HALUCINÁCIAMI V ČASE
  startTime: z
    .string()
    .describe(
      "Presný dátum a čas začiatku v ISO 8601 (napr. 2026-08-15T09:00:00+02:00). " +
        "Čas zapisuj LEN ak jednoznačne patrí k udalosti. " +
        "EXPLICITNE ZAKÁZANÉ: otváracie hodiny („Otvorené od 8:00“), cenníkové pásma, čas cesty/dopravy. " +
        'Ak chýba HH:MM pri udalosti, použi 12:00 a timeKnown=false — nikdy nevymýšľaj iný čas.',
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
      'Presný dátum a čas konca v ISO 8601. Ak nie je jasne uvedený, vráť null. ' +
        'Pri viacdňovom festivale/tábore (5.–9. novembra) nastav posledný deň.',
    ),
  // OCHRANA PRED NEZMYSLAMI (Doprava, Parkovanie)
  locationName: z
    .string()
    .describe(
      "IBA presný názov športoviska alebo fyzická adresa (napr. 'NTC Aréna' alebo 'Kalinčiakova 12'). " +
        "EXPLICITNE ZAKÁZANÉ: Nesmieš sem zapisovať inštrukcie o doprave, čas cesty (napr. 'doprava 15min'), " +
        'informácie o parkovaní, MHD, GPS súradnice ani navigačné tipy!',
    ),
  city: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Mesto konania (Bratislava, …) — len ak je explicitne pri udalosti. ' +
        'ZAKÁZANÉ: ulica, doprava, parkovanie, „Slovensko“.',
    ),
  priceText: z
    .string()
    .optional()
    .nullable()
    .describe(
      "IBA samotná cena alebo 'Zadarmo' (napr. '15 €'). Nekopíruj celé vety o platobných podmienkach ani cenník prenájmu.",
    ),
  description: z
    .string()
    .optional()
    .nullable()
    .describe(
      'Stručný výťah pravidiel alebo programu (max 2 vety). Ak ide len o reklamný balast, vráť null. ' +
        'NEPÍŠ sem dopravu, parkovanie ani otváracie hodiny.',
    ),

  /**
   * Priama URL detailu podujatia (po prekliknutí z listingu).
   * Preferovaná pred originalUrl; normalize ju skopíruje do originalUrl.
   */
  detailUrl: z
    .string()
    .url()
    .optional()
    .describe(
      'Priama http(s) URL detailu podujatia. ZAKÁZANÉ: vymyslené URL, mailto:, sociálne siete.',
    ),
  /** Canonical source / booking URL used by upsert (filled from detailUrl when present). */
  originalUrl: z
    .string()
    .url()
    .describe(
      'Priama http(s) URL zdroja/rezervácie. ZAKÁZANÉ: vymyslené URL, mailto:, facebook/instagram.',
    ),
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
            description: 'Presný názov akcie. IBA názov, žiadne vety navyše.',
          },
          sportType: {
            type: 'string',
            description:
              "Konkrétny šport (Padel, Futbal, Tenis, Joga). ZAKÁZANÉ: 'Šport', názov klubu, mesto.",
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
              'Kolónka Rýchle akcie (6 skupín): PODUJATIE=Eventy, TURNAJ=Turnaje, ' +
              'SKUPINOVE_CVICENIE=Skupinové cvičenia, WORKSHOP=Workshopy, ' +
              'DETSKY_TABOR=Tábory, DETSKY_KRUZOK=Krúžky. Práve jedna.',
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
              "Len explicitné 'U12' / '6-10 rokov'. ZAKÁZANÉ: 'pre všetkých', vymyslený vek.",
          },
          startTime: {
            type: 'string',
            description:
              'ISO 8601 začiatok udalosti. ZAKÁZANÉ: otváracie hodiny, cenníkové pásma, čas dopravy. ' +
              'Ak chýba HH:MM, použi 12:00 a timeKnown=false.',
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
              'ISO 8601 koniec. Ak nie je jasne uvedený, null. Pri viacdňovom rozsahu (5.–9. novembra) posledný deň.',
          },
          locationName: {
            type: 'string',
            description:
              "IBA názov športoviska alebo adresa (napr. 'NTC Aréna', 'Kalinčiakova 12'). " +
              "ZAKÁZANÉ: doprava, čas cesty ('doprava 15min'), parkovanie, MHD, navigačné tipy.",
          },
          city: {
            type: 'string',
            nullable: true,
            description:
              'Mesto pri udalosti. ZAKÁZANÉ: ulica, doprava, parkovanie, „Slovensko“.',
          },
          priceText: {
            type: 'string',
            nullable: true,
            description:
              "IBA cena alebo 'Zadarmo' (napr. '15 €'). Nekopíruj platobné podmienky ani €/hod prenájmu.",
          },
          description: {
            type: 'string',
            nullable: true,
            description:
              'Stručný výťah pravidiel/programu (max 2 vety). Reklamný balast → null. Bez dopravy/parkovania/otváracích hodín.',
          },
          detailUrl: {
            type: 'string',
            description:
              'Priama http(s) URL detailu. ZAKÁZANÉ: vymyslené URL, mailto:, sociálne siete.',
          },
          originalUrl: {
            type: 'string',
            description:
              'Priama http(s) URL zdroja/bookingu. ZAKÁZANÉ: vymyslené URL, mailto:, facebook/instagram.',
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
  /** New weekly / studio slots (Skupinové) — not Eventy one-offs. */
  groupClassesCreated: number;
  /** New unusual one-day / special happenings (Eventy). */
  specialEventsCreated: number;
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
