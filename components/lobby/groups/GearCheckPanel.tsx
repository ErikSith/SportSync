'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PollRefresh } from '@/lib/realtime/usePollingRefresh';
import type { GearClaimData, GearItem } from '@/lib/data/sport-groups-shared';
import { GEAR_ITEMS, GEAR_ITEM_LABELS } from '@/lib/data/sport-groups-shared';

interface GearCheckPanelProps {
  groupId: string;
  sessionId: string;
  gearClaims: GearClaimData[];
  viewerId: string;
}

export function GearCheckPanel({ groupId, sessionId, gearClaims, viewerId }: GearCheckPanelProps) {
  const router = useRouter();
  const [pendingItem, setPendingItem] = useState<GearItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const claimByItem = new Map(gearClaims.map((c) => [c.item, c]));

  async function toggleClaim(item: GearItem, claim: boolean) {
    setError(null);
    setPendingItem(item);

    const res = await fetch(`/api/groups/${groupId}/sessions/${sessionId}/gear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, claim }),
    });

    setPendingItem(null);

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'Could not update gear check');
      return;
    }

    router.refresh();
  }

  return (
    <section className="glass-panel rounded-xl p-6 space-y-4">
      <PollRefresh intervalMs={10000} />
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[22px]">inventory_2</span>
          Gear Check
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant text-sm mt-1">
          Claim what you&apos;re bringing so nobody shows up empty-handed.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {GEAR_ITEMS.map((item) => {
          const claim = claimByItem.get(item);
          const meta = GEAR_ITEM_LABELS[item];
          const isMine = claim?.userId === viewerId;
          const busy = pendingItem === item;

          return (
            <div
              key={item}
              className={`p-4 rounded-lg border flex flex-col items-center gap-2 text-center ${
                claim ? 'bg-secondary/10 border-secondary/30' : 'bg-surface-container/50 border-white/5'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[26px] ${claim ? 'text-secondary' : 'text-on-surface-variant'}`}
              >
                {meta.icon}
              </span>
              <p className="font-label-caps text-label-caps text-on-surface uppercase text-xs">{meta.label}</p>
              {claim ? (
                <>
                  <p className="font-body-md text-body-md text-on-surface-variant text-xs truncate max-w-full">
                    {isMine ? "You've got it" : claim.name}
                  </p>
                  {isMine && (
                    <button
                      type="button"
                      onClick={() => void toggleClaim(item, false)}
                      disabled={busy}
                      className="font-label-caps text-[10px] uppercase text-on-surface-variant hover:text-error transition-colors disabled:opacity-50"
                    >
                      {busy ? 'REMOVING…' : 'UNCLAIM'}
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void toggleClaim(item, true)}
                  disabled={busy}
                  className="px-3 py-1 rounded-full bg-primary-container/20 text-primary-container border border-primary-container/30 font-label-caps text-[10px] uppercase tracking-wider hover:bg-primary-container/30 transition-colors disabled:opacity-50"
                >
                  {busy ? 'CLAIMING…' : "I'VE GOT IT"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="font-body-md text-body-md text-error text-sm">{error}</p>}
    </section>
  );
}
