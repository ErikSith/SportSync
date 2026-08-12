'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { GOAL_TEMPLATES, type GoalTemplate } from '@/lib/constants/goal-templates';
import { LOBBY_SPORTS } from '@/lib/constants/sports';

interface SetGoalSheetProps {
  open: boolean;
  onClose: () => void;
}

export function SetGoalSheet({ open, onClose }: SetGoalSheetProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'pick' | 'configure'>('pick');
  const [selected, setSelected] = useState<GoalTemplate | null>(null);
  const [targetValue, setTargetValue] = useState(0);
  const [weeks, setWeeks] = useState(8);
  const [reps, setReps] = useState(6);
  const [sport, setSport] = useState<string>(LOBBY_SPORTS[0]);
  const [isFeatured, setIsFeatured] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') handleClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function handleClose() {
    setStep('pick');
    setSelected(null);
    setError(null);
    onClose();
  }

  function pickTemplate(template: GoalTemplate) {
    setSelected(template);
    setTargetValue(template.defaultTargetValue);
    setWeeks(Number(template.defaultTargetMeta.weeks ?? 8));
    setReps(Number(template.defaultTargetMeta.reps ?? 6));
    setStep('configure');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;

    setSubmitting(true);
    setError(null);

    const targetMeta: Record<string, unknown> = { ...selected.defaultTargetMeta };
    if (selected.key === 'gym_weekly') targetMeta.weeks = weeks;
    if (selected.key === 'strength_pr') targetMeta.reps = reps;
    if (selected.key === 'complete_matches' && sport) targetMeta.sport = sport;

    const res = await fetch('/api/profile/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateKey: selected.key,
        targetValue,
        targetMeta,
        sport: selected.key === 'complete_matches' ? sport : null,
        isFeatured,
      }),
    });

    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    setSubmitting(false);

    if (!res.ok) {
      setError(body?.error ?? 'Could not create goal');
      return;
    }

    handleClose();
    router.refresh();
  }

  if (!open || !mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="presentation"
      onClick={handleClose}
    >
      <div
        className="glass-panel rounded-2xl p-6 md:p-8 w-full max-w-lg border border-secondary/10 space-y-6 max-h-[90vh] overflow-y-auto relative z-[101]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-goal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="set-goal-title" className="font-headline-md text-headline-md text-on-surface">
            {step === 'pick' ? 'Set a goal' : 'Configure goal'}
          </h3>
          <button type="button" onClick={handleClose} className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {step === 'pick' ? (
          <div className="space-y-3">
            {GOAL_TEMPLATES.map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() => pickTemplate(template)}
                className="w-full text-left glass-card rounded-xl p-4 border border-white/10 hover:border-secondary/30 transition-colors flex items-start gap-3"
              >
                <span className="material-symbols-outlined text-secondary text-2xl">{template.icon}</span>
                <div>
                  <p className="font-headline-md text-sm text-on-surface">{template.title}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant text-sm mt-1">{template.description}</p>
                  <span className="font-label-caps text-[10px] uppercase text-on-surface-variant mt-2 inline-block">
                    {template.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {selected?.key === 'gym_weekly' && (
              <>
                <label className="block space-y-1">
                  <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Sessions per week</span>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    className="w-full rounded-lg bg-surface-container border border-white/10 px-3 py-2 text-on-surface"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Weeks</span>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={weeks}
                    onChange={(e) => setWeeks(Number(e.target.value))}
                    className="w-full rounded-lg bg-surface-container border border-white/10 px-3 py-2 text-on-surface"
                  />
                </label>
              </>
            )}

            {selected?.key === 'strength_pr' && (
              <>
                <label className="block space-y-1">
                  <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Target weight (kg)</span>
                  <input
                    type="number"
                    min={1}
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    className="w-full rounded-lg bg-surface-container border border-white/10 px-3 py-2 text-on-surface"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Reps</span>
                  <input
                    type="number"
                    min={1}
                    value={reps}
                    onChange={(e) => setReps(Number(e.target.value))}
                    className="w-full rounded-lg bg-surface-container border border-white/10 px-3 py-2 text-on-surface"
                  />
                </label>
              </>
            )}

            {(selected?.key === 'running_distance' ||
              selected?.key === 'complete_matches' ||
              selected?.key === 'join_tournament' ||
              selected?.key === 'host_lobbies') && (
              <label className="block space-y-1">
                <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Target</span>
                <input
                  type="number"
                  min={1}
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full rounded-lg bg-surface-container border border-white/10 px-3 py-2 text-on-surface"
                />
              </label>
            )}

            {selected?.key === 'complete_matches' && (
              <label className="block space-y-1">
                <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Sport</span>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="w-full rounded-lg bg-surface-container border border-white/10 px-3 py-2 text-on-surface"
                >
                  {LOBBY_SPORTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-white/20"
              />
              <span className="font-body-md text-body-md text-on-surface-variant">Show as featured goal on profile</span>
            </label>

            {error && <p className="text-primary text-sm">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('pick')}
                className="flex-1 font-label-caps text-label-caps uppercase px-4 py-2.5 rounded-lg border border-white/10 text-on-surface-variant"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 font-label-caps text-label-caps uppercase px-4 py-2.5 rounded-lg bg-secondary text-on-secondary disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Set goal'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
