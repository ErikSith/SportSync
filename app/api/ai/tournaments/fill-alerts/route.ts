import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runTournamentAgent } from '@/lib/ai/tournament-agent';

/** Lightweight fill alerts endpoint — called client-side, not on SSR page load. */
export async function GET() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const analyses = await runTournamentAgent();
  const alerts = analyses.flatMap((analysis) =>
    analysis.campaigns.slice(0, 1).map((campaign) => ({
      tournamentId: analysis.tournamentId,
      tournamentName: analysis.tournamentName,
      spotsRemaining: analysis.spotsRemaining,
      ...campaign,
    })),
  );

  return NextResponse.json({ ok: true, alerts });
}
