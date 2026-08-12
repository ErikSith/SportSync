import Link from 'next/link';
import type { TournamentFillAnalysis } from '@/lib/ai/tournament-agent';

interface TournamentAiAgentPanelProps {
  analysis: TournamentFillAnalysis;
}

const URGENCY_STYLES = {
  low: 'border-white/10 bg-surface-container/30',
  medium: 'border-primary/30 bg-primary-container/10',
  high: 'border-secondary/40 bg-secondary-container/10',
  critical: 'border-error/40 bg-error-container/10',
} as const;

export function TournamentAiAgentPanel({ analysis }: TournamentAiAgentPanelProps) {
  if (!analysis.needsFill && analysis.campaigns.length === 0) return null;

  return (
    <section className="glass-panel rounded-xl p-6 border border-primary/25 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary-container/15 border border-primary/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">groups</span>
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">Fill status</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              {analysis.spotsRemaining} spot{analysis.spotsRemaining === 1 ? '' : 's'} open · {Math.round(analysis.fillPercent)}% filled
            </p>
          </div>
        </div>
        <span className="font-label-caps text-label-caps uppercase px-3 py-1 rounded-full bg-primary-container/20 text-primary border border-primary/30">
          Registration open
        </span>
      </div>

      {analysis.campaigns.length > 0 && (
        <div className="space-y-3">
          <p className="font-label-caps text-label-caps text-tertiary uppercase">Community posts</p>
          {analysis.campaigns.map((campaign) => (
            <div
              key={`${campaign.type}-${campaign.headline}`}
              className={`rounded-lg p-4 border ${URGENCY_STYLES[campaign.urgency]}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-[18px]">campaign</span>
                <h4 className="font-headline-md text-[18px] text-on-surface">{campaign.headline}</h4>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">{campaign.body}</p>
              <p className="font-label-caps text-label-caps text-primary mt-2 uppercase">{campaign.cta}</p>
            </div>
          ))}
        </div>
      )}

      {analysis.candidates.length > 0 && (
        <div className="space-y-3">
          <p className="font-label-caps text-label-caps text-tertiary uppercase">Suggested players</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.candidates.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 bg-surface-container/40 rounded-lg p-3 border border-white/5"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-high border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {player.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-label-caps text-[10px] text-on-surface-variant">
                      {player.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-body-md text-body-md text-on-surface truncate">{player.name}</p>
                  <p className="font-label-caps text-label-caps text-on-surface-variant truncate">{player.matchReason}</p>
                </div>
                <span className="font-label-caps text-label-caps text-secondary ml-auto shrink-0">
                  {player.karmaScore.toLocaleString('en-US')} karma
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/tournaments"
        className="inline-flex items-center gap-2 font-label-caps text-label-caps text-primary hover:text-primary-fixed-dim transition-colors"
      >
        View in tournaments
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </Link>
    </section>
  );
}
