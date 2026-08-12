import { z } from 'zod';
import { EVENT_SPORTS, detectEventSport } from '@/lib/constants/sports';
import { TOURNAMENT_FORMATS } from '@/lib/constants/tournaments';
import { SUPPORTED_CITIES, findCityByName } from '@/lib/cities';

export const tournamentIntentSchema = z.object({
  name: z.string().min(3).max(120),
  sport: z.enum(EVENT_SPORTS),
  format: z.enum(TOURNAMENT_FORMATS),
  city: z.string().min(1),
  description: z.string().min(20).max(6000),
  rules: z.array(z.string()).min(3).max(12),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable(),
  registrationDeadline: z.string().datetime(),
  entryFee: z.number().min(0),
  maxParticipants: z.number().int().min(4).max(256),
  skillLevelMin: z.number().int().nullable(),
  skillLevelMax: z.number().int().nullable(),
  skillLevelLabel: z.string(),
  aiManagementPlan: z.array(z.string()).min(3).max(10),
  suggestedVenueHint: z.string().nullable().optional(),
});

export type TournamentIntent = z.infer<typeof tournamentIntentSchema>;

export interface ParseTournamentIntentInput {
  brief: string;
  organizerName?: string | null;
  defaultCity?: string | null;
}

function detectSport(text: string): (typeof EVENT_SPORTS)[number] {
  return detectEventSport(text, 'PADEL');
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
  if (colonMatch) return { hours: Number(colonMatch[1]), minutes: Number(colonMatch[2]) };
  return null;
}

function parseStartDate(text: string, now = new Date()): Date {
  const lower = text.toLowerCase();
  const base = new Date(now);
  base.setSeconds(0, 0);
  const time = parseTime(text) ?? { hours: 9, minutes: 0 };

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
  future.setDate(future.getDate() + 21);
  future.setHours(time.hours, time.minutes, 0, 0);
  return future;
}

function detectFormat(text: string): (typeof TOURNAMENT_FORMATS)[number] {
  const lower = text.toLowerCase();
  if (lower.includes('double elim')) return 'DOUBLE_ELIMINATION';
  if (lower.includes('round robin') || lower.includes('kolo') || lower.includes('skupin')) return 'ROUND_ROBIN';
  if (lower.includes('group stage') || lower.includes('skupinová')) return 'GROUP_STAGE';
  return 'SINGLE_ELIMINATION';
}

function detectSkillLevel(text: string): {
  min: number | null;
  max: number | null;
  label: string;
} {
  const lower = text.toLowerCase();
  if (lower.includes('all level') || lower.includes('open') || lower.includes('všetci') || lower.includes('vsetci')) {
    return { min: null, max: null, label: 'All levels' };
  }
  if (lower.includes('beginner') || lower.includes('začiato') || lower.includes('zaciat')) {
    return { min: 0, max: 800, label: 'Beginner' };
  }
  if (lower.includes('pro') || lower.includes('elite') || lower.includes('profesion')) {
    return { min: 1600, max: 3000, label: 'Pro / Elite' };
  }
  if (lower.includes('advanced') || lower.includes('pokroč') || lower.includes('pokroc')) {
    return { min: 1400, max: 1800, label: 'Advanced' };
  }
  if (lower.includes('intermediate') || lower.includes('stredn') || lower.includes('recreational')) {
    return { min: 800, max: 1400, label: 'Intermediate' };
  }

  const rangeMatch = lower.match(/\b(\d{3,4})\s*[-–]\s*(\d{3,4})\b/);
  if (rangeMatch) {
    return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]), label: `${rangeMatch[1]}–${rangeMatch[2]}` };
  }

  return { min: 800, max: 1400, label: 'Intermediate' };
}

function parseMaxParticipants(text: string): number {
  const lower = text.toLowerCase();
  const match = lower.match(/\b(\d{1,3})\s*(players|teams|participants|hráč|hrac|účastník)\b/);
  if (match) return Number(match[1]);
  if (lower.includes('32')) return 32;
  if (lower.includes('16')) return 16;
  return 16;
}

function parseEntryFee(text: string): number {
  const lower = text.toLowerCase();
  if (lower.includes('free') || lower.includes('zdarma')) return 0;
  const euroMatch = lower.match(/(?:€|eur)\s*(\d+(?:[.,]\d{1,2})?)/);
  if (euroMatch?.[1]) return Number(euroMatch[1].replace(',', '.'));
  return 25;
}

function buildRules(sport: string, format: string, skillLabel: string): string[] {
  return [
    `Sport: ${sport}. Format: ${format.replace(/_/g, ' ')}.`,
    `Skill requirement: ${skillLabel}. Organizers may verify rating at check-in.`,
    'Players must arrive 30 minutes before their first match.',
    'Unsportsmanlike conduct or repeated no-shows may lead to disqualification.',
    'Match disputes are resolved by the on-site referee / organizer.',
    'Registration closes automatically at the deadline — waitlist promotion runs automatically.',
  ];
}

function buildDescription(brief: string, rules: string[], plan: string[]): string {
  const rulesBlock = rules.map((rule, index) => `${index + 1}. ${rule}`).join('\n');
  const planBlock = plan.map((item) => `- ${item}`).join('\n');
  return (
    `${brief.trim()}\n\n` +
    `## Rules & Regulations\n${rulesBlock}\n\n` +
    `---\n**Organizer automation**\n${planBlock}`
  );
}

function defaultManagementPlan(input: {
  sport: string;
  city: string;
  maxParticipants: number;
  startsAt: Date;
  skillLabel: string;
}): string[] {
  return [
    'Auto-open registration and publish the tournament page immediately.',
    `Monitor fill rate toward ${input.maxParticipants} participants and escalate SOS posts when spots remain.`,
    `Send deadline reminders 7 days, 48 hours, and 24 hours before registration closes.`,
    `Match candidate players in ${input.city} by skill (${input.skillLabel}) and karma.`,
    'Generate bracket preview once registration closes.',
    `Broadcast last-minute invites if the tournament starts within 72 hours and spots remain.`,
  ];
}

function buildName(brief: string, sport: string, city: string): string {
  const firstLine = brief.split(/[.!\n]/)[0]?.trim();
  if (firstLine && firstLine.length >= 8 && firstLine.length <= 80) {
    return firstLine.charAt(0).toUpperCase() + firstLine.slice(1);
  }
  const label = sport.charAt(0) + sport.slice(1).toLowerCase();
  return `${city} ${label} Open`;
}

function parseHeuristic(input: ParseTournamentIntentInput): TournamentIntent {
  const brief = input.brief.trim();
  const sport = detectSport(brief);
  const city = detectCity(brief, input.defaultCity);
  const format = detectFormat(brief);
  const skill = detectSkillLevel(brief);
  const startsAt = parseStartDate(brief);
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + (format === 'ROUND_ROBIN' ? 3 : 2));
  const registrationDeadline = new Date(startsAt);
  registrationDeadline.setDate(registrationDeadline.getDate() - 5);
  if (registrationDeadline <= new Date()) {
    registrationDeadline.setDate(new Date().getDate() + 3);
  }
  const maxParticipants = parseMaxParticipants(brief);
  const entryFee = parseEntryFee(brief);
  const rules = buildRules(sport, format, skill.label);
  const aiManagementPlan = defaultManagementPlan({
    sport,
    city,
    maxParticipants,
    startsAt,
    skillLabel: skill.label,
  });
  const name = buildName(brief, sport, city);
  const venueHintMatch = brief.match(/\b(?:at|in|venue|location|miesto|ihrisko|štadión)\s+([A-Za-z0-9\s\-']{3,40})/i);

  return tournamentIntentSchema.parse({
    name,
    sport,
    format,
    city,
    description: buildDescription(brief, rules, aiManagementPlan),
    rules,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    registrationDeadline: registrationDeadline.toISOString(),
    entryFee,
    maxParticipants,
    skillLevelMin: skill.min,
    skillLevelMax: skill.max,
    skillLevelLabel: skill.label,
    aiManagementPlan,
    suggestedVenueHint: venueHintMatch?.[1]?.trim() ?? null,
  });
}

async function parseWithOpenAI(input: ParseTournamentIntentInput): Promise<TournamentIntent | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const sports = EVENT_SPORTS.join(', ');
  const formats = TOURNAMENT_FORMATS.join(', ');
  const cities = SUPPORTED_CITIES.map((c) => c.name).join(', ');

  const system = `You are SportSync Tournament AI. Extract tournament data from natural language.
Return ONLY JSON with keys: name, sport, format, city, description (long, includes overview), rules (string array), startsAt, endsAt, registrationDeadline (ISO 8601, future), entryFee, maxParticipants, skillLevelMin, skillLevelMax, skillLevelLabel, aiManagementPlan (3-8 automation steps), suggestedVenueHint.
Sports: ${sports}. Formats: ${formats}. Cities: ${cities}. Default city: ${input.defaultCity ?? 'Bratislava'}.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Organizer: ${input.organizerName ?? 'Unknown'}\nBrief:\n${input.brief}` },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const raw = JSON.parse(content) as Record<string, unknown>;
    const parsed = tournamentIntentSchema.safeParse(raw);
    if (!parsed.success) return null;

    const startsAt = new Date(parsed.data.startsAt);
    const deadline = new Date(parsed.data.registrationDeadline);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) return null;
    if (Number.isNaN(deadline.getTime()) || deadline >= startsAt) return null;
    if (!findCityByName(parsed.data.city)) return null;

    return {
      ...parsed.data,
      description: buildDescription(input.brief, parsed.data.rules, parsed.data.aiManagementPlan),
    };
  } catch {
    return null;
  }
}

export async function parseTournamentIntent(input: ParseTournamentIntentInput): Promise<{
  intent: TournamentIntent;
  source: 'openai' | 'heuristic';
}> {
  if (!input.brief.trim()) throw new Error('Brief is required');

  const fromLlm = await parseWithOpenAI(input);
  if (fromLlm) return { intent: fromLlm, source: 'openai' };

  return { intent: parseHeuristic(input), source: 'heuristic' };
}
