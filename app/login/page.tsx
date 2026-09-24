'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { safeRedirectPath } from '@/lib/utils/safe-redirect';
import { AuthPanel, type AuthMode } from '@/components/auth/AuthPanel';

export const runtime = 'edge';

/**
 * Full-page auth (callback failures, direct /login links).
 * In-app guest CTAs open AuthModal instead.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </main>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get('redirectTo'));
  const authError = searchParams.get('error');
  const initialMode: AuthMode = searchParams.get('mode') === 'sign-up' ? 'sign-up' : 'sign-in';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-container-margin-mobile">
      <div className="ambient-glow left-[-200px] top-0 h-[500px] w-[500px] bg-primary-container/10" />
      <div className="ambient-glow bottom-[10%] right-[-100px] h-[600px] w-[600px] bg-secondary-container/5" />

      <div className="glass-panel relative z-10 w-full max-w-md space-y-6 rounded-2xl border border-secondary/10 p-8">
        <AuthPanel
          initialMode={initialMode}
          redirectTo={redirectTo}
          authError={authError}
          idPrefix="auth-page"
        />
      </div>
    </main>
  );
}
