'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FillAlert {
  tournamentId: string;
  tournamentName: string;
  spotsRemaining: number;
  title: string;
  body: string;
  urgency: string;
}

export function TournamentFillAlertsClient() {
  const [alerts, setAlerts] = useState<FillAlert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetch('/api/ai/tournaments/fill-alerts')
      .then((r) => r.json())
      .then((body: { alerts?: FillAlert[] }) => {
        setAlerts(body.alerts ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || alerts.length === 0) return null;

  return (
    <section className="space-y-3">
      {alerts.slice(0, 3).map((alert) => (
        <Link
          key={alert.tournamentId}
          href="/tournaments"
          className="glass-panel rounded-xl p-4 border border-secondary/30 flex items-start gap-4 hover:border-secondary/60 transition-all block"
        >
          <span className="material-symbols-outlined text-secondary shrink-0">campaign</span>
          <div>
            <p className="font-headline-md text-[16px] text-on-surface">{alert.title}</p>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">{alert.body}</p>
            <p className="font-label-caps text-[10px] text-secondary uppercase mt-2">
              {alert.spotsRemaining} spots left · {alert.tournamentName}
            </p>
          </div>
        </Link>
      ))}
    </section>
  );
}
