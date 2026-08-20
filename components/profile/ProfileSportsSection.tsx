'use client';

import { sportDisplayLabel } from '@/lib/constants/sports';
import {
  sportIconName,
  sportSkillLabel,
  type SportSkillLevel,
  type SportSkillsMap,
} from '@/lib/profile/sport-skills';

interface ProfileSportsSectionProps {
  preferredSports: string[];
  sportSkills: SportSkillsMap;
  editable?: boolean;
  onAdd?: () => void;
}

function SkillBars({ level }: { level: SportSkillLevel }) {
  return (
    <div className="flex items-end gap-0.5" aria-hidden>
      {([1, 2, 3, 4] as const).map((step) => (
        <span
          key={step}
          className={`w-1.5 rounded-sm ${
            step <= level ? 'bg-primary-container' : 'bg-white/10'
          }`}
          style={{ height: `${8 + step * 3}px` }}
        />
      ))}
    </div>
  );
}

export function ProfileSportsSection({
  preferredSports,
  sportSkills,
  editable = false,
  onAdd,
}: ProfileSportsSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-headline-md text-[1.1rem] text-on-surface">Moje Športy</h2>
        {editable ? (
          <button
            type="button"
            onClick={onAdd}
            className="font-label-caps text-[11px] uppercase tracking-[0.12em] text-primary-container hover:underline"
          >
            Pridať
          </button>
        ) : null}
      </div>

      {preferredSports.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-surface-container/40 px-4 py-5 text-center font-body-md text-sm text-on-surface-variant">
          Zatiaľ žiadne športy.{editable ? ' Pridaj ich v úprave profilu.' : ''}
        </p>
      ) : (
        <ul className="space-y-2">
          {preferredSports.map((sport) => {
            const key = sport.toUpperCase() as keyof SportSkillsMap;
            const level = (sportSkills[key] ?? 2) as SportSkillLevel;
            return (
              <li
                key={sport}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-surface-container px-3.5 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container/15 text-primary-container">
                  <span className="material-symbols-outlined text-[22px]">{sportIconName(sport)}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body-md text-sm font-semibold text-on-surface">
                    {sportDisplayLabel(sport)}
                  </p>
                  <p className="font-label-caps text-[10px] uppercase tracking-wide text-on-surface-variant">
                    {sportSkillLabel(level)}
                  </p>
                </div>
                <SkillBars level={level} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
