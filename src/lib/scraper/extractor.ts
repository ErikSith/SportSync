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
import { isListingNoise } from '@/lib/feed/group-class';

/**
 * gemini-2.0-flash was shut down 2026-06-01. gemini-flash-latest currently
 * aliases gemini-3.7-flash (Free Tier ~20 RPD). Pin a stable high-throughput
 * Flash instead — never rolling "-latest" aliases.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';

export const GEMINI_MODEL_FALLBACKS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
] as const;

/** Newest Flash aliases with tight Free-Tier daily caps — never auto-select. */
const BLOCKED_GEMINI_MODELS = new Set([
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-flash-lite-latest',
]);

const QUOTA_RETRY_BASE_MS = 10_000;
const MAX_MODEL_ATTEMPTS = 3;
const MAX_LOOP_ITERATIONS = 500;

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
          isGroupClass: { type: SchemaType.BOOLEAN },
          startTime: { type: SchemaType.STRING },
          endTime: { type: SchemaType.STRING },
          locationName: { type: SchemaType.STRING },
          priceText: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          originalUrl: { type: SchemaType.STRING },
          forKids: { type: SchemaType.BOOLEAN },
          forWomen: { type: SchemaType.BOOLEAN },
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
- Ignoruj marketing, navigáciu, cookies, footer, opakujúce sa menu.
- NEEXTRAHUJ cenníky prenájmu kurtov/ihrísk, otváracie hodiny, „objednajte si kurt“,
  ani časové pásma cien (Pondelok–Piatok 07:00–14:00 = cenník, nie event).
- Ak stránka obsahuje TÝŽDENNÝ ROZVRH (Pondelok/Utorok/... alebo Po/Ut/... + čas + názov AKTIVITY),
  vygeneruj konkrétne lekcie na najbližších 7 dní od kotevného dátumu vyššie. Každý slot = 1 záznam so startTime v ISO 8601.
  Tieto sloty sú SKUPINOVÉ LEKCIE (isGroupClass = true, isTournament = false) — nie unikátne eventy.
- KLASIFIKÁCIA (povinná pri každom zázname):
  • isTournament = true: jednorazový turnaj/súťaž s otvorenou prihláškou (cup, championship, open, trophy, kvalifikácia).
    NIE ligový zápas „Tím A vs Tím B“ / „proti“ — to je divácky zápas (isTournament = false).
  • isGroupClass = true: niečo, čo sa STÁLE OPAKUJE na tom istom športovisku v obvykle rovnakom čase
    (týždenný rozvrh, akademia, náborové tréningy, footwork, joga, HIIT, skupinové cvičenie, online tréningový program).
  • isGroupClass = false a isTournament = false: jednorazový event s vlastným názvom
    (workshop, exhibícia, otvorenie, koncert, zápas A vs B na sledovanie).
- Unikátny EVENT/turnaj = jednorazové podujatie s vlastným názvom (cup, open, marathon, workshop, zápas).
- Bežný názov lekcie (Pilates, HIIT, Box, Yoga, Kickbox, footwork, nábor, akademia…) = skupinová lekcia, nie unikátny event.
- Ak sú uvedené konkrétne dátumy (deň.mesiac.rok / ISO), použi ich.
- startTime (a endTime) musia byť ISO 8601 s offsetom Bratislavy (+02:00 alebo +01:00).
- locationName ber len z hlavného obsahu (adresa / názov športoviska pri udalosti), nie z menu ani footera.
- originalUrl MUSÍ byť platná absolútna http(s) URL: použi priamy rezervačný/registračný odkaz
  (rezervácia, booking, prihláška, lístky), ak je na stránke uvedený. Inak použi: ${pageUrl}
- Nikdy nevymýšľaj URL. originalUrl musí patriť organizátorovi / rezervačnému systému.
- description max 2 krátke vety; priceText len ak je cena uvedená.
- forKids = true LEN keď je aktivita VYSLOVENE pre deti: „pre deti“, detský/detská, Kidstown, detské plávanie, mini tenis, U6–U12, bábätká, rodič + dieťa.
  NIE junior/mládež/ITF do 18 rokov. NIE bežný dospelácky tréning len preto, že deti môžu prísť.
- forWomen = true LEN keď je aktivita VYSLOVENE pre ženy: „pre ženy“, ladies only, W4W, dámsky, ženský turnaj.
  NIE mix „ženy a muži“, NIE open kategória kde hrajú obe pohlavia.
- isTournament = true LEN pre turnaje, do ktorých sa hráč prihlasuje (cup, open, championship, trophy, kvalifikácia).
  Tieto záznamy idú do tabuľky Tournament (nie Event).
- Zápas v tvare „klub vs klub“ / „X proti Y“ (napr. FK Inter vs FC Petržalka) NIE JE turnaj s prihláškou:
  isTournament = false, divák ide Sledovať, nie Pripojiť sa.
- isTournament = false pre tréningy, lekcie, ligové zápasy A vs B a týždenný rozvrh.
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
    /Too Many Requests/i.test(msg) ||
    /RESOURCE_EXHAUSTED/i.test(msg)
  );
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    isQuotaError(err) ||
    /\b503\b/.test(msg) ||
    /\b500\b/.test(msg) ||
    /high demand/i.test(msg) ||
    /overloaded/i.test(msg) ||
    /try again later/i.test(msg) ||
    /UNAVAILABLE/i.test(msg)
  );
}

function resolveModelCandidates(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const ordered = [preferred, ...GEMINI_MODEL_FALLBACKS];
  const unique = [...new Set(ordered.filter(Boolean))];
  const allowed = unique.filter((name) => !BLOCKED_GEMINI_MODELS.has(name));
  if (allowed.length === 0) return [DEFAULT_GEMINI_MODEL];
  return allowed;
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
  let modelPasses = 0;

  for (const modelName of candidates) {
    if (++modelPasses > MAX_LOOP_ITERATIONS) {
      console.warn('[scraper.extractor] model candidate loop safety break');
      break;
    }
    let attempt = 0;
    while (attempt < MAX_MODEL_ATTEMPTS) {
      if (++attempt > MAX_LOOP_ITERATIONS) {
        console.warn('[scraper.extractor] model retry loop safety break');
        break;
      }
      try {
        const model = getModel(genAI, modelName, systemInstruction);
        const result = await model.generateContent(userPrompt);
        const raw = result.response.text();
        if (modelName !== candidates[0] || attempt > 1) {
          console.warn(
            `[scraper.extractor] using ${modelName} (attempt ${attempt})`,
          );
        }
        return { raw, model: modelName };
      } catch (err) {
        lastError = err;

        // 429 / quota / RESOURCE_EXHAUSTED: retry the same model, never switch.
        if (isQuotaError(err)) {
          if (attempt < MAX_MODEL_ATTEMPTS) {
            const waitMs = QUOTA_RETRY_BASE_MS * 2 ** (attempt - 1);
            console.warn(
              `[scraper.extractor] ${modelName} quota/429 (${attempt}/${MAX_MODEL_ATTEMPTS}) — retry in ${waitMs}ms`,
            );
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue;
          }
          console.warn(
            `[scraper.extractor] ${modelName} quota exhausted after ${MAX_MODEL_ATTEMPTS} attempts — not switching models`,
          );
          throw err instanceof Error
            ? err
            : new Error(`Gemini quota exhausted: ${String(err)}`);
        }

        if (isTransientError(err) && attempt < MAX_MODEL_ATTEMPTS) {
          const waitMs = 4000 * 2 ** (attempt - 1);
          console.warn(
            `[scraper.extractor] ${modelName} busy (${attempt}/${MAX_MODEL_ATTEMPTS}) — retry in ${waitMs}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        // 404 / retired model only — try the next quality Flash alias.
        if (isModelUnavailableError(err)) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(
            `[scraper.extractor] model ${modelName} unavailable (${msg.slice(0, 160)}) — trying next`,
          );
          break;
        }

        throw err;
      }
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
      if (!Number.isFinite(t) || t < now || e.title.length < 3) return false;
      return !isListingNoise({
        title: e.title,
        description: e.description,
        sourceUrl: e.originalUrl,
        ticketUrl: pageUrl,
      });
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
        isGroupClass: row.isGroupClass === true || row.isGroupClass === 'true',
        forKids: row.forKids === true || row.forKids === 'true',
        forWomen: row.forWomen === true || row.forWomen === 'true',
      };
    }),
  };
}
