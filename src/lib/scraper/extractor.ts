import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerativeModel,
  type ResponseSchema,
} from '@google/generative-ai';
import {
  ScrapedEventListSchema,
  type ScrapedEvent,
} from './types';

/**
 * Prefer Gemini 1.5 Flash as specified; fall back to rolling Flash aliases
 * when 1.5 is retired or 404s on the current API key.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';

export const GEMINI_MODEL_FALLBACKS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
] as const;

/** Mirrors ScrapedEventListSchema for Gemini structured output. */
const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    events: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          sportType: { type: SchemaType.STRING },
          isTournament: { type: SchemaType.BOOLEAN },
          startTime: { type: SchemaType.STRING },
          endTime: { type: SchemaType.STRING },
          locationName: { type: SchemaType.STRING },
          priceText: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          originalUrl: { type: SchemaType.STRING },
        },
        required: [
          'title',
          'sportType',
          'isTournament',
          'startTime',
          'locationName',
          'originalUrl',
        ],
      },
    },
  },
  required: ['events'],
};

function getApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    '';
  if (!key) {
    throw new Error(
      'Missing GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY). Get a free key at https://aistudio.google.com/apikey',
    );
  }
  return key;
}

/** Human-readable Bratislava calendar anchor for relative-date resolution. */
function formatBratislavaAnchorDate(now = new Date()): string {
  return now.toLocaleDateString('sk-SK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Bratislava',
  });
}

/**
 * System prompt: rules + live Bratislava date/weekday so Gemini resolves
 * "zajtra" / weekday schedules against a fixed kotva, not a guessed "today".
 */
function buildSystemInstruction(pageUrl: string): string {
  const now = new Date();
  const todayFormatted = formatBratislavaAnchorDate(now);

  return `Si extraktor športových podujatí pre Bratislavu (SportSync).
Z čistého textu webovej stránky (iba hlavný obsah) vyber športové udalosti, turnaje, otvorené tréningy a lekcie.

Si nekompromisný a presný dátový analytik pre športovú aplikáciu v Bratislave.
AKTUÁLNY DNEŠNÝ DÁTUM JE: ${todayFormatted}.

PRAVIDLÁ PRE EXTRAKCIU:
1. Ak stránka uvádza relatívne dátumy ('Dnes', 'Zajtra', 'Tento piatok'), dopočítaj presný kalendárny dátum podľa dnešného dátumu (${todayFormatted}).
2. Čas začiatku (startTime) extrahuj LEN vtedy, ak jednoznačne patrí k danej udalosti/turnaju. Nezmiešaj ho s otváracími hodinami recepcie ani pätky!
3. Ak na stránke nie je explicitne uvedený čas alebo dátum konania, akciu NEEXTRAHUJ (preskoč ju).
4. Miesto konania (locationName) musí byť presný názov športoviska alebo adresa uvedená priamo pri danej akcii.

Pravidlá:
- Ignoruj marketing, navigáciu, cookies, footer, opakujúce sa menu, cenníky bez času.
- Ak stránka obsahuje TÝŽDENNÝ ROZVRH (Pondelok/Utorok/... alebo Po/Ut/... + čas + názov aktivity),
  vygeneruj konkrétne lekcie na najbližších 7 dní od kotevného dátumu vyššie. Každý slot = 1 event so startTime v ISO 8601.
  Tieto sloty sú SKUPINOVÉ CVIČENIA na športovisku (nie unikátne eventy) — isTournament = false.
- Unikátny EVENT/turnaj = jednorazové podujatie s vlastným názvom (cup, open, marathon, workshop, zápas).
- Bežný názov lekcie (Pilates, HIIT, Box, Yoga, Kickbox…) = skupinová lekcia, nie unikátny event.
- Ak sú uvedené konkrétne dátumy (deň.mesiac.rok / ISO), použi ich.
- startTime (a endTime) musia byť ISO 8601 s offsetom Bratislavy (+02:00 alebo +01:00).
- locationName ber len z hlavného obsahu (adresa / názov športoviska pri udalosti), nie z menu ani footera.
- originalUrl MUSÍ byť platná absolútna http(s) URL: použi priamy rezervačný/registračný odkaz
  (rezervácia, booking, prihláška, lístky), ak je na stránke uvedený. Inak použi: ${pageUrl}
- Nikdy nevymýšľaj URL. originalUrl musí patriť organizátorovi / rezervačnému systému.
- description max 2 krátke vety; priceText len ak je cena uvedená.
- isTournament = true pre turnaje, súťaže, championshipy, cup, open (turnaj), liga, trophy, kvalifikáciu.
  Tieto záznamy idú do tabuľky Tournament (nie Event).
- isTournament = false pre tréningy, lekcie, rekreačné zápasy a týždenný rozvrh.
- Ak na stránke naozaj nie sú žiadne časy ani dátumy aktivít, vráť prázdne pole events.`;
}

function buildUserPrompt(pageUrl: string, cleanText: string): string {
  return `URL zdroja: ${pageUrl}

TEXT STRÁNKY (iba hlavný obsah):
---
${cleanText}
---`;
}

function isModelUnavailableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /\b404\b/.test(msg) ||
    /no longer available/i.test(msg) ||
    /not found/i.test(msg) ||
    /is not found for API version/i.test(msg)
  );
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /\b429\b/.test(msg) ||
    /quota/i.test(msg) ||
    /rate.?limit/i.test(msg) ||
    /Too Many Requests/i.test(msg)
  );
}

function resolveModelCandidates(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const ordered = preferred
    ? [preferred, ...GEMINI_MODEL_FALLBACKS]
    : [...GEMINI_MODEL_FALLBACKS];
  return [...new Set(ordered.filter(Boolean))];
}

function getModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  systemInstruction: string,
): GenerativeModel {
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });
}

async function generateWithFallback(
  genAI: GoogleGenerativeAI,
  systemInstruction: string,
  userPrompt: string,
): Promise<{ raw: string; model: string }> {
  const candidates = resolveModelCandidates();
  let lastError: unknown;

  for (const modelName of candidates) {
    try {
      const model = getModel(genAI, modelName, systemInstruction);
      const result = await model.generateContent(userPrompt);
      const raw = result.response.text();
      if (modelName !== candidates[0]) {
        console.warn(`[scraper.extractor] fell back to model ${modelName}`);
      }
      return { raw, model: modelName };
    } catch (err) {
      lastError = err;
      if (isModelUnavailableError(err) || isQuotaError(err)) {
        console.warn(
          `[scraper.extractor] model ${modelName} unavailable/quota — trying next`,
        );
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`All Gemini models failed: ${String(lastError)}`);
}

/**
 * Extract structured sports events from clean page text via Gemini Flash
 * (JSON schema responseMode) and validate with Zod.
 */
export async function extractEventsFromText(
  pageUrl: string,
  cleanText: string,
): Promise<ScrapedEvent[]> {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const { raw } = await generateWithFallback(
    genAI,
    buildSystemInstruction(pageUrl),
    buildUserPrompt(pageUrl, cleanText),
  );

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error(`Gemini returned non-JSON for ${pageUrl}: ${raw.slice(0, 200)}`);
  }

  const coerced = coerceOriginalUrls(parsedJson, pageUrl);
  const validated = ScrapedEventListSchema.safeParse(coerced);
  if (!validated.success) {
    throw new Error(
      `Zod validation failed for ${pageUrl}: ${validated.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }

  const now = Date.now() - 60 * 60 * 1000;
  return validated.data.events
    .map((e) => ({
      ...e,
      title: e.title.trim(),
      sportType: e.sportType.trim(),
      locationName: e.locationName.trim(),
      originalUrl: absoluteHttpUrl(e.originalUrl, pageUrl),
      description: e.description?.trim() || null,
      priceText: e.priceText?.trim() || null,
      endTime: e.endTime?.trim() || null,
    }))
    .filter((e) => {
      const t = Date.parse(e.startTime);
      return Number.isFinite(t) && t >= now && e.title.length >= 3;
    });
}

function absoluteHttpUrl(value: string | null | undefined, fallback: string): string {
  const candidate = (value ?? '').trim() || fallback;
  try {
    const resolved = new URL(candidate, fallback);
    if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
      return resolved.toString();
    }
  } catch {
    // fall through
  }
  return fallback;
}

/** Gemini sometimes returns relative paths — coerce to absolute URLs before Zod `.url()`. */
function coerceOriginalUrls(parsed: unknown, pageUrl: string): unknown {
  if (!parsed || typeof parsed !== 'object' || !('events' in parsed)) return parsed;
  const events = (parsed as { events: unknown }).events;
  if (!Array.isArray(events)) return parsed;
  return {
    ...parsed,
    events: events.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const row = item as Record<string, unknown>;
      return {
        ...row,
        originalUrl: absoluteHttpUrl(
          typeof row.originalUrl === 'string' ? row.originalUrl : null,
          pageUrl,
        ),
      };
    }),
  };
}
