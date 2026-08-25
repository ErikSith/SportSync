import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAuthorizedCron } from '@/lib/cron/authorize';
import { scrapeSlotIndex, SCRAPE_ADAPTER_IDS } from '@/lib/scrape/adapter-registry';
import { runScrapeAdapterShard } from '@/lib/scrape/run';

/** Cloudflare Pages / Workers — keep Edge; Node FS lives only in source-health-fs (scripts). */
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
/** One Cheerio adapter — keep Worker CPU tiny. Do not raise this to run the fleet. */
export const maxDuration = 30;

/**
 * Cloudflare-safe scrape cron.
 *
 * NEVER calls runAllScrapers() here — that blows Worker CPU (Cheerio × 26 sites).
 * Each invocation parses **one** adapter (30 min round-robin ≈ 12 h per venue).
 *
 * Optional: ?slot=3  or  ?adapter=hc-slovan  (debug / manual)
 */
export async function POST(request: Request) {
  const cronOk = isAuthorizedCron(request);

  if (!cronOk) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const slotParam = url.searchParams.get('slot');
  const adapterParam = url.searchParams.get('adapter');

  let slot = scrapeSlotIndex();
  if (slotParam != null && slotParam !== '') {
    const parsed = Number(slotParam);
    if (!Number.isFinite(parsed)) {
      return NextResponse.json({ ok: false, error: 'Invalid slot' }, { status: 400 });
    }
    slot = parsed;
  } else if (adapterParam) {
    const index = (SCRAPE_ADAPTER_IDS as readonly string[]).indexOf(adapterParam);
    if (index < 0) {
      return NextResponse.json({ ok: false, error: 'Unknown adapter' }, { status: 400 });
    }
    slot = index;
  }

  try {
    const report = await runScrapeAdapterShard(slot);
    return NextResponse.json({ ok: true, mode: 'shard', ...report });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scrape shard failed';
    console.error('[scrape-events:shard]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
