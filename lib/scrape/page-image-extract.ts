/**
 * When listing copy is sparse but posters/flyers carry the schedule text,
 * pull candidate images from main content and run Gemini vision → ScrapedEvent[].
 *
 * Skips tiny logos and stock card thumbnails that already have detail links.
 */
import * as cheerio from 'cheerio';
import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from '@google/generative-ai';
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_FALLBACKS,
} from '@/src/lib/scraper/extractor';
import { groundScrapedEventDates } from '@/src/lib/scraper/ground-dates';
import {
  SCRAPER_USER_AGENT,
  HOST_DELAY_MS,
  sleep,
} from '@/src/lib/scraper/fetcher';
import {
  ScrapedEventListSchema,
  type ScrapedEvent,
} from '@/src/lib/scraper/types';
import { truncateHtmlForParse } from '@/lib/scrape/fetch';

const BLOCKED = new Set([
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-flash-lite-latest',
]);

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MIN_IMAGE_BYTES = 8_000;

const LOGO_NOISE =
  /logo|icon|sprite|favicon|pixel|tracking|avatar|badge|button|arrow|social|facebook|instagram|whatsapp/i;

const POSTER_HINT =
  /plagat|plag[aá]t|poster|flyer|rozvrh|schedule|program|tabula|harmonogram|cenik|cenn[ií]k|podujat/i;

export type ListingImageCandidate = {
  url: string;
  alt: string;
  score: number;
};

function getApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    '';
  if (!key) {
    throw new Error('Missing GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY).');
  }
  return key;
}

function modelCandidates(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const ordered = [preferred, ...GEMINI_MODEL_FALLBACKS];
  return [...new Set(ordered.filter((n) => n && !BLOCKED.has(n)))];
}

function absoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function randomDelay(): number {
  return (
    HOST_DELAY_MS.min +
    Math.floor(Math.random() * (HOST_DELAY_MS.max - HOST_DELAY_MS.min + 1))
  );
}

/**
 * Score images likely to be posters / schedules (not card stock photos).
 */
export function collectListingImages(
  html: string,
  pageUrl: string,
  opts?: { excludeUrls?: Set<string> },
): ListingImageCandidate[] {
  const $ = cheerio.load(truncateHtmlForParse(html));
  const out: ListingImageCandidate[] = [];
  const seen = new Set<string>();

  const roots = $('main img, [role="main"] img, article img, .page-content img, .entry-content img');
  const nodes = roots.length > 0 ? roots : $('img');

  nodes.each((_, el) => {
    const src =
      ($(el).attr('src') ||
        $(el).attr('data-src') ||
        $(el).attr('data-lazy-src') ||
        '')
        .trim();
    if (!src || src.startsWith('data:')) return;
    const abs = absoluteUrl(src, pageUrl);
    if (!abs || seen.has(abs)) return;
    if (LOGO_NOISE.test(abs)) return;
    if (opts?.excludeUrls?.has(abs)) return;

    const alt = ($(el).attr('alt') || '').trim();
    const w = Number($(el).attr('width') || 0);
    const h = Number($(el).attr('height') || 0);
    let score = 0;
    if (POSTER_HINT.test(abs) || POSTER_HINT.test(alt)) score += 40;
    if (w >= 400 || h >= 400) score += 15;
    if (w >= 800 || h >= 800) score += 15;
    // Wide posters / schedule boards
    if (w > 0 && h > 0 && w / h > 1.2) score += 5;
    // Prefer images not wrapped only as card thumbs inside short anchors
    const inLink = $(el).closest('a[href]').attr('href');
    if (inLink) {
      try {
        const linkPath = new URL(inLink, pageUrl).pathname;
        // Card thumb pointing at a sibling detail — lower priority (text path prefers details)
        if (linkPath.split('/').filter(Boolean).length >= 2) score -= 10;
      } catch {
        /* ignore */
      }
    }
    // Empty alt + large = often a flyer; tiny named alt = decorative
    if (!alt && (w >= 500 || h >= 500)) score += 10;
    if (alt && alt.length < 40 && /unsplash|pexels|stock/i.test(abs)) score -= 20;

    if (score < 10) return;
    seen.add(abs);
    out.push({ url: abs, alt, score });
  });

  return out.sort((a, b) => b.score - a.score).slice(0, MAX_IMAGES);
}

async function fetchImageBytes(
  url: string,
): Promise<{ bytes: Buffer; mimeType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': SCRAPER_USER_AGENT,
        Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
      },
    });
    if (!res.ok) return null;
    const mime = (res.headers.get('content-type') || 'image/jpeg')
      .split(';')[0]!
      .trim()
      .toLowerCase();
    if (!/^image\/(jpeg|jpg|png|webp|gif|avif)$/.test(mime)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_IMAGE_BYTES || buf.length > MAX_IMAGE_BYTES) return null;
    return {
      bytes: buf,
      mimeType: mime === 'image/jpg' ? 'image/jpeg' : mime === 'image/avif' ? 'image/png' : mime,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const VISION_SCHEMA: ResponseSchema = {
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
          isCamp: { type: SchemaType.BOOLEAN },
          isWorkshop: { type: SchemaType.BOOLEAN },
          isCourse: { type: SchemaType.BOOLEAN },
          isForWomenOnly: { type: SchemaType.BOOLEAN },
          isForKids: { type: SchemaType.BOOLEAN },
          ageCategory: { type: SchemaType.STRING },
          startTime: { type: SchemaType.STRING },
          timeKnown: { type: SchemaType.BOOLEAN },
          endTime: { type: SchemaType.STRING },
          locationName: { type: SchemaType.STRING },
          city: { type: SchemaType.STRING },
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

function visionSystem(pageUrl: string): string {
  return `Si SportSync scraper. Z plagátu / rozvrhu / flyer fotky vytiahni športové eventy, turnaje, krúžky, kurzy alebo tábory.

Pravidlá:
- Vráť JSON { "events": [...] } podľa schémy.
- Každá položka = jedna udalosť / krúžok / turnaj / tábor.
- startTime/endTime = ISO 8601 s Bratislava offsetom (+02:00 alebo +01:00).
- Ak je len dátum bez HH:MM → timeKnown=false a použij 12:00.
- Viacdňový rozsah (5.–9. / Od … do …) → startTime prvý deň, endTime posledný.
- isCamp = tábor/kemp; isCourse = viactýždňový kurz; isGroupClass = týždenný krúžok/lekcia; isTournament = open turnaj.
- isForKids = true pre deti/mládež/krúžky.
- originalUrl = ${pageUrl} (zdrojová stránka).
- Ignoruj logá sponzorov. Ak na obrázku nie sú žiadne termíny/udalosti, vráť events: [].
Dnes: ${new Date().toISOString().slice(0, 10)}.`;
}

async function extractEventsFromImageBytes(input: {
  bytes: Buffer;
  mimeType: string;
  pageUrl: string;
}): Promise<ScrapedEvent[]> {
  const genAI = new GoogleGenerativeAI(getApiKey());
  let lastError: unknown;

  for (const modelName of modelCandidates()) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: visionSystem(input.pageUrl),
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: VISION_SCHEMA,
        },
      });

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: input.mimeType,
            data: input.bytes.toString('base64'),
          },
        },
        {
          text: `Extract sports events / clubs / camps from this image. Page: ${input.pageUrl}`,
        },
      ]);

      const raw = result.response.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error('Gemini vision returned non-JSON');
      }
      const validated = ScrapedEventListSchema.safeParse(parsed);
      if (!validated.success) {
        throw new Error(
          `Vision Zod failed: ${validated.error.issues
            .slice(0, 3)
            .map((i) => i.message)
            .join('; ')}`,
        );
      }
      return validated.data.events.map((e) => ({
        ...e,
        originalUrl: e.originalUrl || input.pageUrl,
      }));
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/404|not found|not supported|invalid/i.test(msg)) continue;
      console.warn(`[page-image-extract] model ${modelName}:`, msg.slice(0, 200));
    }
  }

  console.warn(
    '[page-image-extract] all models failed:',
    lastError instanceof Error ? lastError.message : lastError,
  );
  return [];
}

/**
 * Fetch top listing images and vision-extract events. Polite sequential fetches.
 */
export async function extractEventsFromPageImages(input: {
  html: string;
  pageUrl: string;
  maxImages?: number;
}): Promise<{ events: ScrapedEvent[]; imagesTried: number; message?: string }> {
  const candidates = collectListingImages(input.html, input.pageUrl).slice(
    0,
    input.maxImages ?? MAX_IMAGES,
  );
  if (candidates.length === 0) {
    return { events: [], imagesTried: 0, message: 'No poster-like images' };
  }

  const all: ScrapedEvent[] = [];
  const seenTitle = new Set<string>();
  let tried = 0;

  for (const img of candidates) {
    if (tried > 0) await sleep(randomDelay());
    tried += 1;
    const fetched = await fetchImageBytes(img.url);
    if (!fetched) continue;

    const events = await extractEventsFromImageBytes({
      bytes: fetched.bytes,
      mimeType: fetched.mimeType,
      pageUrl: input.pageUrl,
    });
    for (const e of events) {
      const key = e.title.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!key || seenTitle.has(key)) continue;
      seenTitle.add(key);
      all.push(e);
    }
  }

  const grounded = groundScrapedEventDates(
    all.map((e) => `${e.title} ${e.description ?? ''}`).join('\n'),
    all,
  );

  return {
    events: grounded,
    imagesTried: tried,
    message:
      grounded.length > 0
        ? `vision:events=${grounded.length};images=${tried}`
        : `vision:0;images=${tried}`,
  };
}

/** True when page text is too thin to trust text-only Gemini. */
export function listingTextLooksSparse(cleanText: string): boolean {
  const compact = cleanText.replace(/\s+/g, ' ').trim();
  if (compact.length < 500) return true;
  // Many short titles, almost no dates → card grid
  const dateHits = compact.match(/\d{1,2}\.\s*\d{1,2}\.\s*\d{4}|\d{1,2}\.\s*[a-záäčďéíľĺňóôŕšťúýž]+\s*\d{4}/gi);
  return !dateHits || dateHits.length === 0;
}
