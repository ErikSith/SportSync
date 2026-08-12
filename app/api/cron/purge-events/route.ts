import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cleanupExpiredEvents } from '@/lib/retention/events';

export const runtime = 'edge';

export const maxDuration = 60;

function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const agentKey = request.headers.get('x-agent-key');
  if (agentKey === cronSecret) return true;

  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${cronSecret}`) return true;

  return false;
}

export async function POST(request: Request) {
  const cronOk = isAuthorizedCron(request);

  if (!cronOk) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
  }

  try {
    const result = await cleanupExpiredEvents();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Retention cleanup failed';
    console.error('[RetentionEngine]', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
