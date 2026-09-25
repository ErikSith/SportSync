'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/components/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

export type AuthMode = 'sign-in' | 'sign-up';

function signupErrorMessage(
  t: (key: MessageKey) => string,
  code: string | undefined,
  fallback?: string,
): string {
  switch (code) {
    case 'email_taken':
      return t('login.error.emailTaken');
    case 'weak_password':
      return t('login.error.weakPassword');
    case 'invalid_email':
      return t('login.error.invalidEmail');
    case 'invalid_username':
      return t('login.error.invalidUsername');
    case 'rate_limit':
      return t('login.error.rateLimit');
    case 'signup_unavailable':
      return t('login.error.signupUnavailable');
    default:
      return fallback?.trim() || t('login.error.generic');
  }
}

function signInErrorMessage(
  t: (key: MessageKey) => string,
  code: string | undefined,
  fallback?: string,
): string {
  switch (code) {
    case 'invalid_credentials':
    case 'signin_failed':
      return t('login.error.signIn');
    case 'email_not_confirmed':
      return t('login.confirmEmail');
    case 'rate_limit':
      return t('login.error.rateLimit');
    case 'invalid_email':
      return t('login.error.invalidEmail');
    case 'signin_unavailable':
      return t('login.error.signupUnavailable');
    default:
      return fallback?.trim() || t('login.error.signIn');
  }
}

export interface AuthPanelProps {
  initialMode?: AuthMode;
  /** Navigate here after auth. Omit / `null` to stay put. */
  redirectTo?: string | null;
  authError?: string | null;
  /** Compact title for modal (no full-page hero glow). */
  compact?: boolean;
  onSuccess?: () => void;
  idPrefix?: string;
}

export function AuthPanel({
  initialMode = 'sign-in',
  redirectTo = '/',
  authError = null,
  compact = false,
  onSuccess,
  idPrefix = 'auth',
}: AuthPanelProps) {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function finishSuccess() {
    onSuccess?.();
    // Hard navigation so mobile Safari keeps Set-Cookie session (soft push often drops it).
    if (redirectTo) {
      window.location.assign(redirectTo);
      return;
    }
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    if (mode === 'sign-in') {
      try {
        const res = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email, password }),
        });
        const payload = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          code?: string;
          error?: string;
        };

        if (!res.ok || !payload.ok) {
          setIsSubmitting(false);
          setError(signInErrorMessage(t, payload.code, payload.error));
          return;
        }

        setIsSubmitting(false);
        finishSuccess();
        return;
      } catch {
        setIsSubmitting(false);
        setError(t('login.error.signIn'));
        return;
      }
    }

    const supabase = createClient();

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password, username, role: 'player' }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        error?: string;
      };

      if (!res.ok || !payload.ok) {
        if (payload.code === 'signup_unavailable') {
          const nextPath = redirectTo || `${window.location.pathname}${window.location.search}`;
          const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { username, role: 'player' },
              emailRedirectTo,
            },
          });
          setIsSubmitting(false);
          if (signUpError) {
            const lower = signUpError.message.toLowerCase();
            const code = lower.includes('already')
              ? 'email_taken'
              : lower.includes('password')
                ? 'weak_password'
                : lower.includes('rate')
                  ? 'rate_limit'
                  : 'signup_failed';
            setError(signupErrorMessage(t, code, signUpError.message));
            return;
          }
          if (!data.session) {
            setNotice(t('login.confirmEmail'));
            setMode('sign-in');
            return;
          }
          finishSuccess();
          return;
        }

        setIsSubmitting(false);
        setError(signupErrorMessage(t, payload.code, payload.error));
        return;
      }

      setIsSubmitting(false);
      finishSuccess();
    } catch {
      setIsSubmitting(false);
      setError(t('login.error.generic'));
    }
  }

  const submitButton = (
    <button
      type="submit"
      disabled={isSubmitting}
      className="w-full rounded-lg bg-primary-container py-3.5 font-label-caps text-label-caps text-white transition-all hover:brightness-110 disabled:opacity-50 active:scale-[0.99]"
    >
      {isSubmitting
        ? t('login.wait').toUpperCase()
        : mode === 'sign-in'
          ? t('login.submitIn').toUpperCase()
          : t('login.submitUp').toUpperCase()}
    </button>
  );

  return (
    <div className={compact ? 'space-y-5' : 'space-y-6'}>
      <div className="space-y-2 text-center">
        <h2
          className={[
            'font-display-lg tracking-tighter text-primary-container',
            compact ? 'text-[1.75rem]' : 'text-display-lg-mobile',
          ].join(' ')}
        >
          SPORTSYNC
        </h2>
        <p className="font-label-caps text-label-caps uppercase tracking-widest text-tertiary">
          Apex Elite
        </p>
      </div>

      <div className="flex overflow-hidden rounded-lg border border-outline-variant/30">
        <button
          type="button"
          onClick={() => setMode('sign-in')}
          className={`flex-1 py-2.5 font-label-caps text-label-caps transition-colors ${
            mode === 'sign-in'
              ? 'bg-primary-container text-white'
              : 'text-tertiary-container hover:bg-surface-container'
          }`}
        >
          {t('login.signIn').toUpperCase()}
        </button>
        <button
          type="button"
          onClick={() => setMode('sign-up')}
          className={`flex-1 py-2.5 font-label-caps text-label-caps transition-colors ${
            mode === 'sign-up'
              ? 'bg-primary-container text-white'
              : 'text-tertiary-container hover:bg-surface-container'
          }`}
        >
          {t('login.signUp').toUpperCase()}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'sign-up' && (
          <div className="space-y-1">
            <label
              className="font-label-caps text-label-caps uppercase text-tertiary"
              htmlFor={`${idPrefix}-username`}
            >
              {t('login.username')}
            </label>
            <input
              id={`${idPrefix}-username`}
              name="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-t-lg border-b border-outline-variant/40 bg-surface-container px-3 py-3 text-base text-on-surface focus:border-primary-container focus:outline-none"
              placeholder="marek"
              autoComplete="username"
              enterKeyHint="next"
              pattern="[a-zA-Z0-9._\-]+"
              minLength={2}
              maxLength={40}
            />
          </div>
        )}

        <div className="space-y-1">
          <label
            className="font-label-caps text-label-caps uppercase text-tertiary"
            htmlFor={`${idPrefix}-email`}
          >
            {t('login.email')}
          </label>
          <input
            id={`${idPrefix}-email`}
            name="email"
            type="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-t-lg border-b border-outline-variant/40 bg-surface-container px-3 py-3 text-base text-on-surface focus:border-primary-container focus:outline-none"
            placeholder="you@example.com"
            autoComplete="email"
            enterKeyHint="next"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div className="space-y-1">
          <label
            className="font-label-caps text-label-caps uppercase text-tertiary"
            htmlFor={`${idPrefix}-password`}
          >
            {t('login.password')}
          </label>
          <input
            id={`${idPrefix}-password`}
            name="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-t-lg border-b border-outline-variant/40 bg-surface-container px-3 py-3 text-base text-on-surface focus:border-primary-container focus:outline-none"
            placeholder="••••••••"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            enterKeyHint="go"
          />
        </div>

        {authError === 'auth-callback-failed' && (
          <p className="font-body-md text-body-md text-error">{t('login.callbackFailed')}</p>
        )}
        {error && <p className="font-body-md text-body-md text-error">{error}</p>}
        {notice && <p className="font-body-md text-body-md text-secondary">{notice}</p>}

        {!compact ? submitButton : null}
        {compact ? (
          <div className="sticky bottom-0 -mx-1 border-t border-white/[0.06] bg-[#1a1919]/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
            {submitButton}
          </div>
        ) : null}
      </form>
    </div>
  );
}
