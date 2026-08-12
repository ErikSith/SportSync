/**
 * Small date helpers for the crew "Automatic Planning" recurring schedules.
 * No external date library — the app doesn't depend on one and these
 * calculations are simple enough to keep inline.
 */

/** ISO week key ("2026-W29") used to detect "already generated this week". */
export function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const isoDay = d.getUTCDay() || 7; // Monday=1 ... Sunday=7
  d.setUTCDate(d.getUTCDate() + 4 - isoDay);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

export function wasGeneratedThisWeek(lastGeneratedAt: string | Date | null, now = new Date()): boolean {
  if (!lastGeneratedAt) return false;
  const last = typeof lastGeneratedAt === 'string' ? new Date(lastGeneratedAt) : lastGeneratedAt;
  return getWeekKey(last) === getWeekKey(now);
}

/**
 * Next date/time matching `dayOfWeek` (0=Sun..6=Sat, JS Date#getDay
 * convention) and `HH:MM` local time, strictly after `from`.
 */
export function nextOccurrence(dayOfWeek: number, timeOfDay: string, from = new Date()): Date {
  const parts = timeOfDay.split(':');
  const hours = Number(parts[0] ?? 0);
  const minutes = Number(parts[1] ?? 0);
  const result = new Date(from);
  result.setHours(hours, minutes, 0, 0);

  let diff = (dayOfWeek - result.getDay() + 7) % 7;
  if (diff === 0 && result <= from) diff = 7;
  result.setDate(result.getDate() + diff);

  return result;
}
