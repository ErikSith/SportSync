// Structured Text Extraction for the AI-Driven Event Factory (VISION.md pillar 3).
//
// Given a raw brief (free text + optional image URLs) from a Venue Owner, this
// module extracts a fully structured event intent: location, timing, pricing,
// sport family, rules/schedule, and a suggested dynamic themeConfig. It uses
// OpenAI with JSON-schema output when an API key is configured, and falls back
// to a deterministic heuristic extractor so the factory works end-to-end
// without external dependencies.

import { z } from 'zod';
import { EVENT_SPORTS, detectEventSport } from '@/lib/constants/sports';
import { SUPPORTED_CITIES, findCityByName } from '@/lib/cities';
import { resolveSportType, buildThemeConfig, type SportTypeKey, type ThemeConfig } from '@/lib/ai/theme-config';

export interface SponsorExtracted {
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  tier?: 'gold' | 'silver' | 'bronze' | 'partner';
}

export const structuredEventIntentSchema = z.object({
  title: z.string().min(3).max(120),
  sport: z.enum(EVENT_SPORTS),
  sportType: z.enum(['PADEL', 'TENNIS', 'FOOTBALL', 'BASKETBALL', 'ATLETIKA', 'OTHER']),
  description: z.string().min(10).max(2000),
  city: z.string().min(1),
  location: z.object({ name: z.string().nullable(), address: z.string().nullable() }).nullable(),
  eventDate: z.string().datetime(), // calendar day
  startTime: z.string().datetime(), // from
  endTime: z.string().datetime().nullable(), // to
  startsAt: z.string().datetime(), // canonical feed timestamp (= startTime)
  priceCents: z.number().int().min(0),
  currency: z.string().min(3).max(3).default('EUR'),
  maxParticipants: z.number().int().min(2).max(500).nullable(),
  entryRequirements: z.string().max(1000).nullable(),
  rules: z.array(z.string()).max(12),
  schedule: z.array(z.string()).max(12),
  themeConfig: z
    .object({
      accent: z.string().optional(),
      accentSoft: z.string().optional(),
      gradient: z.string().optional(),
      tabs: z.array(z.string()).optional(),
      label: z.string().optional(),
    })
    .nullable()
    .optional(),
  sponsors: z
    .array(
      z.object({
        name: z.string(),
        logoUrl: z.string().url().optional().nullable(),
        websiteUrl: z.string().url().optional().nullable(),
        tier: z.enum(['gold', 'silver', 'bronze', 'partner']).optional(),
      }),
    )
    .max(8)
    .default([]),
  aiManagementPlan: z.array(z.string()).min(1).max(8),
  suggestedVenueHint: z.string().nullable().optional(),
});

export type StructuredEventIntent = z.infer<typeof structuredEventIntentSchema>;

export interface ParseStructuredInput {
  brief: string;
  photos?: string[];
  defaultCity?: string | null;
  organizerName?: string | null;
  venueName?: string | null;
  mode?: 'community' | 'official';
}

// ---------------------------------------------------------------------------
// Heuristic extraction (no LLM)
// ---------------------------------------------------------------------------

function detectCity(text: string, fallback?: string | null): string {
  const lower = text.toLowerCase();
  for (const city of SUPPORTED_CITIES) {
    if (lower.includes(city.name.toLowerCase())) return city.name;
  }
  return fallback && findCityByName(fallback) ? fallback : 'Bratislava';
}

function parseTime(text: string): { hours: number; minutes: number } | null {
  const lower = text.toLowerCase();
  const atMatch = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (atMatch) {
    let hours = Number(atMatch[1]);
    const minutes = Number(atMatch[2] ?? 0);
    const meridiem = atMatch[3];
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return { hours, minutes };
  }
  const colonMatch = lower.match(/\b(\d{1,2}):(\d{2})\b/);
  if (colonMatch) return { hours: Number(colonMatch[1]), minutes: Number(colonMatch[2]) };
  return null;
}

function parseDate(text: string, now = new Date()): Date {
  const lower = text.toLowerCase();
  const base = new Date(now);
  base.setSeconds(0, 0);
  const time = parseTime(text) ?? { hours: 18, minutes: 0 };

  if (lower.includes('tomorrow') || lower.includes('zajtra')) {
    base.setDate(base.getDate() + 1);
    base.setHours(time.hours, time.minutes, 0, 0);
    return base;
  }
  const weekdayMatch = lower.match(
    /\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|pondelok|utorok|streda|štvrtok|piatok|sobota|nedeľa)\b/,
  );
  if (weekdayMatch) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const skDays = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
    const target = weekdayMatch[2] ?? '';
    let targetDay = dayNames.findIndex((d) => target.includes(d));
    if (targetDay < 0) targetDay = skDays.findIndex((d) => target.includes(d));
    if (targetDay >= 0) {
      const currentDay = base.getDay();
      let delta = (targetDay - currentDay + 7) % 7;
      if (delta === 0 || weekdayMatch[1]) delta += 7;
      base.setDate(base.getDate() + delta);
      base.setHours(time.hours, time.minutes, 0, 0);
      return base;
    }
  }
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    const parsed = new Date(
      `${isoMatch[1]}T${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:00`,
    );
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const future = new Date(base);
  future.setDate(future.getDate() + 7);
  future.setHours(time.hours, time.minutes, 0, 0);
  return future;
}

function parseEndTime(text: string, start: Date): Date | null {
  const lower = text.toLowerCase();
  const toMatch = lower.match(/\b(?:to|until|–|-|do|koniec)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!toMatch) return null;
  let hours = Number(toMatch[1]);
  const minutes = Number(toMatch[2] ?? 0);
  const meridiem = toMatch[3];
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  const end = new Date(start);
  end.setHours(hours, minutes, 0, 0);
  if (end <= start) end.setDate(end.getDate() + 1);
  return end;
}

function parseCapacity(text: string): number | null {
  const lower = text.toLowerCase();
  if (lower.includes('unlimited') || lower.includes('open to all')) return null;
  const match = lower.match(/\b(\d{1,3})\s*(players|people|spots|teams|participants|hráč|hrac|účastník)/);
  if (match) return Number(match[1]);
  const vsMatch = lower.match(/\b(\d{1,2})\s*v\s*(\d{1,2})\b/);
  if (vsMatch) return Number(vsMatch[1]) + Number(vsMatch[2]);
  return 16;
}

function parsePriceCents(text: string): { cents: number; currency: string } {
  const lower = text.toLowerCase();
  if (lower.includes('free') || lower.includes('zdarma') || lower.includes('no fee')) return { cents: 0, currency: 'EUR' };
  const euroMatch = lower.match(/(?:€|eur)\s*(\d+(?:[.,]\d{1,2})?)/);
  if (euroMatch?.[1]) {
    const value = Number(euroMatch[1].replace(',', '.'));
    return { cents: Math.round(value * 100), currency: 'EUR' };
  }
  const perPlayerMatch = lower.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur)\s*(?:per|\/)\s*player/);
  if (perPlayerMatch?.[1]) {
    const value = Number(perPlayerMatch[1].replace(',', '.'));
    return { cents: Math.round(value * 100), currency: 'EUR' };
  }
  return { cents: 0, currency: 'EUR' };
}

function detectSport(text: string): (typeof EVENT_SPORTS)[number] {
  return detectEventSport(text, 'FOOTBALL');
}

function extractLocation(text: string): { name: string | null; address: string | null } {
  const venueMatch = text.match(
    /\b(?:at|in|venue|location|ihrisko|štadión|stadium|hala|klub|areál)\s+([A-Za-z0-9\s\-']{3,40})/i,
  );
  if (venueMatch) return { name: venueMatch[1]!.trim(), address: null };
  return { name: null, address: null };
}

function extractRules(text: string): string[] {
  const rules: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes('beginner')) rules.push('Vhodné pre začiatočníkov.');
  if (lower.includes('advanced')) rules.push('Určené pre pokročilých hráčov.');
  if (lower.includes('free') || lower.includes('zdarma')) rules.push('Vstup zdarma.');
  if (lower.includes('bring') && lower.includes('racket')) rules.push('Vlastná raketa povinná.');
  if (rules.length === 0) rules.push('Platný SportSync účet potrebný na registráciu.');
  return rules.slice(0, 6);
}

function buildSchedule(start: Date, end: Date | null): string[] {
  const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const items = [`Registrácia / príchod: ${fmt(new Date(start.getTime() - 30 * 60 * 1000))}`];
  items.push(`Štart: ${fmt(start)}`);
  if (end) items.push(`Koniec: ${fmt(end)}`);
  return items;
}

function defaultManagementPlan(sport: string, capacity: number | null, cents: number, start: Date, mode?: string): string[] {
  const plans: string[] = [];
  if (capacity !== null) plans.push(`Otvoriť čakaciu listinu po naplnení ${capacity} miest.`);
  plans.push(`Poslať pripomienky 24h pred štartom (${start.toLocaleDateString('en-GB')}).`);
  plans.push('Automaticky propagovať medzi blízkymi hráčmi daného športu.');
  if (cents > 0) plans.push(`Zbierať štartovné (${(cents / 100).toFixed(2)} €) pri registrácii.`);
  return plans.slice(0, 6);
}

function parseHeuristic(input: ParseStructuredInput): StructuredEventIntent {
  const brief = input.brief.trim();
  const sport = detectSport(brief);
  const sportType = resolveSportType(sport) as SportTypeKey;
  const city = detectCity(brief, input.defaultCity);
  const start = parseDate(brief);
  const end = parseEndTime(brief, start);
  const capacity = parseCapacity(brief);
  const { cents, currency } = parsePriceCents(brief);
  const location = extractLocation(brief);
  const rules = extractRules(brief);
  const schedule = buildSchedule(start, end);
  const plan = defaultManagementPlan(sport, capacity, cents, start, input.mode);
  const theme = buildThemeConfig(sportType, null);

  const firstSentence = brief.split(/[.!?\n]/)[0]?.trim();
  const title =
    firstSentence && firstSentence.length >= 8 && firstSentence.length <= 100
      ? firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1)
      : `${theme.label} Event${input.venueName ? ` at ${input.venueName}` : ''}`;

  return structuredEventIntentSchema.parse({
    title,
    sport,
    sportType,
    description: `${brief}\n\n---\nOrganized by ${input.organizerName ?? 'SportSync'}${
      input.venueName ? ` at ${input.venueName}` : ''
    }. Powered by the SportSync AI Event Factory.`,
    city,
    location,
    eventDate: start.toISOString(),
    startTime: start.toISOString(),
    endTime: end ? end.toISOString() : null,
    startsAt: start.toISOString(),
    priceCents: cents,
    currency,
    maxParticipants: capacity,
    entryRequirements: rules.join(' '),
    rules,
    schedule,
    themeConfig: theme,
    sponsors: [],
    aiManagementPlan: plan,
    suggestedVenueHint: location.name,
  });
}

// ---------------------------------------------------------------------------
// OpenAI extraction (JSON-schema output)
// ---------------------------------------------------------------------------

async function parseWithOpenAI(input: ParseStructuredInput): Promise<StructuredEventIntent | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const now = new Date().toISOString();
  const cities = SUPPORTED_CITIES.map((c) => c.name).join(', ');
  const sports = EVENT_SPORTS.join(', ');
  const mode = input.mode ?? 'community';
  const eventKind = mode === 'official' ? 'official venue-hosted event' : 'community team event';

  const system = `You are SportSync Event Factory AI. Extract structured event data from a natural-language brief (and optional image URLs) into a strict JSON object.
Keys & types:
- title: string (3-120 chars)
- sport: enum(${sports})
- sportType: enum(PADEL, TENNIS, FOOTBALL, BASKETBALL, ATLETIKA, OTHER) — the visual sport family
- description: string (10-2000 chars)
- city: string (one of: ${cities}; default "${input.defaultCity ?? 'Bratislava'}")
- location: { name: string|null, address: string|null } — venue name/address if mentioned
- eventDate: ISO 8601 date-time (the calendar day)
- startTime: ISO 8601 date-time (from)
- endTime: ISO 8601 date-time|null (to)
- startsAt: ISO 8601 date-time (== startTime, must be in the future)
- priceCents: integer >= 0 (convert euros to cents; 0 if free)
- currency: 3-letter code (default "EUR")
- maxParticipants: integer 2-500 | null
- entryRequirements: string|null (eligibility / what to bring)
- rules: string[] (3-6 short rule bullets)
- schedule: string[] (3-6 timeline bullets)
- themeConfig: { accent?: hex color, gradient?: css gradient, tabs?: string[], label?: string } | null — suggest a sport-appropriate dominant color and 3-4 sport-specific tab labels (Slovak)
- sponsors: array of { name, logoUrl?:url, websiteUrl?:url, tier?: gold|silver|bronze|partner }
- aiManagementPlan: string[] (3-6 automation items)
- suggestedVenueHint: string|null
Today is ${now}. Event type: ${eventKind}. Return ONLY the JSON object.`;

  const user = `Organizer: ${input.organizerName ?? 'Unknown'}${input.venueName ? ` at ${input.venueName}` : ''}
Mode: ${mode}
${input.photos?.length ? `Attached photos (${input.photos.length}): ${input.photos.join(', ')}` : 'No photos.'}
Brief:
${input.brief}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    const raw = JSON.parse(content) as Record<string, unknown>;
    const parsed = structuredEventIntentSchema.safeParse(raw);
    if (!parsed.success) return null;

    const startsAt = new Date(parsed.data.startsAt);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) return null;
    if (!findCityByName(parsed.data.city)) return null;

    // Ensure themeConfig is fully resolved against the sport defaults.
    const resolvedTheme = buildThemeConfig(parsed.data.sportType as SportTypeKey, parsed.data.themeConfig ?? null);
    return { ...parsed.data, themeConfig: resolvedTheme };
  } catch {
    return null;
  }
}

/** Parse a raw brief into a fully structured event intent (LLM + heuristic fallback). */
export async function parseStructuredEventIntent(input: ParseStructuredInput): Promise<{
  intent: StructuredEventIntent;
  source: 'openai' | 'heuristic';
}> {
  if (!input.brief.trim()) throw new Error('Brief is required');
  const fromLlm = await parseWithOpenAI(input);
  if (fromLlm) return { intent: fromLlm, source: 'openai' };
  return { intent: parseHeuristic(input), source: 'heuristic' };
}

export type { ThemeConfig, SportTypeKey };