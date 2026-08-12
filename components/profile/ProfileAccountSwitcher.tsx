'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  SAVED_SESSION_KEY,
  SWITCHABLE_ACCOUNTS,
  type SwitchableAccount,
} from '@/lib/demo/switchable-accounts';
import type { Session } from '@supabase/supabase-js';

interface ProfileAccountSwitcherProps {
  currentEmail: string;
}

function saveSession(session: Session | null) {
  if (!session?.access_token || !session.refresh_token) return;
  try {
    sessionStorage.setItem(
      SAVED_SESSION_KEY,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        email: session.user?.email ?? null,
      }),
    );
  } catch {
    // sessionStorage unavailable (private mode) — switch-back may need password
  }
}

function readSavedSession(): { access_token: string; refresh_token: string; email: string | null } | null {
  try {
    const raw = sessionStorage.getItem(SAVED_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      access_token?: string;
      refresh_token?: string;
      email?: string | null;
    };
    if (!parsed.access_token || !parsed.refresh_token) return null;
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      email: parsed.email ?? null,
    };
  } catch {
    return null;
  }
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

    const supabase = createClient();
    const { data: current } = await supabase.auth.getSession();

    // Keep the outgoing session so we can restore it without needing its password.
    if (current.session?.user?.email?.toLowerCase() !== account.email.toLowerCase()) {
      saveSession(current.session);
    }

    const passwordToUse = passwordOverride ?? account.password;
    if (passwordToUse) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: passwordToUse,
      });
      if (signInError) {
        setBusyId(null);
        setError(signInError.message);
        return;
      }
      setPasswordPrompt(null);
      setPassword('');
      router.refresh();
      setBusyId(null);
      return;
    }

    const saved = readSavedSession();
    if (saved && saved.email?.toLowerCase() === account.email.toLowerCase()) {
      const { error: setErrorResult } = await supabase.auth.setSession({
        access_token: saved.access_token,
        refresh_token: saved.refresh_token,
      });
      if (setErrorResult) {
        setBusyId(null);
        setPasswordPrompt(account);
        setError('Session expired — enter password to switch back.');
        return;
      }
      router.refresh();
      setBusyId(null);
      return;
    }

    setBusyId(null);
    setPasswordPrompt(account);
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
              onClick={() => switchTo(account)}
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
