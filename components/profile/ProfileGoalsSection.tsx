'use client';

import { useState } from 'react';
import type { UserGoalView } from '@/lib/data/profile-goals';
import { GoalCompactRow } from '@/components/profile/GoalsSection';
import { SetGoalSheet } from '@/components/profile/SetGoalSheet';

interface ProfileGoalsSectionProps {
  goals: UserGoalView[];
  readOnly?: boolean;
}

export function ProfileGoalsSection({ goals, readOnly = false }: ProfileGoalsSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeGoals = goals.filter((g) => g.status === 'active').slice(0, 3);
  const featuredGoal = activeGoals.find((g) => g.isFeatured) ?? activeGoals[0] ?? null;

  return (
    <>
      <section className="glass-panel rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-xl">flag</span>
            Goals
          </h2>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="font-label-caps text-[10px] uppercase text-secondary hover:underline"
            >
              + Set goal
            </button>
          )}
        </div>

        {featuredGoal && (
          <p className="font-label-caps text-[10px] uppercase text-on-surface-variant tracking-widest -mt-2">
            Featured: {featuredGoal.title}
          </p>
        )}

        {activeGoals.length === 0 ? (
          <div className="text-center py-4 space-y-3">
            <p className="font-body-md text-body-md text-on-surface-variant text-sm">
              {readOnly ? 'No active goals yet.' : 'Set a goal to show what you are working toward.'}
            </p>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="font-label-caps text-[10px] uppercase px-4 py-2 rounded-lg border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors"
              >
                Set your first goal
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {activeGoals.map((goal) => (
              <GoalCompactRow key={goal.id} goal={goal} readOnly={readOnly} />
            ))}
          </div>
        )}
      </section>

      {!readOnly && <SetGoalSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />}
    </>
  );
}
