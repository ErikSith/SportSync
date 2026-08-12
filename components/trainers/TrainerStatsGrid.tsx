interface TrainerStatsGridProps {
  yearsExp: number;
  sessionCount: number;
  rating: string;
}

export function TrainerStatsGrid({ yearsExp, sessionCount, rating }: TrainerStatsGridProps) {
  return (
    <section className="grid grid-cols-3 gap-4">
      <div className="glass-panel rounded-lg p-6 flex flex-col items-center justify-center text-center glow-hover transition-all">
        <span className="material-symbols-outlined text-primary-container text-3xl mb-2">work_history</span>
        <span className="font-headline-md text-headline-md mb-1">{yearsExp}+</span>
        <span className="font-label-caps text-label-caps text-on-surface-variant">Years Exp</span>
      </div>
      <div className="glass-panel rounded-lg p-6 flex flex-col items-center justify-center text-center glow-hover transition-all">
        <span className="material-symbols-outlined text-primary-container text-3xl mb-2">group</span>
        <span className="font-headline-md text-headline-md mb-1">{sessionCount}+</span>
        <span className="font-label-caps text-label-caps text-on-surface-variant">Sessions</span>
      </div>
      <div className="glass-panel rounded-lg p-6 flex flex-col items-center justify-center text-center glow-hover transition-all">
        <span className="material-symbols-outlined text-secondary text-3xl mb-2">star</span>
        <span className="font-headline-md text-headline-md mb-1 text-secondary">{rating}</span>
        <span className="font-label-caps text-label-caps text-on-surface-variant">Rating</span>
      </div>
    </section>
  );
}
