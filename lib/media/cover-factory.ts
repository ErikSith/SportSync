import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  computeCoverKey,
  hueFromCoverKey,
  plateForSport,
} from '@/lib/media/sport-plates';
import { DEFAULT_COVERS } from '@/lib/scrape/types';

export const EVENT_COVERS_BUCKET = 'event-covers';

export interface CoverFactoryInput {
  venueId: string | null;
  sport: string;
  title: string;
}

/**
 * Rights-safe SportAvatar cover: venue + sport + normalized title → stable WebP in Storage.
 * Never uses third-party venue photography.
 */
export async function resolveEventCover(input: CoverFactoryInput): Promise<string> {
  const venueId = input.venueId ?? 'no-venue';
  const coverKey = await computeCoverKey(venueId, input.sport, input.title);
  const path = `${coverKey}.webp`;
  const fallback =
    DEFAULT_COVERS[input.sport.toUpperCase()] ?? DEFAULT_COVERS.OTHER ?? DEFAULT_COVERS.FITNESS!;

  try {
    const supabase = createAdminClient();
    const { data: existing } = supabase.storage.from(EVENT_COVERS_BUCKET).getPublicUrl(path);
    // Probe whether object exists
    const { data: listed } = await supabase.storage.from(EVENT_COVERS_BUCKET).list('', {
      search: coverKey,
      limit: 1,
    });
    if (listed?.some((f) => f.name === path || f.name.startsWith(coverKey))) {
      return existing.publicUrl;
    }

    const buffer = await renderCoverWebp(coverKey, input.sport, input.title);
    const { error } = await supabase.storage.from(EVENT_COVERS_BUCKET).upload(path, buffer, {
      contentType: 'image/webp',
      upsert: true,
    });
    if (error) {
      // Bucket may not exist yet — fall back to SportSync Unsplash plates
      console.warn('[cover-factory] upload failed:', error.message);
      return fallback;
    }
    const { data } = supabase.storage.from(EVENT_COVERS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn('[cover-factory]', err instanceof Error ? err.message : err);
    return fallback;
  }
}

async function renderCoverWebp(coverKey: string, sport: string, title: string): Promise<Buffer> {
  const plate = plateForSport(sport);
  const hue = hueFromCoverKey(coverKey);
  const angle = 120 + (hue % 60);
  const shortTitle = escapeXml(title.slice(0, 42));
  const label = escapeXml(plate.label);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0%" stop-color="${plate.from}"/>
      <stop offset="100%" stop-color="${plate.to}"/>
    </linearGradient>
    <pattern id="grain" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="${(hue % 7) + 1}" cy="${(hue % 5) + 1}" r="0.8" fill="rgba(255,255,255,0.08)"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#grain)"/>
  <text x="64" y="120" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700"
        letter-spacing="4" fill="rgba(255,255,255,0.75)">${label}</text>
  <text x="64" y="320" font-family="Georgia, serif" font-size="52" font-weight="700"
        fill="#ffffff">${shortTitle}</text>
  <text x="64" y="560" font-family="Arial, Helvetica, sans-serif" font-size="22"
        fill="rgba(255,255,255,0.55)">SportSync</text>
</svg>`;

  return sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { computeCoverKey } from '@/lib/media/sport-plates';
