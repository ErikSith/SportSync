'use client';

import { motion } from 'framer-motion';
import { isVerifiedPlayer, type VerificationFlags } from '@/lib/profile/verification';

type VerifiedBadgeVariant = 'pill' | 'compact' | 'icon';

interface VerifiedBadgeProps extends VerificationFlags {
  variant?: VerifiedBadgeVariant;
  onUnverifiedClick?: () => void;
  className?: string;
}

export function VerifiedBadge({
  isEmailVerified,
  isPhoneVerified,
  variant = 'pill',
  onUnverifiedClick,
  className = '',
}: VerifiedBadgeProps) {
  const verified = isVerifiedPlayer({ isEmailVerified, isPhoneVerified });

  if (verified) {
    if (variant === 'icon') {
      return (
        <motion.span
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          title="Overený hráč"
          className={`inline-flex items-center text-[#FF5722] ${className}`}
          aria-label="Overený hráč"
        >
          🛡️
        </motion.span>
      );
    }

    if (variant === 'compact') {
      return (
        <motion.span
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`inline-flex items-center gap-1 rounded-full border border-[#FF5722] bg-[#FF5722]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FF5722] shadow-[0_0_12px_rgba(255,87,34,0.25)] ${className}`}
        >
          ✓ OVERENÝ
        </motion.span>
      );
    }

    return (
      <motion.span
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`inline-flex items-center gap-1.5 rounded-full border border-[#FF5722] bg-[#FF5722]/20 px-3 py-1 text-xs font-semibold text-[#FF5722] shadow-[0_0_16px_rgba(255,87,34,0.3)] ${className}`}
      >
        <span aria-hidden>🛡️</span>
        Overený Hráč
      </motion.span>
    );
  }

  if (variant === 'icon') return null;

  const unverifiedClasses =
    'inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400';

  if (onUnverifiedClick) {
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onUnverifiedClick}
        className={`${unverifiedClasses} transition-colors hover:border-amber-400/70 hover:bg-amber-500/20 ${className}`}
      >
        <span aria-hidden>⚠️</span>
        Neoverený Účet
      </motion.button>
    );
  }

  return (
    <span className={`${unverifiedClasses} ${className}`}>
      <span aria-hidden>⚠️</span>
      Neoverený Účet
    </span>
  );
}

/** Small shield overlay for avatar stacks in lobby cards. */
export function VerifiedAvatarBadge({ verified }: { verified?: boolean }) {
  if (!verified) return null;
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#121212] bg-[#FF5722]/90 text-[7px] leading-none"
      title="Overený hráč"
      aria-hidden
    >
      ✓
    </span>
  );
}
