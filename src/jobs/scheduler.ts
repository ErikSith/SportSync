import { EventStatus, LobbyRequestStatus, MercenaryStatus } from '@prisma/client';
import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { scanForMissingPlayers } from '../services/mercenaryService';

/**
 * Background jobs that keep the system consistent even with zero human input:
 *  - every 5 min: Mercenary +1 scan (events starting within 60 min that miss players)
 *  - every 10 min: expire stale lobby requests and mercenary calls, close past events
 *  - every 30 min: scrape-events shard (1 venue adapter — not a midnight Cheerio burst)
 *  - 00:00 UTC: midnight-sync (SQL purge only, no HTML scrape)
 */
export function startScheduler(): void {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await scanForMissingPlayers('system-cron');
      if (result.created.length > 0) {
        console.log(`[mercenary-scan] raised ${result.created.length} emergency call(s)`);
      }
    } catch (err) {
      console.error('[mercenary-scan] failed', err);
    }
  });

  cron.schedule('*/10 * * * *', async () => {
    const now = new Date();
    try {
      const expiredRequests = await prisma.lobbyRequest.updateMany({
        where: {
          status: { in: [LobbyRequestStatus.PENDING, LobbyRequestStatus.PROCESSING_BY_AI] },
          preferredTime: { lt: now },
        },
        data: { status: LobbyRequestStatus.EXPIRED },
      });

      const expiredCalls = await prisma.mercenaryNotification.updateMany({
        where: { status: MercenaryStatus.ACTIVE, expiresAt: { lt: now } },
        data: { status: MercenaryStatus.EXPIRED },
      });

      const startedEvents = await prisma.event.updateMany({
        where: { status: { in: [EventStatus.OPEN, EventStatus.FULL] }, dateTime: { lt: now } },
        data: { status: EventStatus.IN_PROGRESS },
      });

      if (expiredRequests.count || expiredCalls.count || startedEvents.count) {
        console.log(
          `[housekeeping] expired ${expiredRequests.count} request(s), ${expiredCalls.count} mercenary call(s); moved ${startedEvents.count} event(s) to IN_PROGRESS`,
        );
      }
    } catch (err) {
      console.error('[housekeeping] failed', err);
    }
  });

  cron.schedule('0 0 * * *', async () => {
    try {
      const base =
        process.env.SPORTSYNC_APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'http://localhost:3000';
      const secret = process.env.CRON_SECRET;
      if (!secret) {
        console.warn('[midnight-sync] CRON_SECRET missing — skip');
        return;
      }
      const res = await fetch(`${base.replace(/\/$/, '')}/api/cron/midnight-sync`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${secret}` },
      });
      const body = await res.text();
      console.log(`[midnight-sync] HTTP ${res.status} ${body.slice(0, 400)}`);
    } catch (err) {
      console.error('[midnight-sync] failed', err);
    }
  });

  // One adapter per slot — do not call runAllScrapers against the Edge app.
  cron.schedule('*/30 * * * *', async () => {
    try {
      const base =
        process.env.SPORTSYNC_APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'http://localhost:3000';
      const secret = process.env.CRON_SECRET;
      if (!secret) {
        console.warn('[scrape-events] CRON_SECRET missing — skip shard');
        return;
      }
      const res = await fetch(`${base.replace(/\/$/, '')}/api/cron/scrape-events`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${secret}` },
      });
      const body = await res.text();
      console.log(`[scrape-events:shard] HTTP ${res.status} ${body.slice(0, 400)}`);
    } catch (err) {
      console.error('[scrape-events:shard] failed', err);
    }
  });

  console.log(
    '[scheduler] cron jobs registered (mercenary */5, housekeeping */10, midnight-sync 00:00 UTC purge-only, scrape-events */30 shard)',
  );
}
