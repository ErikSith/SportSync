'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { UserGoalView } from '@/lib/data/profile-goals';

interface LogGoalProgressProps {
  goal: UserGoalView;
}

export function LogGoalProgress({ goal }: LogGoalProgressProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function log(value: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/goals/${goal.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (goal.trackingMode !== 'manual' || goal.status === 'completed') return null;

  if (goal.metricType === 'distance_km') {
    return (
      <div className="flex gap-2 mt-3">
        {[5, 10].map((km) => (
          <button
            key={km}
            type="button"
            disabled={loading}
            onClick={() => log(km)}
            className="font-label-caps text-[10px] uppercase px-3 py-1.5 rounded-lg border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-50"
          >
            +{km} km
          </button>
        ))}
      </div>
    );
  }

  if (goal.metricType === 'weight_reps') {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => log(goal.targetValue)}
        className="mt-3 font-label-caps text-[10px] uppercase px-3 py-1.5 rounded-lg border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-50"
      >
        Log set at {goal.targetValue} kg
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => log(1)}
      className="mt-3 font-label-caps text-[10px] uppercase px-3 py-1.5 rounded-lg border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-50"
    >
      +1 session
    </button>
  );
}
