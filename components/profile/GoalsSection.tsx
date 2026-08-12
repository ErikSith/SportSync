'use client';

import { useState } from 'react';
import type { UserGoalView } from '@/lib/data/profile-goals';
import { goalEmoji } from '@/lib/constants/goal-templates';
import { LogGoalProgress } from '@/components/profile/LogGoalProgress';
import { SetGoalSheet } from '@/components/profile/SetGoalSheet';

export function GoalProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary-container to-secondary-container transition-all duration-500"
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

interface GoalCompactRowProps {
  goal: UserGoalView;
  readOnly?: boolean;
}

export function GoalCompactRow({ goal, readOnly = false }: GoalCompactRowProps) {
  return (
    <div
      className={`relative flex flex-col gap-2 py-4 border-b border-white/5 last:border-0 ${
        goal.isFeatured ? 'pl-3 border-l-2 border-l-secondary' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center text-lg shrink-0 mt-0.5">
          {goalEmoji(goal.templateKey)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-headline-md text-sm text-on-surface leading-tight">{goal.title}</h3>
            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant shrink-0">{goal.progressLabel}</span>
          </div>
          <div className="mt-2 space-y-1.5">
            <GoalProgressBar percent={goal.progressPercent} />
            {!readOnly && <LogGoalProgress goal={goal} />}
          </div>
        </div>
      </div>
    </div>
  );
}

interface GoalsTabContentProps {
  goals: UserGoalView[];
  onSetGoal: () => void;
}

export function GoalsTabContent({ goals, onSetGoal }: GoalsTabContentProps) {
  const activeGoals = goals.filter((g) => g.status === 'active').slice(0, 3);

  if (activeGoals.length === 0) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="font-body-md text-body-md text-on-surface-variant text-sm">
          Set a goal to show what you&apos;re working toward.
        </p>
        <button
          type="button"
          onClick={onSetGoal}
          className="font-label-caps text-[10px] uppercase px-4 py-2 rounded-lg border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors"
        >
          Set your first goal
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {activeGoals.map((goal) => (
        <GoalCompactRow key={goal.id} goal={goal} />
      ))}
    </div>
  );
}

interface GoalsSectionProps {
  goals: UserGoalView[];
}

/** Standalone goals section — prefer ProfileSuccessPanel for minimalist layout. */
export function GoalsSection({ goals }: GoalsSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <section className="glass-panel rounded-xl p-6 flex flex-col gap-4">
        <GoalsTabContent goals={goals} onSetGoal={() => setSheetOpen(true)} />
      </section>
      <SetGoalSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

export { SetGoalSheet };
