import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { SignalName } from '@/lib/telemetry/track';

const signalSchema = z.object({
  eventName: z.string().min(1).max(64),
  payload: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  ts: z.number().optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = signalSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid signal' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase.from('platform_signals').insert({
    user_id: auth.user?.id ?? null,
    event_name: parsed.data.eventName as SignalName,
    payload: parsed.data.payload ?? {},
  });

  // Gracefully accept if table not yet migrated (dev environments).
  if (error && !error.message.includes('platform_signals')) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[telemetry]', error.message);
    }
  }

  return NextResponse.json({ ok: true });
}
