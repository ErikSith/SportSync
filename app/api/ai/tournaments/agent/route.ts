import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runTournamentAgent } from '@/lib/ai/tournament-agent';

function isAuthorizedCron(request: Request): boolean {
  const agentKey = request.headers.get('x-agent-key');
  const cronSecret = process.env.CRON_SECRET;
  return !!(cronSecret && agentKey === cronSecret);
}

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const analyses = await runTournamentAgent();

  return NextResponse.json({
    ok: true,
    scanned: analyses.length,
    alerts: analyses.flatMap((analysis) =>
      analysis.campaigns.map((campaign) => ({
        tournamentId: analysis.tournamentId,
        tournamentName: analysis.tournamentName,
        spotsRemaining: analysis.spotsRemaining,
        ...campaign,
      })),
    ),
    analyses,
  });
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Cron secret required' }, { status: 401 });
  }

  const analyses = await runTournamentAgent();
  return NextResponse.json({ ok: true, analyses });
}
