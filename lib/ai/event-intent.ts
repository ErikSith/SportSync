import { z } from 'zod';
import { EVENT_SPORTS, detectEventSport } from '@/lib/constants/sports';
import { SUPPORTED_CITIES, findCityByName } from '@/lib/cities';

export const eventIntentSchema = z.object({
  title: z.string().min(3).max(120),
  sport: z.enum(EVENT_SPORTS),
  description: z.string().min(10).max(2000),
  city: z.string().min(1),
  startsAt: z.string().datetime(),
  price: z.number().min(0),
  capacity: z.number().int().min(2).max(500).nullable(),
  aiManagementPlan: z.array(z.string()).min(1).max(8),
  suggestedVenueHint: z.string().nullable().optional(),
});

export type EventIntent = z.infer<typeof eventIntentSchema>;

export interface ParseEventIntentInput {
  brief: string;
  defaultCity?: string | null;
  teamName?: string | null;
  organizerName?: string | null;
  mode?: 'community' | 'official';
}

function detectSport(text: string): (typeof EVENT_SPORTS)[number] {
  return detectEventSport(text, 'FOOTBALL');
}

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
  if (colonMatch) {
    return { hours: Number(colonMatch[1]), minutes: Number(colonMatch[2]) };
  }

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

  const weekdayMatch = lower.match(/\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|pondelok|utorok|streda|štvrtok|piatok|sobota|nedeľa)\b/);
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
    const parsed = new Date(`${isoMatch[1]}T${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const future = new Date(base);
  future.setDate(future.getDate() + 7);
  future.setHours(time.hours, time.minutes, 0, 0);
  return future;
}

function parseCapacity(text: string): number | null {
  const lower = text.toLowerCase();
  if (lower.includes('unlimited') || lower.includes('open to all')) return null;

  const match = lower.match(/\b(\d{1,3})\s*(players|people|spots|teams|participants|hráč|hrac)\b/);
  if (match) return Number(match[1]);

  const vsMatch = lower.match(/\b(\d{1,2})\s*v\s*(\d{1,2})\b/);
  if (vsMatch) return Number(vsMatch[1]) + Number(vsMatch[2]);

  return 16;
}

function parsePrice(text: string): number {
  const lower = text.toLowerCase();
  if (lower.includes('free') || lower.includes('zdarma') || lower.includes('no fee')) return 0;

  const euroMatch = lower.match(/(?:€|eur)\s*(\d+(?:[.,]\d{1,2})?)/);
  if (euroMatch?.[1]) return Number(euroMatch[1].replace(',', '.'));

  const perPlayerMatch = lower.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur)\s*(?:per|\/)\s*player/);
  if (perPlayerMatch?.[1]) return Number(perPlayerMatch[1].replace(',', '.'));

  return 0;
}

function buildTitle(brief: string, sport: string, teamName?: string | null, mode?: 'community' | 'official'): string {
  const firstSentence = brief.split(/[.!?\n]/)[0]?.trim();
  if (firstSentence && firstSentence.length >= 8 && firstSentence.length <= 100) {
    return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
  }
  const label = sport.charAt(0) + sport.slice(1).toLowerCase();
  if (teamName) return `${teamName} ${label} Event`;
  if (mode === 'official') return `Official ${label} Event`;
  return `Community ${label} Event`;
}

function buildDescription(brief: string, plan: string[]): string {
  const planBlock = plan.map((item) => `- ${item}`).join('\n');
  return `${brief.trim()}\n\n---\n**Organizer automation**\n${planBlock}`;
}

function defaultManagementPlan(input: {
  sport: string;
  capacity: number | null;
  price: number;
  startsAt: Date;
  mode?: 'community' | 'official';
}): string[] {
  const plans =
    input.mode === 'official'
      ? [
          'Monitor registrations and update capacity status automatically.',
          `Send RSVP reminders 24 hours before start (${input.startsAt.toLocaleDateString('en-GB')}).`,
          'Promote the event to nearby players matching the sport and skill level.',
          'Draft social posts and venue signage copy for the event.',
        ]
      : [
          'Monitor registrations and update capacity status automatically.',
          `Send RSVP reminders 24 hours before kickoff (${input.startsAt.toLocaleDateString('en-GB')}).`,
          'Suggest nearby venues and optimal start times based on team history.',
          'Draft a shareable invite message for your crew chat.',
        ];

  if (input.capacity !== null) {
    plans.unshift(`Track sign-ups and open a waitlist when ${input.capacity} spots fill up.`);
  }
  if (input.price > 0) {
    plans.push(`Collect entry-fee confirmations (€${input.price.toFixed(2)} per player).`);
  }

  return plans.slice(0, 6);
}

function parseHeuristic(input: ParseEventIntentInput): EventIntent {
  const brief = input.brief.trim();
  const sport = detectSport(brief);
  const city = detectCity(brief, input.defaultCity);
  const startsAt = parseDate(brief);
  const capacity = parseCapacity(brief);
  const price = parsePrice(brief);
  const mode = input.mode ?? 'community';
  const aiManagementPlan = defaultManagementPlan({ sport, capacity, price, startsAt, mode });
  const title = buildTitle(brief, sport, input.teamName ?? input.organizerName, mode);

  const venueHintMatch = brief.match(/\b(?:at|in|venue|location|ihrisko|štadión|stadium)\s+([A-Za-z0-9\s\-']{3,40})/i);

  return eventIntentSchema.parse({
    title,
    sport,
    description: buildDescription(brief, aiManagementPlan),
    city,
    startsAt: startsAt.toISOString(),
    price,
    capacity,
    aiManagementPlan,
    suggestedVenueHint: venueHintMatch?.[1]?.trim() ?? null,
  });
}

async function parseWithOpenAI(input: ParseEventIntentInput): Promise<EventIntent | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const now = new Date().toISOString();
  const cities = SUPPORTED_CITIES.map((c) => c.name).join(', ');
  const sports = EVENT_SPORTS.join(', ');

  const mode = input.mode ?? 'community';
  const eventKind = mode === 'official' ? 'official venue-hosted event' : 'community team event';

  const system = `You are SportSync Event AI. Extract structured event data from a natural-language brief.
Return ONLY valid JSON with keys: title, sport, description, city, startsAt (ISO 8601, must be in the future), price (number), capacity (number or null), aiManagementPlan (string array, 3-6 items describing what AI will automate), suggestedVenueHint (string or null).
Allowed sports: ${sports}. Allowed cities: ${cities}. Default city if missing: ${input.defaultCity ?? 'Bratislava'}.
Today is ${now}. Event type: ${eventKind}.`;

  const user =
    mode === 'official'
      ? `Venue organizer: ${input.organizerName ?? 'Unknown'}\nBrief:\n${input.brief}`
      : `Team name: ${input.teamName ?? 'Unknown'}\nBrief:\n${input.brief}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const raw = JSON.parse(content) as Record<string, unknown>;
    const parsed = eventIntentSchema.safeParse(raw);
    if (!parsed.success) return null;

    const startsAt = new Date(parsed.data.startsAt);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) return null;
    if (!findCityByName(parsed.data.city)) return null;

    return {
      ...parsed.data,
      description: buildDescription(input.brief, parsed.data.aiManagementPlan),
    };
  } catch {
    return null;
  }
}

/** Parse a natural-language team brief into a publish-ready event draft. */
export async function parseEventIntent(input: ParseEventIntentInput): Promise<{
  intent: EventIntent;
  source: 'openai' | 'heuristic';
}> {
  if (!input.brief.trim()) {
    throw new Error('Brief is required');
  }

  const fromLlm = await parseWithOpenAI(input);
  if (fromLlm) {
    return { intent: fromLlm, source: 'openai' };
  }

  return { intent: parseHeuristic(input), source: 'heuristic' };
}
