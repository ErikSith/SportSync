import { SHOWCASE_SPECIALIZATIONS } from '@/lib/demo/showcase-trainer-content';

const SPORT_ICONS: Record<string, string> = {
  STRENGTH: 'fitness_center',
  HIIT: 'timer',
  TENNIS: 'sports_tennis',
  PADEL: 'sports_tennis',
  YOGA: 'self_improvement',
  SQUASH: 'sports_tennis',
  RUNNING: 'directions_run',
  CYCLING: 'directions_bike',
};

interface TrainerSpecializationsProps {
  sports: string[];
  isShowcase: boolean;
}

export function TrainerSpecializations({ sports, isShowcase }: TrainerSpecializationsProps) {
  if (isShowcase) {
    return (
      <section>
        <h2 className="font-headline-md text-headline-md mb-4 text-on-surface">Specializations</h2>
        <div className="flex flex-wrap gap-3">
          {SHOWCASE_SPECIALIZATIONS.map((spec) => (
            <span
              key={spec.label}
              className="glass-panel px-4 py-2 rounded-full font-label-caps text-label-caps text-on-background flex items-center gap-2 border border-white/10"
            >
              <span className="material-symbols-outlined text-[16px] text-primary-container">{spec.icon}</span>
              {spec.label}
            </span>
          ))}
        </div>
      </section>
    );
  }

  if (sports.length === 0) return null;

  return (
    <section>
      <h2 className="font-headline-md text-headline-md mb-4 text-on-surface">Specializations</h2>
      <div className="flex flex-wrap gap-3">
        {sports.map((sport) => (
          <span
            key={sport}
            className="glass-panel px-4 py-2 rounded-full font-label-caps text-label-caps text-on-background flex items-center gap-2 border border-white/10"
          >
            <span className="material-symbols-outlined text-[16px] text-primary-container">
              {SPORT_ICONS[sport.toUpperCase()] ?? 'sports'}
            </span>
            {sport.charAt(0) + sport.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
    </section>
  );
}
