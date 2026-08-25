/**
 * Edge-safe Classifier twin — žiadne LLM, žiadny Python.
 *
 * Cron persistuje events (participation_mode, for_kids, for_women).
 * Tento mapper prebublá JSON do <SportsTabs /> bez Cloudflare CPU na inference.
 */

import type { EventCardData } from '@/lib/data/events';
import type { SportEventCard, TargetAudience } from '@/components/sports/SportsTabs';
import { sportDisplayLabel } from '@/lib/constants/sports';
import { SCRAPING_SOURCES } from '@/lib/scrape/scraping-sources';

function boroughForSource(source: string | null): string | null {
  if (!source) return null;
  const row = SCRAPING_SOURCES.find((item) => item.adapterId === source);
  if (!row) return null;
  if (row.borough === 'Dynamic') return null;
  return row.borough;
}

function targetAudience(event: EventCardData): TargetAudience[] {
  const tags: TargetAudience[] = [];
  if (event.forKids) tags.push('KIDS');
  if (event.forWomen) tags.push('WOMEN');
  const blob = `${event.title} ${event.description ?? ''}`;
  if (/pre\s+muž|pre\s+muz|pánsky|pansky|men'?s\s+only/i.test(blob)) {
    tags.push('MEN');
  }
  if (tags.length === 0) return ['ALL'];
  return tags;
}

/** Classifier Agent kontrakt pre UI — z už persistovaného scrape riadku. */
export function eventCardToSportEvent(event: EventCardData): SportEventCard {
  const location =
    boroughForSource(event.source) ?? event.venueName ?? event.city ?? 'Bratislava';
  const description = (event.description ?? '').trim();

  return {
    title: event.title,
    location,
    participation_type: event.participationMode === 'spectator' ? 'PASSIVE_SPECTATOR' : 'ACTIVE',
    target_audience: targetAudience(event),
    category: sportDisplayLabel(event.sport),
    description:
      description.length >= 10
        ? description.slice(0, 2000)
        : `${event.title} — ${location}.`,
  };
}
