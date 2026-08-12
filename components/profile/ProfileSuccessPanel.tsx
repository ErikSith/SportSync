'use client';

import { useEffect, useState } from 'react';
import type { UserGoalView } from '@/lib/data/profile-goals';
import type { ProfileAchievementsBundle } from '@/lib/data/profile-achievements';
import { GoalsTabContent, SetGoalSheet } from '@/components/profile/GoalsSection';
import { AchievementsTabContent, BadgesTabContent } from '@/components/profile/AchievementsSection';
import { ProfileBadgeShelf } from '@/components/profile/ProfileBadgeShelf';

type SuccessTab = 'goals' | 'achievements' | 'badges';

interface ProfileSuccessPanelProps {
  goals: UserGoalView[];
  achievements: ProfileAchievementsBundle;
}

const TABS: { id: SuccessTab; label: string; emoji: string }[] = [
  { id: 'goals', label: 'Goals', emoji: '🎯' },
  { id: 'achievements', label: 'Highlights', emoji: '🏅' },
  { id: 'badges', label: 'Badges', emoji: '🏆' },
];

export function ProfileSuccessPanel({ goals, achievements }: ProfileSuccessPanelProps) {
  const [activeTab, setActiveTab] = useState<SuccessTab>('goals');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [highlightBadgeId, setHighlightBadgeId] = useState<string | null>(null);

  function openBadge(id: string) {
    setHighlightBadgeId(id);
    setActiveTab('badges');
  }

  function openHighlights() {
    setHighlightBadgeId(null);
    setActiveTab('achievements');
  }

  useEffect(() => {
    if (!highlightBadgeId || activeTab !== 'badges') return;
    const el = document.getElementById(`badge-${highlightBadgeId}`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [highlightBadgeId, activeTab]);

  return (
    <>
      <div className="flex flex-col gap-4">
        <ProfileBadgeShelf
          badges={achievements.badges}
          highlights={achievements.highlights}
          onBadgeClick={openBadge}
          onHighlightClick={openHighlights}
        />

        <section className="glass-panel rounded-xl p-5 md:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
            <div className="flex gap-5">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id !== 'badges') setHighlightBadgeId(null);
                  }}
                  className={`font-label-caps text-[10px] uppercase tracking-widest pb-3 -mb-3 border-b-2 transition-colors flex items-center gap-1 ${
                    activeTab === tab.id
                      ? 'text-secondary border-secondary'
                      : 'text-on-surface-variant border-transparent hover:text-on-surface'
                  }`}
                >
                  <span aria-hidden className="text-sm leading-none">{tab.emoji}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === 'goals' && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="font-label-caps text-[10px] uppercase text-secondary hover:underline shrink-0"
              >
                + Set goal
              </button>
            )}
          </div>

          {activeTab === 'goals' && <GoalsTabContent goals={goals} onSetGoal={() => setSheetOpen(true)} />}
          {activeTab === 'achievements' && <AchievementsTabContent achievements={achievements} />}
          {activeTab === 'badges' && (
            <BadgesTabContent achievements={achievements} highlightBadgeId={highlightBadgeId} />
          )}
        </section>
      </div>

      <SetGoalSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
