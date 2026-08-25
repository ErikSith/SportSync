/** Shared cron gate for Edge routes — keep this file tiny (no scrapers). */

export function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const agentKey = request.headers.get('x-agent-key');
  if (agentKey === cronSecret) return true;

  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${cronSecret}`) return true;

  return false;
}
