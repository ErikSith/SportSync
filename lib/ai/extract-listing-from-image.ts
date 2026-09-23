import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from '@google/generative-ai';
import { EVENT_SPORTS, detectEventSport, type EventSport } from '@/lib/constants/sports';
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_FALLBACKS,
} from '@/src/lib/scraper/extractor';
import {
  LISTING_KINDS,
  type ListingFromImage,
  type ListingKind,
} from '@/lib/ai/listing-from-image-types';

export type { ListingFromImage, ListingKind } from '@/lib/ai/listing-from-image-types';
export { LISTING_KINDS } from '@/lib/ai/listing-from-image-types';

const BLOCKED = new Set([
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-flash-lite-latest',
]);

const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    sport: { type: SchemaType.STRING },
    date: { type: SchemaType.STRING },
    time: { type: SchemaType.STRING },
    endDate: { type: SchemaType.STRING },
    endTime: { type: SchemaType.STRING },
    place: { type: SchemaType.STRING },
    price: { type: SchemaType.NUMBER },
    capacity: { type: SchemaType.INTEGER },
    link: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    kind: { type: SchemaType.STRING },
  },
  required: ['title', 'sport'],
};

function getApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    '';
  if (!key) {
    throw new Error(
      'Missing GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY).',
    );
  }
  return key;
}

function modelCandidates(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const ordered = [preferred, ...GEMINI_MODEL_FALLBACKS];
  return [...new Set(ordered.filter((n) => n && !BLOCKED.has(n)))];
}

const SPORT_LIST = EVENT_SPORTS.join(', ');

function systemPrompt(): string {
  return `Si asistent SportSync. Z fotky / plagátu / screenshotu športového eventu vytiahni údaje do listingu.

Pravidlá:
- title: krátky názov eventu (bez dátumu a ceny).
- sport: JEDEN z: ${SPORT_LIST}. Mapuj synonymá (tenis→TENNIS, joga→YOGA, thaibox→COMBAT, …). Ak nejasné → OTHER.
- date / endDate: YYYY-MM-DD. Ak je len jeden deň, endDate nechaj prázdne.
- time / endTime: 24h HH:MM. Ak čas chýba, nechaj prázdne.
- place: názov športoviska / adresa ak je na fotke.
- price: číslo v EUR (bez znaku €). Ak free/zadarmo → 0. Ak chýba → vynechaj.
- capacity: max. počet hráčov/miest ak je uvedené, inak vynechaj.
- link: URL ak je na plagáte (QR text, www…), inak prázdne.
- description: 1–3 vety zo textu na fotke (SK alebo EN podľa originálu).
- kind: event | tournament | camp | workshop | course
  (turnaj/cup/open → tournament; tábor/camp → camp; workshop/masterclass → workshop; kurz/krúžok/series → course; inak event).
- Ignoruj logá sponzorov a kontaktné telefóny v description.
- Vráť LEN JSON podľa schémy. Dnešný dátum ako kontext: ${new Date().toISOString().slice(0, 10)}.`;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function normalizeDate(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]!.padStart(2, '0')}-${dmy[1]!.padStart(2, '0')}`;
  }
  return '';
}

function normalizeTime(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  return `${m[1]!.padStart(2, '0')}:${m[2]}`;
}

function normalizeSport(raw: string): EventSport {
  const upper = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if ((EVENT_SPORTS as readonly string[]).includes(upper)) {
    return upper as EventSport;
  }
  return detectEventSport(raw, 'OTHER');
}

function normalizeKind(raw: string): ListingKind {
  const k = raw.trim().toLowerCase();
  if ((LISTING_KINDS as readonly string[]).includes(k)) {
    return k as ListingKind;
  }
  if (/turnaj|tournament|cup|open\b|bracket/i.test(k)) return 'tournament';
  if (/t[aá]bor|camp/i.test(k)) return 'camp';
  if (/workshop|masterclass|semin[aá]r/i.test(k)) return 'workshop';
  if (/kurz|kr[uú][zž]ok|course|series/i.test(k)) return 'course';
  return 'event';
}

function normalizeListing(raw: unknown): ListingFromImage {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const title = asString(obj.title) || 'Event';
  const sport = normalizeSport(asString(obj.sport) || title);
  const priceNum =
    typeof obj.price === 'number' && Number.isFinite(obj.price)
      ? Math.max(0, obj.price)
      : typeof obj.price === 'string' && obj.price.trim()
        ? Math.max(0, Number(String(obj.price).replace(/[^\d.,]/g, '').replace(',', '.')) || 0)
        : null;
  const capNum =
    typeof obj.capacity === 'number' && Number.isFinite(obj.capacity)
      ? Math.max(0, Math.round(obj.capacity))
      : typeof obj.capacity === 'string' && obj.capacity.trim()
        ? Math.max(0, Math.round(Number(obj.capacity)) || 0)
        : null;

  return {
    title: title.slice(0, 120),
    sport,
    date: normalizeDate(asString(obj.date)),
    time: normalizeTime(asString(obj.time)),
    endDate: normalizeDate(asString(obj.endDate)),
    endTime: normalizeTime(asString(obj.endTime)),
    place: asString(obj.place).slice(0, 160),
    price: priceNum === null ? '' : String(priceNum),
    capacity: capNum === null || capNum === 0 ? '' : String(capNum),
    link: asString(obj.link).slice(0, 500),
    description: asString(obj.description).slice(0, 2000),
    kind: normalizeKind(asString(obj.kind)),
  };
}

/**
 * Vision extract: flyer / poster / screenshot → shared manage listing fields.
 */
export async function extractListingFromImage(input: {
  bytes: Buffer;
  mimeType: string;
}): Promise<{ listing: ListingFromImage; model: string }> {
  const mime = input.mimeType.toLowerCase();
  if (!/^image\/(jpeg|jpg|png|webp|gif)$/.test(mime)) {
    throw new Error('Unsupported image type (use JPEG, PNG or WebP)');
  }
  if (input.bytes.length < 200) {
    throw new Error('Image too small');
  }
  if (input.bytes.length > 8 * 1024 * 1024) {
    throw new Error('Image too large (max 8 MB)');
  }

  const genAI = new GoogleGenerativeAI(getApiKey());
  const candidates = modelCandidates();
  let lastError: unknown;

  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt(),
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: mime === 'image/jpg' ? 'image/jpeg' : mime,
            data: input.bytes.toString('base64'),
          },
        },
        {
          text: 'Extract the sports listing fields from this flyer / poster / screenshot.',
        },
      ]);

      const text = result.response.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Gemini returned invalid JSON');
      }

      return { listing: normalizeListing(parsed), model: modelName };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/\b404\b|not found|unsupported/i.test(msg)) {
        console.warn(`[listing-from-image] model ${modelName} unavailable — next`);
        continue;
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`All Gemini models failed: ${String(lastError)}`);
}
