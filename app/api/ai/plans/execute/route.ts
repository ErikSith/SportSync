import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executePendingAiTasks } from '@/lib/ai/plan-executor';

export async function POST(request: Request) {
  const agentKey = request.headers.get('x-agent-key');
  const cronSecret = process.env.CRON_SECRET;
  const isAuthorizedCron = cronSecret && agentKey === cronSecret;

  if (!isAuthorizedCron) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }
  }

  const result = await executePendingAiTasks();
  return NextResponse.json({ ok: true, ...result });
}
