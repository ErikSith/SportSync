'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEMO_SWITCH_SKIP_PASSWORD_PROMPT,
  SWITCHABLE_ACCOUNTS,
  type SwitchableAccount,
} from '@/lib/demo/switchable-accounts';
import { switchToAccount } from '@/lib/demo/switch-account';

interface ProfileAccountSwitcherProps {
  currentEmail: string;
}

export function ProfileAccountSwitcher({ currentEmail }: ProfileAccountSwitcherProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<SwitchableAccount | null>(null);
  const [password, setPassword] = useState('');

  const normalizedCurrent = currentEmail.trim().toLowerCase();
  const accounts = useMemo(() => SWITCHABLE_ACCOUNTS, []);

  async function switchTo(account: SwitchableAccount, passwordOverride?: string) {
    if (account.email.toLowerCase() === normalizedCurrent) return;

    setError(null);
    setBusyId(account.id);

    const result = await switchToAccount(account, currentEmail, passwordOverride);
    if (!result.ok) {
      setBusyId(null);
      if (result.needPassword && !DEMO_SWITCH_SKIP_PASSWORD_PROMPT) {
        setPasswordPrompt(result.account);
        if (result.message) setError(result.message);
        return;
      }
      setError(result.message);
      return;
    }

    setPasswordPrompt(null);
    setPassword('');
    router.refresh();
    setBusyId(null);
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordPrompt || !password) return;
    await switchTo(passwordPrompt, password);
  }

  return (
    <section className="glass-panel rounded-xl p-4 border border-tertiary-container/10 space-y-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-secondary text-xl">swap_horiz</span>
        <div>
          <h3 className="font-headline-md text-sm text-on-surface">Switch profile</h3>
          <p className="font-body-md text-xs text-on-surface-variant">
            Jump between Player and Venue Owner
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {accounts.map((account) => {
          const active = account.email.toLowerCase() === normalizedCurrent;
          const isBusy = busyId === account.id;
          return (
            <button
              key={account.id}
              type="button"
              disabled={active || busyId !== null}
              onClick={() => void switchTo(account)}
              className={`flex items-center justify-between rounded-lg px-3 py-3 text-left transition-colors border ${
                active
                  ? 'border-secondary/50 bg-secondary/10'
                  : 'border-outline-variant/20 bg-surface-container-low/40 hover:border-secondary/40 hover:bg-surface-container'
              } disabled:opacity-60`}
            >
              <div>
                <p className="font-headline-md text-sm text-on-surface">{account.label}</p>
                <p className="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">
                  {account.roleLabel} · {account.email}
                </p>
              </div>
              <span className="font-label-caps text-[10px] uppercase text-secondary">
                {active ? 'Active' : isBusy ? 'Switching…' : 'Switch'}
              </span>
            </button>
          );
        })}
      </div>

      {passwordPrompt && (
        <form onSubmit={submitPassword} className="space-y-2 pt-1 border-t border-outline-variant/20">
          <p className="font-body-md text-xs text-on-surface-variant">
            Enter password for {passwordPrompt.label}
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-lg bg-surface-container-high border border-outline-variant/30 px-3 py-2 text-sm text-on-surface"
            placeholder="Password"
          />
          <button
            type="submit"
            disabled={!password || busyId !== null}
            className="w-full rounded-lg py-2 bg-secondary/20 border border-secondary/40 text-secondary font-label-caps text-[10px] uppercase tracking-wider disabled:opacity-50"
          >
            Sign in as {passwordPrompt.label}
          </button>
        </form>
      )}

      {error && <p className="font-body-md text-xs text-error">{error}</p>}
    </section>
  );
}
