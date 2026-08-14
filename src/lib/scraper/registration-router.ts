/**
 * Registration router: aggregated / scraped listings never take in-app signups.
 * Users are sent to `originalUrl` (stored as ticketUrl, then sourceUrl).
 */

export interface RegistrationListing {
  isAggregated?: boolean | null;
  source?: string | null;
  sourceUrl?: string | null;
  ticketUrl?: string | null;
}

export type RegistrationTarget =
  | { mode: 'in-app' }
  | { mode: 'external'; url: string }
  | { mode: 'unavailable' };

function firstHttpUrl(...candidates: Array<string | null | undefined>): string | null {
  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.toString();
      }
    } catch {
      // skip invalid
    }
  }
  return null;
}

export function isAggregatedListing(row: RegistrationListing): boolean {
  if (typeof row.isAggregated === 'boolean') return row.isAggregated;
  return Boolean(row.source);
}

/** Official organizer / booking URL (Gemini `originalUrl`). */
export function resolveBookingUrl(row: RegistrationListing): string | null {
  return firstHttpUrl(row.ticketUrl, row.sourceUrl);
}

export function resolveRegistrationTarget(row: RegistrationListing): RegistrationTarget {
  if (!isAggregatedListing(row)) return { mode: 'in-app' };
  const url = resolveBookingUrl(row);
  if (!url) return { mode: 'unavailable' };
  return { mode: 'external', url };
}

export interface ExternalRegistrationResponse {
  ok: true;
  redirect: true;
  externalUrl: string;
}

export function externalRegistrationPayload(url: string): ExternalRegistrationResponse {
  return { ok: true, redirect: true, externalUrl: url };
}
