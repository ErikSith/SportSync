'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AuthModal } from '@/components/auth/AuthModal';
import type { AuthMode } from '@/components/auth/AuthPanel';

type OpenAuthOptions = {
  mode?: AuthMode;
  /** Where to navigate after auth. `null` = stay on the current page. */
  redirectTo?: string | null;
  /** Runs after successful sign-in / sign-up (e.g. open external registration URL). */
  onAuthenticated?: () => void;
};

type AuthModalContextValue = {
  openAuthModal: (opts?: OpenAuthOptions) => void;
  closeAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('sign-up');
  const [redirectTo, setRedirectTo] = useState<string | null>('/profile');
  const onAuthenticatedRef = useRef<(() => void) | null>(null);

  const closeAuthModal = useCallback(() => {
    setOpen(false);
    onAuthenticatedRef.current = null;
  }, []);

  const openAuthModal = useCallback((opts?: OpenAuthOptions) => {
    setMode(opts?.mode ?? 'sign-up');
    setRedirectTo(opts?.redirectTo === undefined ? '/profile' : opts.redirectTo);
    onAuthenticatedRef.current = opts?.onAuthenticated ?? null;
    setOpen(true);
  }, []);

  const handleSuccess = useCallback(() => {
    const next = onAuthenticatedRef.current;
    onAuthenticatedRef.current = null;
    setOpen(false);
    next?.();
  }, []);

  const value = useMemo(
    () => ({ openAuthModal, closeAuthModal }),
    [openAuthModal, closeAuthModal],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        open={open}
        onClose={closeAuthModal}
        onSuccess={handleSuccess}
        mode={mode}
        redirectTo={redirectTo}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error('useAuthModal must be used within AuthModalProvider');
  }
  return ctx;
}
