/**
 * Detect booking-widget embeds in raw host HTML (before iframe/script strip).
 */
export type BookingEmbed =
  | { provider: 'reenio'; subject: string; widgetCode?: string }
  | { provider: string; subject?: string };

/** Match both normal and JSON-escaped (https:\/\/) Reenio URLs. */
function normalizeEmbedHtml(html: string): string {
  // JSON-in-HTML often stores urls as https:\/\/host\/path
  return html.replace(/\\\//g, '/');
}

const REENIO_SUBDOMAIN =
  /https?:\/\/([a-z0-9-]+)\.reenio\.(sk|cz|com)(?:\/|[?"']|$)/i;
const REENIO_WIDGET =
  /https?:\/\/(?:www\.)?reenio\.(sk|cz|com)\/(?:sk|cs|en)\/([A-Z0-9]+)\/widget/i;

/**
 * Sniff Reenio (and stubs for future providers) from raw page HTML.
 */
export function detectBookingEmbed(html: string): BookingEmbed | null {
  if (!html || html.length < 20) return null;
  const normalized = normalizeEmbedHtml(html);

  const sub = normalized.match(REENIO_SUBDOMAIN);
  if (sub?.[1] && sub[1].toLowerCase() !== 'www' && sub[1].toLowerCase() !== 'cdn') {
    return { provider: 'reenio', subject: sub[1].toLowerCase() };
  }

  const widget = normalized.match(REENIO_WIDGET);
  if (widget?.[2]) {
    return {
      provider: 'reenio',
      subject: '',
      widgetCode: widget[2],
    };
  }

  if (/reenio/i.test(html) && /widget-iframe|reenio-iframe/i.test(html)) {
    return { provider: 'reenio', subject: '' };
  }

  return null;
}

/** Resolve subject from widget-iframe.js CONFIG.url when only widget code is known. */
export async function resolveReenioSubjectFromWidgetCode(
  widgetCode: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const url = `https://reenio.sk/sk/${encodeURIComponent(widgetCode)}/widget-iframe.js`;
  const res = await fetchImpl(url, {
    headers: {
      'User-Agent':
        'SportSyncBot/1.0 (+https://sportsync.app; schedule ingest)',
      Accept: '*/*',
    },
  });
  if (!res.ok) return null;
  const js = await res.text();
  const normalized = normalizeEmbedHtml(js);
  const m = normalized.match(REENIO_SUBDOMAIN);
  if (m?.[1] && m[1].toLowerCase() !== 'www') return m[1].toLowerCase();
  return null;
}
