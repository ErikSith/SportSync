'use client';

import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  DEMO_SWITCH_SKIP_PASSWORD_PROMPT,
  SAVED_SESSIONS_KEY,
  type SwitchableAccount,
  SWITCHABLE_ACCOUNTS,
} from '@/lib/demo/switchable-accounts';

type StoredSession = {
  access_token: string;
  refresh_token: string;
};

function readSessionMap(): Record<string, StoredSession> {
  try {
    const raw = localStorage.getItem(SAVED_SESSIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredSession>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessionMap(map: Record<string, StoredSession>) {
  try {
    localStorage.setItem(SAVED_SESSIONS_KEY, JSON.stringify(map));
  } catch {
    // private mode / quota
  }
}

function saveSession(session: Session | null) {
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email || !session?.access_token || !session.refresh_token) return;
  const map = readSessionMap();
  map[email] = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  };
  writeSessionMap(map);
}

function readSavedSession(email: string): StoredSession | null {
  const map = readSessionMap();
  return map[email.trim().toLowerCase()] ?? null;
}

export function findSwitchableAccount(email: string): SwitchableAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return SWITCHABLE_ACCOUNTS.find((a) => a.email.toLowerCase() === normalized);
}

export function findAlternateAccount(email: string): SwitchableAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return SWITCHABLE_ACCOUNTS.find((a) => a.email.toLowerCase() !== normalized);
}

export type SwitchAccountResult =
  | { ok: true }
  | { ok: false; needPassword: true; account: SwitchableAccount; message?: string }
  | { ok: false; needPassword: false; message: string };

async function applySession(access_token: string, refresh_token: string): Promise<SwitchAccountResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    return { ok: false, needPassword: false, message: error.message };
  }
  const { data: next } = await supabase.auth.getSession();
  saveSession(next.session);
  return { ok: true };
}

/** Server mints a session for switchable accounts (no password) while AUTH_BYPASS is on. */
async function mintDemoSession(email: string): Promise<SwitchAccountResult> {
  const res = await fetch('/api/demo/switch-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const body = (await res.json().catch(() => null)) as {
    error?: string;
    access_token?: string;
    refresh_token?: string;
  } | null;

  if (!res.ok || !body?.access_token || !body.refresh_token) {
    return {
      ok: false,
      needPassword: false,
      message: body?.error ?? 'Demo switch failed',
    };
  }

  return applySession(body.access_token, body.refresh_token);
}

/** Sign into another demo account (password, saved session, or demo mint). */
export async function switchToAccount(
  account: SwitchableAccount,
  currentEmail: string,
  passwordOverride?: string,
): Promise<SwitchAccountResult> {
  const normalizedCurrent = currentEmail.trim().toLowerCase();
  if (account.email.toLowerCase() === normalizedCurrent) {
    return { ok: true };
  }

  const supabase = createClient();
  const { data: current } = await supabase.auth.getSession();
  saveSession(current.session);

  const passwordToUse = passwordOverride ?? account.password;
  if (passwordToUse) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: passwordToUse,
    });
    if (!signInError) {
      const { data: next } = await supabase.auth.getSession();
      saveSession(next.session);
      return { ok: true };
    }
    // Fall through to saved session / demo mint when password fails while testing.
    if (!DEMO_SWITCH_SKIP_PASSWORD_PROMPT) {
      return { ok: false, needPassword: false, message: signInError.message };
    }
  }

  const saved = readSavedSession(account.email);
  if (saved) {
    const applied = await applySession(saved.access_token, saved.refresh_token);
    if (applied.ok) return applied;
  }

  if (DEMO_SWITCH_SKIP_PASSWORD_PROMPT) {
    return mintDemoSession(account.email);
  }

  return {
    ok: false,
    needPassword: true,
    account,
    message: 'Session expired — enter password to switch back.',
  };
}
