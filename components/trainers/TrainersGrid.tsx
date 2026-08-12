'use client';

import { useState } from 'react';
import { TrainerCard } from '@/components/trainers/TrainerCard';
import type { CoachCardData } from '@/lib/data/trainers-shared';

const PAGE_SIZE = 6;

export function TrainersGrid({ coaches }: { coaches: CoachCardData[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = coaches.slice(0, visible);
  const hasMore = visible < coaches.length;

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shown.map((coach, index) => (
          <TrainerCard key={coach.id} coach={coach} staggerIndex={index % 3} />
        ))}
      </section>

      {hasMore && (
        <div className="flex justify-center mt-12 md:mt-16">
          <button
            type="button"
            onClick={() => setVisible((count) => count + PAGE_SIZE)}
            className="px-8 py-4 rounded-full border border-secondary text-secondary font-label-caps text-label-caps uppercase tracking-widest hover:bg-secondary/10 transition-colors flex items-center gap-2 active:scale-95"
          >
            Load More Trainers
            <span className="material-symbols-outlined">expand_more</span>
          </button>
        </div>
      )}
    </>
  );
}
