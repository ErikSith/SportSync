import type { IconAccent } from '@/components/lobby/lobby-ui';
import { ICON_ACCENT_HEX } from '@/components/lobby/lobby-ui';
import type { SportIconKind } from '@/types/lobby';

interface SportLinearIconProps {
  kind: SportIconKind;
  accent: IconAccent;
  className?: string;
}

/** Thin-stroke sport glyph in the card corner (design: linear neon outline). */
export function SportLinearIcon({ kind, accent, className = '' }: SportLinearIconProps) {
  const color = ICON_ACCENT_HEX[accent];
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <svg
      viewBox="0 0 48 48"
      className={`h-14 w-14 opacity-90 ${className}`}
      aria-hidden
    >
      {kind === 'football' && (
        <>
          <circle cx="24" cy="22" r="12" {...common} />
          <path d="M24 10v4M16 16l3 3M32 16l-3 3M14 24h4M30 24h4M18 30l2-2M30 30l-2-2" {...common} />
          <path d="M8 38c6-6 26-6 32 0" {...common} />
        </>
      )}
      {kind === 'tennis' && (
        <>
          <path d="M14 34c8-10 16-18 26-24" {...common} />
          <ellipse cx="18" cy="30" rx="7" ry="10" transform="rotate(-35 18 30)" {...common} />
          <path d="M13 36l-4 6M15 37l-2 5" {...common} />
          <circle cx="34" cy="12" r="3.5" {...common} />
        </>
      )}
      {kind === 'padel' && (
        <>
          <rect x="10" y="8" width="16" height="22" rx="5" transform="rotate(-18 18 19)" {...common} />
          <path d="M16 30l-3 10M20 31l1 9" {...common} />
          <circle cx="34" cy="14" r="3" {...common} />
          <circle cx="40" cy="20" r="2.5" {...common} />
        </>
      )}
      {kind === 'basketball' && (
        <>
          <circle cx="24" cy="22" r="13" {...common} />
          <path d="M11 22h26M24 9v26" {...common} />
          <path d="M14 14c4 4 4 12 0 16M34 14c-4 4-4 12 0 16" {...common} />
        </>
      )}
    </svg>
  );
}
