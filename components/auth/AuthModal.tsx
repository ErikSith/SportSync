'use client';

import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useT } from '@/components/i18n/LocaleProvider';
import { AuthPanel, type AuthMode } from '@/components/auth/AuthPanel';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: AuthMode;
  /** `null` keeps the user on the current page after auth. */
  redirectTo?: string | null;
}

export function AuthModal({
  open,
  onClose,
  onSuccess,
  mode = 'sign-up',
  redirectTo = '/profile',
}: AuthModalProps) {
  const t = useT();
  const titleId = useId();

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[130] flex items-end justify-center overscroll-none sm:items-center sm:p-6"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label={t('common.close')}
            className="absolute inset-0 bg-black/80 backdrop-blur-md sm:bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-secondary/10 bg-[#1a1919] shadow-2xl shadow-black/60 sm:rounded-2xl"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <p id={titleId} className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-tertiary">
                {mode === 'sign-up' ? t('login.signUp') : t('login.signIn')}
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
              <AuthPanel
                key={`${mode}-${redirectTo ?? 'stay'}-${open}`}
                initialMode={mode}
                redirectTo={redirectTo}
                compact
                idPrefix="auth-modal"
                onSuccess={onSuccess ?? onClose}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
