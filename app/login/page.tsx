'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { safeRedirectPath } from '@/lib/utils/safe-redirect';
import { useT } from '@/components/i18n/LocaleProvider';

export const runtime = 'edge';

type Mode = 'sign-in' | 'sign-up';

/**
 * Not part of the Stitch export (no login screen was designed) — built to
 * match the Apex Elite Aesthetic design tokens 1:1 so it doesn't feel bolted on.
 * Role picked here is read by the `handle_new_user` DB trigger on signup.
 *
 * Wrapped in Suspense because it reads useSearchParams() — Next.js requires
 * that for any page that isn't fully static.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get('redirectTo'));
  const authError = searchParams.get('error');

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'player' | 'coach' | 'venue_owner'>('player');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    const supabase = createClient();

    if (mode === 'sign-in') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setIsSubmitting(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(redirectTo);
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, role } },
    });
    setIsSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      setNotice(t('login.confirmEmail'));
      setMode('sign-in');
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-container-margin-mobile relative overflow-hidden">
      <div className="ambient-glow bg-primary-container/10 w-[500px] h-[500px] top-0 left-[-200px]" />
      <div className="ambient-glow bg-secondary-container/5 w-[600px] h-[600px] bottom-[10%] right-[-100px]" />

      <div className="glass-panel rounded-2xl p-8 w-full max-w-md space-y-6 relative z-10 border border-secondary/10">
        <div className="text-center space-y-2">
          <h1 className="font-display-lg text-display-lg-mobile tracking-tighter text-primary-container">SPORTSYNC</h1>
          <p className="font-label-caps text-label-caps text-tertiary uppercase tracking-widest">Apex Elite</p>
        </div>

        <div className="flex rounded-lg border border-outline-variant/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setMode('sign-in')}
            className={`flex-1 py-2 font-label-caps text-label-caps transition-colors ${
              mode === 'sign-in' ? 'bg-primary-container text-white' : 'text-tertiary-container hover:bg-surface-container'
            }`}
          >
            {t('login.signIn').toUpperCase()}
          </button>
          <button
            type="button"
            onClick={() => setMode('sign-up')}
            className={`flex-1 py-2 font-label-caps text-label-caps transition-colors ${
              mode === 'sign-up' ? 'bg-primary-container text-white' : 'text-tertiary-container hover:bg-surface-container'
            }`}
          >
            {t('login.signUp').toUpperCase()}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'sign-up' && (
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="username">
                {t('login.username')}
              </label>
              <input
                id="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-container border-b border-outline-variant/40 px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none rounded-t-lg"
                placeholder="marek"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="email">
              {t('login.email')}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container border-b border-outline-variant/40 px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none rounded-t-lg"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="password">
              {t('login.password')}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container border-b border-outline-variant/40 px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none rounded-t-lg"
              placeholder="••••••••"
            />
          </div>

          {mode === 'sign-up' && (
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="role">
                {t('login.iAm')}
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
              >
                <option value="player">{t('login.player')}</option>
                <option value="coach">{t('login.coach')}</option>
                <option value="venue_owner">{t('login.venueOwner')}</option>
              </select>
            </div>
          )}

          {authError === 'auth-callback-failed' && (
            <p className="font-body-md text-body-md text-error">{t('login.callbackFailed')}</p>
          )}
          {error && <p className="font-body-md text-body-md text-error">{error}</p>}
          {notice && <p className="font-body-md text-body-md text-secondary">{notice}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-primary-container text-white font-label-caps text-label-caps hover:brightness-110 transition-all disabled:opacity-50"
          >
            {isSubmitting ? t('login.wait').toUpperCase() : mode === 'sign-in' ? t('login.submitIn').toUpperCase() : t('login.submitUp').toUpperCase()}
          </button>
        </form>
      </div>
    </main>
  );
}
