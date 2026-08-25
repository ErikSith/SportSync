'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EVENT_SPORTS, sportDisplayLabel } from '@/lib/constants/sports';
import { useT } from '@/components/i18n/LocaleProvider';

export function MercenaryOptIn({ initialSports }: { initialSports: string[] }) {
  const t = useT();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSports.map((s) => s.toUpperCase()));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(sport: string) {
    setSaved(false);
    setSelected((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport],
    );
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mercenarySports: selected }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <section className="glass-panel rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-secondary">campaign</span>
        <h3 className="font-headline-md text-headline-md text-on-surface">{t('profile.mercenaryTitle')}</h3>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mb-4">
        {t('profile.mercenaryBody')}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {EVENT_SPORTS.map((sport) => {
          const active = selected.includes(sport);
          return (
            <button
              key={sport}
              type="button"
              onClick={() => toggle(sport)}
              className={`px-3 py-2 rounded-full font-label-caps text-label-caps uppercase tracking-wider border transition-all ${
                active
                  ? 'bg-secondary-container/30 text-secondary border-secondary/50'
                  : 'bg-surface-container-high text-on-surface-variant border-white/10 hover:border-secondary/30'
              }`}
            >
              {sportDisplayLabel(sport)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="bg-gradient-to-br from-primary-container to-secondary-container text-white font-headline-md text-headline-md font-bold py-2.5 px-6 rounded-lg hover:shadow-[0_0_20px_rgba(255,87,34,0.4)] transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? t('common.saving').toUpperCase() : t('profile.mercenarySave').toUpperCase()}
        </button>
        {saved && (
          <span className="font-label-caps text-label-caps text-secondary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            {t('common.saved')}
          </span>
        )}
      </div>
    </section>
  );
}
