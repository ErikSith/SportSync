import { z } from 'zod';
import { EVENT_SPORTS, detectEventSport } from '@/lib/constants/sports';
import { SUPPORTED_CITIES, findCityByName } from '@/lib/cities';

export const enrichedEventSchema = z.object({
  title: z.string().min(3).max(120),
  sport: z.enum(EVENT_SPORTS),
  description: z.string().min(10).max(2000),
  city: z.string().min(1),
  tags: z.array(z.string()).max(8),
  promoCopy: z.string().min(10).max(600),
  socialPost: z.string().min(10).max(400),
});

export type EnrichedEvent = z.infer<typeof enrichedEventSchema>;

export interface EnrichEventInput {
  rawBrief: string;
  photos?: string[];
  organizerName?: string | null;
  venueName?: string | null;
  defaultCity?: string | null;
  mode?: 'community' | 'official';
}

/**
 * AI-Driven Event Factory enrichment (VISION.md pillar 3).
 *
 * Turns a venue owner's raw intent (text + photo URLs) into a publish-ready,
 * professional event page: structured title/description, discovery tags, and
 * promo + social copy for autonomous promotion. Uses OpenAI when an API key is
 * configured, and falls back to a deterministic heuristic generator so the
 * factory works end-to-end without external dependencies.
 */
export async function enrichEvent(input: EnrichEventInput): Promise<{
  event: EnrichedEvent;
  source: 'openai' | 'heuristic';
}> {
  const fromLlm = await enrichWithOpenAI(input);
  if (fromLlm) return { event: fromLlm, source: 'openai' };
  return { event: enrichHeuristic(input), source: 'heuristic' };
}

async function enrichWithOpenAI(input: EnrichEventInput): Promise<EnrichedEvent | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const sports = EVENT_SPORTS.join(', ');
  const cities = SUPPORTED_CITIES.map((c) => c.name).join(', ');
  const photoNote = input.photos?.length
    ? `The organizer attached ${input.photos.length} photo(s) for the event page.`
    : 'No photos were attached.';

  const system = `You are SportSync Event Factory AI. Turn a venue organizer's raw intent into a professional event page.
Return ONLY valid JSON with keys: title, sport, description, city, tags (string[]), promoCopy (string, ~1-2 sentences for the event page hero), socialPost (string, ~280 chars, shareable).
Allowed sports: ${sports}. Allowed cities: ${cities}. Default city if missing: ${input.defaultCity ?? 'Bratislava'}.`;

  const user = `Organizer: ${input.organizerName ?? 'Unknown'}${input.venueName ? ` at ${input.venueName}` : ''}
Mode: ${input.mode ?? 'official'}
${photoNote}
Raw brief:
${input.rawBrief}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.4,
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

    const parsed = enrichedEventSchema.safeParse(JSON.parse(content));
    if (!parsed.success) return null;
    if (!findCityByName(parsed.data.city)) return null;
    return parsed.data;
  } catch {
    return null;
  }
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

function enrichHeuristic(input: EnrichEventInput): EnrichedEvent {
  const brief = input.rawBrief.trim();
  const sport = detectSport(brief);
  const city = detectCity(brief, input.defaultCity);
  const label = sport.charAt(0) + sport.slice(1).toLowerCase();
  const venuePart = input.venueName ? ` at ${input.venueName}` : '';
  const title = `${input.organizerName ? input.organizerName + ' ' : ''}${label} Event${venuePart}`.trim();

  const description = `${brief}\n\n---\nOrganized by ${input.organizerName ?? 'SportSync'}${venuePart}. Powered by the SportSync AI Event Factory — structured, published, and promoted automatically.`;

  const tags = [label, city, input.mode === 'official' ? 'Official' : 'Community'];
  if (input.photos?.length) tags.push('Photo Gallery');

  const promoCopy = `Join us for an unforgettable ${label} experience${venuePart} in ${city}. Spots are limited — secure yours through SportSync and let the AI handle the rest.`;
  const socialPost = `🏟️ ${title} is live in ${city}! ${label} players, this one's for you. Tap to join via @SportSync. #${label} #${city} #SportSync`;

  return { title, sport, description, city, tags, promoCopy, socialPost };
}