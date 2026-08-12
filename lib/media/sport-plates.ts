import { createHash } from 'crypto';

/** Brand-safe sport base colors for Cover Factory composit (no purple). */
export const SPORT_PLATE_COLORS: Record<string, { from: string; to: string; label: string }> = {
  PADEL: { from: '#064e3b', to: '#16a34a', label: 'PADEL' },
  TENNIS: { from: '#14532d', to: '#22c55e', label: 'TENNIS' },
  FOOTBALL: { from: '#5f1500', to: '#c84b24', label: 'FOOTBALL' },
  BASKETBALL: { from: '#7c2d12', to: '#ea580c', label: 'BASKETBALL' },
  HOCKEY: { from: '#0c4a6e', to: '#0284c7', label: 'HOCKEY' },
  FITNESS: { from: '#5f1500', to: '#c84b24', label: 'FITNESS' },
  COMBAT: { from: '#1c1917', to: '#78716c', label: 'COMBAT' },
  RUNNING: { from: '#78350f', to: '#d97706', label: 'RUNNING' },
  SWIMMING: { from: '#0e7490', to: '#22d3ee', label: 'SWIM' },
  SURFING: { from: '#0e7490', to: '#06b6d4', label: 'SURF' },
  OTHER: { from: '#5f1500', to: '#e9c349', label: 'SPORT' },
};

export function plateForSport(sport: string): { from: string; to: string; label: string } {
  const key = sport.toUpperCase();
  return SPORT_PLATE_COLORS[key] ?? SPORT_PLATE_COLORS.OTHER!;
}

/** Deterministic hue offset 0–359 from coverKey hex. */
export function hueFromCoverKey(coverKey: string): number {
  const slice = coverKey.slice(0, 8);
  return parseInt(slice, 16) % 360;
}

export function normalizeEventTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\d{1,2}[:.]\d{2}/g, ' ')
    .replace(/\d{1,2}\s*[.\-/]\s*\d{1,2}(?:\s*[.\-/]\s*\d{2,4})?/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeCoverKey(venueId: string, sport: string, title: string): string {
  const payload = `${venueId}|${sport.toUpperCase()}|${normalizeEventTitle(title)}`;
  return createHash('sha256').update(payload).digest('hex');
}
