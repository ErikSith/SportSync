/**
 * Deterministic split of Slovak school/club announcement calendars.
 *
 * Example (tenisadvantage.sk / Tenisová jeseň):
 *   "26.9. Ukončenie letnej sezóny. Tenisový turnaj žien 9.30-12:30
 *    a Tenisový turnaj v mužskej štvorhre 13:00 – 18:00"
 * → two playable tournaments (women 09:30, men doubles 13:00), not one teaser card.
 */

export interface AnnouncementActivity {
  title: string;
  /** Series / page heading when known (e.g. Tenisová jeseň). */
  seriesTitle: string | null;
  year: number;
  month: number;
  day: number;
  startHour: number;
  startMinute: number;
  endHour: number | null;
  endMinute: number | null;
  isTournament: boolean;
  isForWomenOnly: boolean;
  isForKids: boolean;
  /** doubles / singles when explicit in copy. */
  formatHint: 'doubles' | 'singles' | null;
  sportType: string;
  description: string;
  /** Raw segment used for debugging / externalId. */
  rawSegment: string;
}

const SKIP_ACTIVITY =
  /brigad|stavanie|montaz|pr[aá]zdnin|zaciatok\s+(zimnej|letnej)\s+sezony|ukoncenie\s+(zimnej|letnej)\s+sezony|otvaracie\s+hodiny|cennik|prenajom/i;

const TOURNAMENT_HINT =
  /turnaj|cup|open|trophy|championship|majstrovst|sutaz|s[uú][tť]a[zž]|kvalifikac/i;

const WOMEN_HINT =
  /turnaj\s+zien|zien\b|zensky|zenska|zenske|pre\s+zeny|ladies|women|dievc/i;

const KIDS_HINT =
  /deti|detsky|detska|junior|mladez|u\d{1,2}\b|do\s+\d{1,2}\s+rokov|kid/i;

const DOUBLES_HINT = /stvorhr|stvorhra|debl|doubles|parov[aá]/i;
const SINGLES_HINT = /dvojhr|dvojhra|singles|jednotlivci/i;

const TIME_RANGE =
  /(\d{1,2})\s*[.:]\s*(\d{2})\s*[-–—]\s*(\d{1,2})\s*[.:]?\s*(\d{2})?/;

const DATE_LINE =
  /(?:^|\n)\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\.?(?:\s*(\d{4}))?\s+([^\n]+)/g;

const DATE_RANGE_LINE =
  /(?:^|\n)\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\.?(?:\s*(\d{4}))?\s+([^\n]+)/g;

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveYear(month: number, explicitYear: number | null, now = new Date()): number {
  if (explicitYear && explicitYear >= 2024 && explicitYear <= 2035) return explicitYear;
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  // Past calendar months in Jan–Mar may belong to previous season year;
  // otherwise prefer current year, then roll forward if the day already passed hard.
  if (month < m - 1 && m >= 10) return y + 1;
  return y;
}

function splitActivitySegments(body: string): string[] {
  const cleaned = body.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  // Prefer splits before a new tournament / timed sport activity.
  const parts = cleaned
    .split(
      /\s*(?:,|;|\ba\b)\s*(?=(?:tenisov[ýyáa]|padelov[ýyáa]|stolnotenis|turnaj|sutaz|s[uú][tť]a[zž]|open\b|cup\b))/i,
    )
    .map((p) => p.replace(/^[.,;:\s]+|[.,;:\s]+$/g, '').trim())
    .filter(Boolean);

  if (parts.length > 1) return parts;

  // Fallback: multiple time ranges in one blob → split on "a" / comma near times.
  const timeHits = [...cleaned.matchAll(new RegExp(TIME_RANGE.source, 'g'))];
  if (timeHits.length >= 2) {
    const byAnd = cleaned
      .split(/\s+\ba\b\s+/i)
      .map((p) => p.trim())
      .filter((p) => TIME_RANGE.test(p));
    if (byAnd.length >= 2) return byAnd;
  }

  return [cleaned];
}

function detectSportType(segment: string): string {
  const f = fold(segment);
  if (/padel/.test(f)) return 'Padel';
  if (/stoln.*tenis|ping.?pong|table.?tennis/.test(f)) return 'Stolný tenis';
  if (/squash/.test(f)) return 'Squash';
  if (/bedminton|badminton/.test(f)) return 'Bedminton';
  return 'Tenis';
}

function buildTitle(segment: string, seriesTitle: string | null): string {
  let title = segment
    .replace(TIME_RANGE, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\-–—:\s]+|[.\-–—:\s]+$/g, '')
    .trim();

  // Drop seasonal section headers glued in front of the real activity.
  title = title
    .replace(/^ukon[cč]enie\s+letnej\s+sez[oó]ny\.?\s*/i, '')
    .replace(/^ukon[cč]enie\s+zimnej\s+sez[oó]ny\.?\s*/i, '')
    .trim();

  if (!title || title.length < 4) {
    title = seriesTitle?.trim() || 'Športové podujatie';
  }

  // Capitalize first letter if the source started mid-sentence.
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function buildDescription(opts: {
  segment: string;
  seriesTitle: string | null;
  isTournament: boolean;
  isForWomenOnly: boolean;
  formatHint: 'doubles' | 'singles' | null;
  startHour: number;
  startMinute: number;
  endHour: number | null;
  endMinute: number | null;
}): string {
  const bits: string[] = [];
  if (opts.seriesTitle) bits.push(`Séria: ${opts.seriesTitle}.`);
  if (opts.isTournament) {
    bits.push(
      opts.isForWomenOnly
        ? 'Turnaj s otvorenou prihláškou — kategória ženy.'
        : 'Turnaj s otvorenou prihláškou.',
    );
  }
  if (opts.formatHint === 'doubles') bits.push('Formát: štvorhra (páry).');
  if (opts.formatHint === 'singles') bits.push('Formát: dvojhra.');
  const start = `${String(opts.startHour).padStart(2, '0')}:${String(opts.startMinute).padStart(2, '0')}`;
  if (opts.endHour != null && opts.endMinute != null) {
    const end = `${String(opts.endHour).padStart(2, '0')}:${String(opts.endMinute).padStart(2, '0')}`;
    bits.push(`Čas: ${start}–${end}.`);
  } else {
    bits.push(`Začiatok: ${start}.`);
  }
  const trimmedSeg = opts.segment.replace(/\s+/g, ' ').trim().slice(0, 160);
  if (trimmedSeg && !bits.some((b) => fold(b).includes(fold(trimmedSeg).slice(0, 24)))) {
    bits.push(trimmedSeg);
  }
  return bits.join(' ').slice(0, 400);
}

function parseSegment(
  segment: string,
  ctx: { year: number; month: number; day: number; seriesTitle: string | null },
): AnnouncementActivity | null {
  // Strip seasonal section headers glued before the real activity
  // ("Ukončenie letnej sezóny. Tenisový turnaj žien …").
  const cleanedSegment = segment
    .replace(/^ukon[cč]enie\s+(letnej|zimnej)\s+sez[oó]ny\.?\s*/i, '')
    .replace(/^za[cč]iatok\s+(letnej|zimnej)\s+sez[oó]ny\.?\s*/i, '')
    .trim();
  const folded = fold(cleanedSegment);
  if (!folded) return null;

  const time = cleanedSegment.match(TIME_RANGE);
  if (!time) return null;

  // Pure operational lines (brigáda, stavanie, prázdniny) — even with a clock.
  if (SKIP_ACTIVITY.test(folded) && !TOURNAMENT_HINT.test(folded)) return null;

  const startHour = Number(time[1]);
  const startMinute = Number(time[2]);
  const endHour = time[3] != null ? Number(time[3]) : null;
  const endMinute =
    time[4] != null && time[4] !== ''
      ? Number(time[4])
      : endHour != null
        ? 0
        : null;

  if (startHour > 23 || startMinute > 59) return null;
  if (endHour != null && (endHour > 23 || (endMinute ?? 0) > 59)) return null;

  const isTournament = TOURNAMENT_HINT.test(folded);
  // Require tournament / explicit playable sport activity — skip vague timed chores.
  if (!isTournament && !/tenis|padel|tréning|trening|lekcia|open\b|cup\b/i.test(folded)) {
    return null;
  }

  const isForWomenOnly = WOMEN_HINT.test(folded);
  const isForKids = KIDS_HINT.test(folded);
  const formatHint: 'doubles' | 'singles' | null = DOUBLES_HINT.test(folded)
    ? 'doubles'
    : SINGLES_HINT.test(folded)
      ? 'singles'
      : null;

  const title = buildTitle(cleanedSegment, ctx.seriesTitle);
  const description = buildDescription({
    segment: cleanedSegment,
    seriesTitle: ctx.seriesTitle,
    isTournament,
    isForWomenOnly,
    formatHint,
    startHour,
    startMinute,
    endHour,
    endMinute,
  });

  return {
    title,
    seriesTitle: ctx.seriesTitle,
    year: ctx.year,
    month: ctx.month,
    day: ctx.day,
    startHour,
    startMinute,
    endHour,
    endMinute,
    isTournament,
    isForWomenOnly,
    isForKids,
    formatHint,
    sportType: detectSportType(cleanedSegment),
    description,
    rawSegment: cleanedSegment,
  };
}

function extractSeriesTitle(text: string): string | null {
  const heading =
    text.match(/^\s*#\s*(.+)$/m)?.[1]?.trim() ||
    text.match(/Tenisov[aá]\s+jese[nň]/i)?.[0] ||
    text.match(/Letn[aá]\s+sezona/i)?.[0] ||
    null;
  return heading?.replace(/\s+/g, ' ').trim() || null;
}

/**
 * True when the page body looks like a multi-date announcement calendar
 * (day.month. lines with activity copy), not a weekly rozvrh grid.
 */
export function looksLikeAnnouncementCalendar(text: string): boolean {
  const sample = text.slice(0, 8000);
  const dated = sample.match(/(?:^|\n)\s*\d{1,2}\s*\.\s*\d{1,2}\s*\./g);
  if (!dated || dated.length < 2) return false;
  return TIME_RANGE.test(sample) || TOURNAMENT_HINT.test(fold(sample));
}

/**
 * Parse dated announcement body into discrete playable activities.
 * One calendar day with "ženy … a mužská štvorhra …" → two activities.
 */
export function splitAnnouncementCalendar(
  text: string,
  opts?: { now?: Date; seriesTitle?: string | null },
): AnnouncementActivity[] {
  const now = opts?.now ?? new Date();
  const seriesTitle = opts?.seriesTitle ?? extractSeriesTitle(text);
  const normalized = text.replace(/\r\n/g, '\n');
  const out: AnnouncementActivity[] = [];
  const seen = new Set<string>();

  // Skip multi-day holiday ranges (29.10-1.11 …) — not playable slots.
  const rangeSkip = new Set<string>();
  for (const m of normalized.matchAll(DATE_RANGE_LINE)) {
    rangeSkip.add(`${m[1]}.${m[2]}-${m[3]}.${m[4]}`);
    void rangeSkip;
  }

  for (const m of normalized.matchAll(DATE_LINE)) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = resolveYear(month, m[3] ? Number(m[3]) : null, now);
    if (day < 1 || day > 31 || month < 1 || month > 12) continue;

    const body = (m[4] ?? '').trim();
    if (!body) continue;
    if (DATE_RANGE_LINE.test(m[0])) continue;

    for (const segment of splitActivitySegments(body)) {
      const activity = parseSegment(segment, { year, month, day, seriesTitle });
      if (!activity) continue;
      const key = [
        activity.year,
        activity.month,
        activity.day,
        activity.startHour,
        activity.startMinute,
        fold(activity.title),
      ].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(activity);
    }
  }

  return out;
}

/** ISO-8601 local Bratislava wall times (+02:00 / +01:00 approximated as offset string). */
export function activityToIsoStart(activity: AnnouncementActivity, offset = '+02:00'): string {
  const y = String(activity.year).padStart(4, '0');
  const mo = String(activity.month).padStart(2, '0');
  const d = String(activity.day).padStart(2, '0');
  const h = String(activity.startHour).padStart(2, '0');
  const mi = String(activity.startMinute).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}:00${offset}`;
}

export function activityToIsoEnd(activity: AnnouncementActivity, offset = '+02:00'): string | null {
  if (activity.endHour == null || activity.endMinute == null) return null;
  const y = String(activity.year).padStart(4, '0');
  const mo = String(activity.month).padStart(2, '0');
  const d = String(activity.day).padStart(2, '0');
  const h = String(activity.endHour).padStart(2, '0');
  const mi = String(activity.endMinute).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}:00${offset}`;
}
