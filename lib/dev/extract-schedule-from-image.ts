import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from '@google/generative-ai';
import {
  newAreaId,
  newSlotId,
  normalizeTime,
  parseGroupClassSchedule,
  type GroupClassArea,
  type GroupClassSchedule,
  type GroupClassSlot,
  type Weekday,
} from '@/lib/dev/group-class-schedule';
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_FALLBACKS,
} from '@/src/lib/scraper/extractor';

const BLOCKED = new Set([
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-flash-lite-latest',
]);

const RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    areas: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          key: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          sport: { type: SchemaType.STRING },
        },
        required: ['key', 'name'],
      },
    },
    slots: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          weekday: { type: SchemaType.INTEGER },
          start: { type: SchemaType.STRING },
          end: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          areaKey: { type: SchemaType.STRING },
          forKids: { type: SchemaType.BOOLEAN },
          forWomen: { type: SchemaType.BOOLEAN },
          forAdults: { type: SchemaType.BOOLEAN },
        },
        required: [
          'weekday',
          'start',
          'end',
          'title',
          'forKids',
          'forWomen',
          'forAdults',
        ],
      },
    },
  },
  required: ['slots'],
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

const SYSTEM = `Si asistent SportSync. Z fotky / screenshotu týždenného rozvrhu (pondelok–nedeľa) vytiahni skupinové cvičenia / lekcie.

Pravidlá:
- weekday: 1=pondelok … 7=nedeľa (ISO).
- start/end: 24h HH:MM. Ak koniec chýba, daj +60 min od štartu.
- title: názov lekcie (napr. Pilates, HIIT). Bez dňa a bez času v názve.
- Ak sú na fotke viaceré hály / sály / kurty / športy, vytvor areas[] (key, name, sport) a na každý slot daj areaKey.
- key: krátky slug (hala-a, yoga, tenis-1). name: ľudský názov. sport: voliteľné (TENNIS, YOGA, …).
- Ak je len jeden rozvrh bez hál, areas nechaj prázdne a areaKey vynechaj.
- forWomen: true ak ladies / ženy / women / W4W.
- forKids: true ak deti / kids / junior / mládež.
- forAdults: true ak dospelí / adults / open / všeobecné (alebo keď nie je špecificky deti/ženy).
- Ignoruj otváracie hodiny, ceny, kontakt, logo.
- Vráť LEN JSON podľa schémy.`;

/**
 * Vision extract: photo of a weekly class schedule → areas + slots.
 */
export async function extractScheduleSlotsFromImage(input: {
  bytes: Buffer;
  mimeType: string;
}): Promise<{ schedule: GroupClassSchedule; model: string }> {
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
        systemInstruction: SYSTEM,
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
          text: 'Extract the weekly group-class schedule from this image into areas + slots.',
        },
      ]);

      const raw = result.response.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error('Gemini returned invalid JSON');
      }

      const schedule = normalizeVisionSchedule(parsed);
      return { schedule, model: modelName };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/\b404\b|not found|unsupported/i.test(msg)) {
        console.warn(
          `[schedule-from-image] model ${modelName} unavailable — next`,
        );
        continue;
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`All Gemini models failed: ${String(lastError)}`);
}

function normalizeVisionSchedule(raw: unknown): GroupClassSchedule {
  if (!raw || typeof raw !== 'object') return { areas: [], slots: [] };

  const areasIn = Array.isArray((raw as { areas?: unknown }).areas)
    ? ((raw as { areas: unknown[] }).areas)
    : [];
  const slotsIn = Array.isArray((raw as { slots?: unknown }).slots)
    ? ((raw as { slots: unknown[] }).slots)
    : [];

  const keyToId = new Map<string, string>();
  const areas: GroupClassArea[] = [];

  for (const row of areasIn) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const key =
      typeof r.key === 'string' && r.key.trim()
        ? r.key.trim().toLowerCase()
        : typeof r.name === 'string'
          ? r.name.trim().toLowerCase()
          : '';
    const name = typeof r.name === 'string' ? r.name.trim() : key;
    if (!key || !name) continue;
    if (keyToId.has(key)) continue;
    const id = newAreaId();
    keyToId.set(key, id);
    areas.push({
      id,
      name,
      sport: typeof r.sport === 'string' ? r.sport.trim() : '',
    });
  }

  const slots: GroupClassSlot[] = [];
  for (const row of slotsIn) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const weekdayNum = Number(r.weekday);
    if (!Number.isInteger(weekdayNum) || weekdayNum < 1 || weekdayNum > 7) continue;
    const start = typeof r.start === 'string' ? normalizeTime(r.start) : null;
    let end = typeof r.end === 'string' ? normalizeTime(r.end) : null;
    if (!start) continue;
    if (!end) end = addHour(start);

    let areaId: string | null = null;
    const areaKey =
      typeof r.areaKey === 'string' ? r.areaKey.trim().toLowerCase() : '';
    if (areaKey) {
      let id = keyToId.get(areaKey);
      if (!id) {
        id = newAreaId();
        keyToId.set(areaKey, id);
        areas.push({ id, name: areaKey, sport: '' });
      }
      areaId = id;
    }

    slots.push({
      id: newSlotId(),
      weekday: weekdayNum as Weekday,
      start,
      end,
      title: typeof r.title === 'string' ? r.title.trim() : '',
      forKids: Boolean(r.forKids),
      forWomen: Boolean(r.forWomen),
      forAdults: Boolean(r.forAdults),
      areaId,
    });
  }

  // Fallback through parse if empty
  if (slots.length === 0) {
    return parseGroupClassSchedule(raw);
  }

  return {
    areas,
    slots: slots.sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)),
  };
}

function addHour(start: string): string {
  const [h, m] = start.split(':').map(Number);
  const endH = ((h ?? 0) + 1) % 24;
  return `${String(endH).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`;
}
