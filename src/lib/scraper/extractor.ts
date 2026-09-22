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
import { classifyListingAudience } from '@/lib/events/audience';
import {
  listingIsOutsideBratislava,
  pageContextIsOutsideBratislava,
} from '@/lib/cities';
import {
  activityToIsoEnd,
  activityToIsoStart,
  looksLikeAnnouncementCalendar,
  splitAnnouncementCalendar,
  type AnnouncementActivity,
} from './announcement-calendar';
import { groundScrapedEventDates } from './ground-dates';
import { applySourceEvidence } from './source-evidence';

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
          timeKnown: { type: SchemaType.BOOLEAN },
          endTime: { type: SchemaType.STRING },
          locationName: { type: SchemaType.STRING },
          city: { type: SchemaType.STRING },
          priceText: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          originalUrl: { type: SchemaType.STRING },
          isForWomenOnly: { type: SchemaType.BOOLEAN },
          isForKids: { type: SchemaType.BOOLEAN },
          ageCategory: { type: SchemaType.STRING },
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
   Ak je uvedený LEN dátum bez HH:MM (napr. „26.9. Rozlúčka so sezónou“), nastav timeKnown = false a startTime na 12:00 toho dňa (len kotva na zoradenie). NIKDY nevymýšľaj 09:00/10:00/14:00.
3. Ak na stránke nie je explicitne uvedený dátum konania, akciu NEEXTRAHUJ (preskoč ju).
4. timeKnown = true LEN pri explicitnom HH:MM pri aktivite. timeKnown = false pri samotnom dátume.

Pravidlá:
- Ignoruj marketing, navigáciu, cookies, footer, opakujúce sa menu.
- NEEXTRAHUJ cenníky prenájmu kurtov/ihrísk, otváracie hodiny, „objednajte si kurt“,
  ani časové pásma cien (Pondelok–Piatok 07:00–14:00 = cenník, nie event).
- Ak stránka obsahuje TÝŽDENNÝ ROZVRH (Pondelok/Utorok/... alebo Po/Ut/... + čas + názov AKTIVITY),
  vygeneruj konkrétne lekcie na najbližších 7 dní od kotevného dátumu vyššie. Každý slot = 1 záznam so startTime v ISO 8601.
  Tieto sloty sú SKUPINOVÉ LEKCIE (isGroupClass = true, isTournament = false) — nie unikátne eventy.
- Ak je na TEJ ISTEJ stránke aj rozvrh aj jednorazové akcie/turnaje, ROZDEĽ ich po položkách:
  opakujúce sa lekcie → isGroupClass = true; turnaje s prihláškou → isTournament = true;
  jednorazové workshopy/otvorenia → oboje false. Nikdy neoznač celú stránku jedným typom.
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
- Viacdňové festivaly/turnaje (napr. „5 novembra – 9 novembra“, „24.–25. 10.“, „5-9“):
  startTime = prvý deň, endTime = posledný deň. Jeden záznam na celé obdobie (nie karty po dňoch).
  Ak nie je HH:MM, timeKnown = false a oba časy na 12:00 toho dňa.
- startTime (a endTime) musia byť ISO 8601 s offsetom Bratislavy (+02:00 alebo +01:00).
- locationName ber len z hlavného obsahu (adresa / názov športoviska pri udalosti), nie z menu ani footera.
- city: mesto konania (Bratislava, Košice, Žilina, …). Ber LEN z riadku pri udalosti
  (napr. „Pripravujeme: 365 Grand Prix 2026, 24.-25.10.2026, Košice“ → city = Košice).
- SportSync je VÝHRADNE Bratislava: ak city / locationName / riadok s dátumom uvádza iné mesto
  (Košice, Žilina, Prešov, Banská Bystrica, Nitra, Trnava, …), udalosť NEEXTRAHUJ — aj keď
  stránka patrí bratislavskému športovisku (pobočka len oznamuje cudzí event).
- Past / „Udialo sa“ bez budúceho dátumu NEEXTRAHUJ.
- originalUrl MUSÍ byť platná absolútna http(s) URL: použi priamy rezervačný/registračný odkaz
  (rezervácia, booking, prihláška, lístky), ak je na stránke uvedený. Inak použi: ${pageUrl}
- Nikdy nevymýšľaj URL. originalUrl musí patriť organizátorovi / rezervačnému systému.
- description: 1–3 krátke vety s dôležitými faktami pre hráča (kategória, formát štvorhra/dvojhra, časové okno, prihláška). priceText len ak je cena uvedená.
- OZNÁMENIA / KALENDÁRE DÁTUMOV (vysoká recall — žiadny turnaj nesmie uniknúť):
  • Ak text obsahuje riadky typu „26.9. … turnaj … 9:30–12:30 a … turnaj … 13:00–18:00“,
    vytvor SAMOSTATNÝ záznam pre KAŽDÚ aktivitu s vlastným časom (ženy ≠ mužská štvorhra).
  • Názov vezmi z aktivity („Tenisový turnaj žien“), nie len zo série („Tenisová jeseň“).
  • Sériový nadpis môže byť v description; nikdy nezlučuj viac turnajov do jedného eventu.
  • Operačné veci bez hry (brigáda, stavanie haly, prázdniny, začiatok sezóny) NEEXTRAHUJ.
  • Kartu/teaser len s dátumom publikácie bez času turnaja NEEXTRAHUJ — choď podľa tela oznámenia.
- isForKids = true keď je aktivita pre deti, mládež, rodiny s deťmi alebo juniorov:
  „pre deti“, detský/detská, Kidstown, detské plávanie, mini tenis, U6–U14, bábätká, rodič + dieťa,
  juniori/juniorky, mládežnícky turnaj, rodinný deň s deťmi.
  NIE bežný dospelácky tréning len preto, že deti môžu prísť.
- isForWomenOnly = true LEN keď je aktivita VÝHRADNE pre ženy/dievčatá:
  „pre ženy“, ladies only, W4W, dámsky, ženský turnaj, Ladies Cup.
  NIE mix „ženy a muži“, NIE open kategória kde hrajú obe pohlavia.
- ageCategory: uveď len ak je vek explicitne na stránke (napr. „U12“, „6-10 rokov“, „Dospelí“); inak null.
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

function guessLocationName(cleanText: string, pageUrl: string): string {
  const fromText =
    cleanText.match(/Tenisov[aá]\s+[šs]kola\s+Advantage/i)?.[0] ||
    cleanText.match(/Advantage\s+Tenis\s+School/i)?.[0] ||
    cleanText.match(/Botanick[aá]\s+\d+/i)?.[0];
  if (fromText) return fromText.replace(/\s+/g, ' ').trim();
  try {
    return new URL(pageUrl).hostname.replace(/^www\./, '');
  } catch {
    return 'Bratislava';
  }
}

function bratislavaOffsetFor(isoLocalDate: string): string {
  // Rough DST: last Sunday Mar → last Sunday Oct ≈ CEST (+02).
  const m = isoLocalDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '+02:00';
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 3 || month > 10) return '+01:00';
  if (month > 3 && month < 10) return '+02:00';
  if (month === 3) return day >= 25 ? '+02:00' : '+01:00';
  return day >= 25 ? '+01:00' : '+02:00';
}

function activityToScrapedEvent(
  activity: AnnouncementActivity,
  pageUrl: string,
  locationName: string,
): ScrapedEvent {
  const dateKey = `${activity.year}-${String(activity.month).padStart(2, '0')}-${String(activity.day).padStart(2, '0')}`;
  const offset = bratislavaOffsetFor(dateKey);
  const audience = classifyListingAudience({
    title: activity.title,
    description: activity.description,
    sourceUrl: pageUrl,
    locationName,
    forKids: activity.isForKids,
    forWomen: activity.isForWomenOnly,
  });
  return {
    title: activity.title,
    sportType: activity.sportType,
    isTournament: activity.isTournament,
    isGroupClass: false,
    isForWomenOnly: audience.forWomen,
    isForKids: audience.forKids,
    ageCategory: null,
    startTime: activityToIsoStart(activity, offset),
    timeKnown: true,
    endTime: activityToIsoEnd(activity, offset),
    locationName,
    priceText: null,
    description: activity.description,
    originalUrl: pageUrl,
  };
}

function eventKey(e: Pick<ScrapedEvent, 'title' | 'startTime'>): string {
  const t = Date.parse(e.startTime);
  const hour = Number.isFinite(t) ? new Date(t).toISOString().slice(0, 13) : e.startTime;
  return `${hour}|${e.title.trim().toLowerCase()}`;
}

/**
 * High-recall merge: deterministic calendar activities first (date/time/sport),
 * then Gemini rows that do not collide — so nothing playable is dropped.
 */
function mergeCalendarAndGemini(
  calendar: ScrapedEvent[],
  gemini: ScrapedEvent[],
): ScrapedEvent[] {
  if (calendar.length === 0) return gemini;
  if (gemini.length === 0) return calendar;

  const seen = new Set(calendar.map(eventKey));
  const merged = [...calendar];
  for (const g of gemini) {
    const key = eventKey(g);
    if (seen.has(key)) continue;
    // Drop vague series teasers when calendar already split the same page.
    const title = g.title.trim().toLowerCase();
    const isSeriesTeaser =
      /jese[nň]|sezóna|sezona|prázdnin|aktualit/i.test(title) &&
      !/turnaj|cup|open|štvorhr|dvojhr/i.test(title);
    if (isSeriesTeaser) continue;
    seen.add(key);
    merged.push(g);
  }
  return merged;
}

function normalizeExtractedEvents(
  events: ScrapedEvent[],
  pageUrl: string,
  cleanText?: string,
  options?: { skipEvidence?: boolean },
): ScrapedEvent[] {
  const now = Date.now() - 60 * 60 * 1000;
  const withAudience = events
    .map((e) => {
      const base = {
        ...e,
        title: e.title.trim(),
        sportType: e.sportType.trim(),
        locationName: e.locationName.trim(),
        city: e.city?.trim() || null,
        originalUrl: absoluteHttpUrl(e.originalUrl, pageUrl),
        description: e.description?.trim() || null,
        priceText: e.priceText?.trim() || null,
        endTime: e.endTime?.trim() || null,
        ageCategory: e.ageCategory?.trim() || null,
        timeKnown: e.timeKnown !== false,
      };
      const audience = classifyListingAudience({
        title: base.title,
        description: base.description,
        sourceUrl: base.originalUrl,
        locationName: base.locationName,
        forKids: base.isForKids,
        forWomen: base.isForWomenOnly,
      });
      return {
        ...base,
        isForKids: audience.forKids,
        isForWomenOnly: audience.forWomen,
      };
    })
    .filter((e) => {
      const t = Date.parse(e.startTime);
      if (!Number.isFinite(t) || t < now || e.title.length < 3) return false;
      if (
        listingIsOutsideBratislava(
          e.title,
          e.city,
          e.locationName,
          e.description,
        ) ||
        pageContextIsOutsideBratislava(cleanText, e.title)
      ) {
        console.log(
          `[scraper] skip outside Bratislava: ${e.title}` +
            (e.city ? ` (${e.city})` : ''),
        );
        return false;
      }
      return !isListingNoise({
        title: e.title,
        description: e.description,
        sourceUrl: e.originalUrl,
        ticketUrl: pageUrl,
      });
    });

  const grounded = groundScrapedEventDates(cleanText ?? '', withAudience);
  if (options?.skipEvidence) return grounded;
  return applySourceEvidence(cleanText ?? '', grounded, pageUrl);
}

/**
 * Extract structured sports events from clean page text via Gemini Flash
 * (JSON schema responseMode) and validate with Zod.
 * Deterministic announcement-calendar split runs first for high recall.
 * When `listingHtml` is provided, follow matching detail URLs and ground
 * source evidence on the detail page text.
 */
export async function extractEventsFromText(
  pageUrl: string,
  cleanText: string,
  options?: { listingHtml?: string; maxDetails?: number },
): Promise<ScrapedEvent[]> {
  const locationName = guessLocationName(cleanText, pageUrl);
  const calendarEvents = splitAnnouncementCalendar(cleanText).map((a) =>
    activityToScrapedEvent(a, pageUrl, locationName),
  );

  const skipEvidence = Boolean(options?.listingHtml);

  // Prefer calendar-only when the page is clearly a dated announcement list
  // with playable slots — avoids Gemini collapsing „ženy + muži“ into one card.
  if (looksLikeAnnouncementCalendar(cleanText) && calendarEvents.length > 0) {
    const normalized = normalizeExtractedEvents(calendarEvents, pageUrl, cleanText, {
      skipEvidence,
    });
    if (!options?.listingHtml) return normalized;
    const { enrichScrapedEventsWithDetails } = await import('@/lib/scrape/detail-enrich');
    return enrichScrapedEventsWithDetails(
      normalized,
      pageUrl,
      cleanText,
      options.listingHtml,
      options.maxDetails,
    );
  }

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

  const geminiEvents = normalizeExtractedEvents(
    validated.data.events,
    pageUrl,
    cleanText,
    { skipEvidence },
  );
  const calendarNormalized = normalizeExtractedEvents(
    calendarEvents,
    pageUrl,
    cleanText,
    { skipEvidence },
  );
  const merged = mergeCalendarAndGemini(calendarNormalized, geminiEvents);
  if (!options?.listingHtml) return merged;

  const { enrichScrapedEventsWithDetails } = await import('@/lib/scrape/detail-enrich');
  return enrichScrapedEventsWithDetails(
    merged,
    pageUrl,
    cleanText,
    options.listingHtml,
    options.maxDetails,
  );
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
        timeKnown:
          row.timeKnown !== false &&
          row.timeKnown !== 'false' &&
          row.time_known !== false &&
          row.time_known !== 'false',
        isForKids:
          row.isForKids === true ||
          row.isForKids === 'true' ||
          row.forKids === true ||
          row.forKids === 'true',
        isForWomenOnly:
          row.isForWomenOnly === true ||
          row.isForWomenOnly === 'true' ||
          row.forWomen === true ||
          row.forWomen === 'true',
        ageCategory:
          typeof row.ageCategory === 'string' ? row.ageCategory : null,
      };
    }),
  };
}
