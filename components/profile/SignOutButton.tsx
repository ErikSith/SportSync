'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SignOutButtonProps {
  flat?: boolean;
}

export function SignOutButton({ flat = false }: SignOutButtonProps) {
  const router = useRouter();
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
        className="font-label-caps text-[10px] uppercase text-on-surface-variant hover:text-secondary transition-colors disabled:opacity-50 py-2"
      >
        {isSigningOut ? 'Signing out…' : 'Sign out'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="w-full py-3 rounded-lg border border-secondary/30 bg-gradient-to-b from-surface/50 to-surface-container-low/50 hover:from-surface-container hover:to-surface-container-high hover:border-secondary/60 text-secondary font-label-caps text-label-caps transition-all duration-300 disabled:opacity-50"
    >
      {isSigningOut ? 'SIGNING OUT…' : 'SIGN OUT'}
    </button>
  );
}
