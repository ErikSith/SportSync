import Link from 'next/link';
import type { FillCampaign } from '@/lib/ai/tournament-agent';

interface TournamentFillAlertsProps {
  alerts: Array<FillCampaign & { tournamentId: string; tournamentName: string; spotsRemaining: number }>;
}

export function TournamentFillAlerts({ alerts }: TournamentFillAlertsProps) {
  if (alerts.length === 0) return null;

  const top = alerts.slice(0, 3);

  return (
    <section className="glass-panel rounded-xl p-5 border border-primary/25 space-y-4">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary">campaign</span>
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Open spots nearby</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">Tournaments still looking for players in your area.</p>
        </div>
      </div>
      <div className="space-y-3">
        {top.map((alert) => (
          <Link
            key={`${alert.tournamentId}-${alert.type}`}
            href="/tournaments"
            className="block rounded-lg p-4 border border-white/10 bg-surface-container/30 hover:bg-surface-container transition-colors"
          >
            <p className="font-label-caps text-label-caps text-primary uppercase">{alert.headline}</p>
            <p className="font-body-md text-body-md text-on-surface mt-1">{alert.tournamentName}</p>
            <p className="font-body-md text-sm text-on-surface-variant mt-1">{alert.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
