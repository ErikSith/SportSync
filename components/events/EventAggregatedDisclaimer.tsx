interface EventAggregatedDisclaimerProps {
  sourceName?: string | null;
  compact?: boolean;
}

export function EventAggregatedDisclaimer({
  sourceName,
  compact = false,
}: EventAggregatedDisclaimerProps) {
  return (
    <aside
      role="note"
      className={
        compact
          ? 'flex gap-2.5 rounded-xl border border-orange-400/25 bg-orange-400/[0.06] px-3 py-2.5'
          : 'flex gap-3 rounded-xl border border-orange-400/30 bg-orange-400/[0.07] px-4 py-3.5'
      }
    >
      <span
        className="material-symbols-outlined shrink-0 text-orange-300/90"
        style={{ fontSize: compact ? 18 : 20, fontVariationSettings: "'FILL' 0" }}
        aria-hidden
      >
        info
      </span>
      <div className="min-w-0 space-y-1">
        <p
          className={
            compact
              ? 'font-body-md text-[12px] leading-relaxed text-on-surface-variant'
              : 'font-body-md text-sm leading-relaxed text-on-surface-variant sm:text-[13px]'
          }
        >
          Informácie o tomto evente boli automaticky spracované z verejne zverejnených zdrojov
          organizátora. Aplikácia neprevádzkuje tento event ani neprijíma registrácie. Pre overenie
          voľných kapacít a definitívnu registráciu prejdite na oficiálnu stránku organizátora.
        </p>
        {sourceName ? (
          <p className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-orange-300/70">
            Zdroj: {sourceName}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
