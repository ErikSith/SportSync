'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/components/i18n/LocaleProvider';

interface SignOutButtonProps {
  flat?: boolean;
}

export function SignOutButton({ flat = false }: SignOutButtonProps) {
  const router = useRouter();
  const t = useT();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  if (flat) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="py-2 font-label-caps text-[10px] uppercase text-on-surface-variant transition-colors hover:text-secondary disabled:opacity-50"
      >
        {isSigningOut ? t('profile.signingOut') : t('profile.signOut')}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="w-full rounded-lg border border-secondary/30 bg-gradient-to-b from-surface/50 to-surface-container-low/50 py-3 font-label-caps text-label-caps text-secondary transition-all duration-300 hover:border-secondary/60 hover:from-surface-container hover:to-surface-container-high disabled:opacity-50"
    >
      {isSigningOut ? t('profile.signingOut').toUpperCase() : t('profile.signOut').toUpperCase()}
    </button>
  );
}
