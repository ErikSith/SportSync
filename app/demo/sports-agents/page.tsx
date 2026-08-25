import Link from 'next/link';
import { SportsTabs } from '@/components/sports/SportsTabs';
import { SAMPLE_CLASSIFIED_EVENTS } from '@/lib/demo/sports-agent-sample';
import { eventCardToSportEvent } from '@/lib/agents/from-event-card';
import { getAllActiveEventsFeed } from '@/lib/data/events';
import { PageTitleRow } from '@/components/shared/PageTitleRow';

export const runtime = 'edge';

/**
 * UI Agent — JSON zo scrape cronu (participation_mode / for_kids / for_women),
 * nie z LLM na Edge.
 */
export default async function SportsAgentsDemoPage() {
  const feed = await getAllActiveEventsFeed({ participationMode: 'all' });
  const live = feed.events.slice(0, 48).map(eventCardToSportEvent);
  const events = live.length > 0 ? live : SAMPLE_CLASSIFIED_EVENTS;

  return (
    <main className="pt-20 pb-28 px-container-margin-mobile md:px-container-margin-desktop max-w-screen-lg mx-auto">
      <PageTitleRow
        title={
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">
            BA Sports Agents
          </h1>
        }
        subtitle={
          <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
            Scrape shard cron → DB → SportsTabs. LLM/Python beží len v Node, nie o polnoci na
            Cloudflare.
          </p>
        }
      />

      <p className="mt-2 mb-6 text-sm text-on-surface-variant max-w-2xl">
        {live.length > 0
          ? `${live.length} kariet z feedu (Classifier mapovanie bez LLM).`
          : 'Feed je prázdny — zobrazujem sample JSON z agents/fixtures.'}
      </p>

      <SportsTabs events={events} />

      <p className="mt-8 text-center text-xs text-zinc-600">
        <Link href="/demo" className="underline hover:text-zinc-400">
          ← späť na Demo
        </Link>
      </p>
    </main>
  );
}
