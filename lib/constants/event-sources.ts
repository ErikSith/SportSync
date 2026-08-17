import type { ScrapeAdapterId } from '@/lib/scrape/types';

/** Human-readable labels for scrape adapters (shown on aggregated event pages). */
export const SOURCE_DISPLAY_NAMES: Record<ScrapeAdapterId, string> = {
  'sk-slovan': 'Oficiálny web ŠK Slovan',
  'hc-slovan': 'Oficiálny web HC Slovan',
  'gopass-arena': 'Gopass Aréna',
  'form-factory': 'Form Factory',
  'arena-padel': 'Aurial Padel',
  'aurial-padel': 'Aurial Padel Club',
  subdeck: 'Subdeck',
  stz: 'STZ – oficiálny web',
  predpredaj: 'Predpredaj.sk',
  citylife: 'CityLife',
  'padel-ba': 'Padel Bratislava',
  'ntc-ba': 'NTC Bratislava',
  'ofa-mma': 'OFA Gym',
  'chaos-mma': 'Chaos MMA',
  prostor: 'Crossfit Prostor',
  wakelake: 'Wakelake',
  'divoka-voda': 'Divoká Voda Čunovo',
  'pbc-bowling': 'PBC Bowling',
  'bnc-ba': 'BNC Bratislava',
  'sipky-sk': 'Slovenská Šípková Federácia',
  'ba-marathon': 'Bratislava Marathon',
  'stupava-trophy': 'Stupava Trophy',
  'horsky-beh': 'Horský Beh Karpaty',
  'topliga-ba': 'Niké Topliga Bratislava',
  'areal-nevadzova': 'Športový areál Nevädzová',
  'k2-lezenie': 'K2 Lezecká stena',
  'block-dock': 'Block Dock Bouldering',
  'nivy-zone': 'Nivy Zóna Eventy',
  'venue-web': 'Oficiálny web športoviska',
};

export function sourceDisplayName(source: string | null | undefined, fallback?: string | null): string {
  if (fallback?.trim() && !/web\s*\(gemini\)/i.test(fallback)) return fallback.trim();
  if (!source) return 'Oficiálny web športoviska';
  return SOURCE_DISPLAY_NAMES[source as ScrapeAdapterId] ?? 'Oficiálny web športoviska';
}

export const EVENT_REPORT_REASONS = [
  { value: 'changed_datetime', label: 'Zmenený čas / dátum' },
  { value: 'cancelled', label: 'Zrušený event' },
  { value: 'wrong_price', label: 'Nesprávna cena' },
  { value: 'other', label: 'Iné' },
] as const;

export type EventReportReason = (typeof EVENT_REPORT_REASONS)[number]['value'];

export function isEventReportReason(value: string): value is EventReportReason {
  return EVENT_REPORT_REASONS.some((r) => r.value === value);
}
