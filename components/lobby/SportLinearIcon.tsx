import type { IconAccent } from '@/components/lobby/lobby-ui';
import { ICON_ACCENT_HEX } from '@/components/lobby/lobby-ui';
import type { SportIconKind } from '@/types/lobby';

interface SportLinearIconProps {
  kind: SportIconKind;
  accent?: IconAccent;
  /** Overrides accent when set (e.g. per-sport brand tint). */
  color?: string;
  className?: string;
  strokeWidth?: number;
}

/** Thin-stroke sport glyph — racket / ball / pitch language for Lobby. */
export function SportLinearIcon({
  kind,
  accent = 'orange',
  color,
  className = '',
  strokeWidth = 1.6,
}: SportLinearIconProps) {
  const stroke = color ?? ICON_ACCENT_HEX[accent];
  const common = {
    fill: 'none',
    stroke,
    strokeWidth,
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
          <circle cx="24" cy="20" r="11" {...common} />
          <path
            d="M24 9.5v4.5M15.5 15.5l3 2.5M32.5 15.5l-3 2.5M14 22h5M29 22h5M17.5 29l2.5-2M30.5 29l-2.5-2"
            {...common}
          />
          <path d="M8 38c5.5-5 26.5-5 32 0" {...common} />
          <path d="M14 38h20" {...common} strokeWidth={strokeWidth * 0.75} />
        </>
      )}
      {kind === 'tennis' && (
        <>
          <ellipse cx="18" cy="29" rx="7.5" ry="11" transform="rotate(-38 18 29)" {...common} />
          <path d="M12.5 37.5 8 44M15.5 38.5l-2.5 5.5" {...common} />
          <path d="M13 22c3.5 2 7 5 9 9" {...common} strokeWidth={strokeWidth * 0.85} />
          <circle cx="34" cy="13" r="4" {...common} />
          <path d="M31.5 11.5c1.2 2.2 3.2 3.4 5.2 3.2" {...common} strokeWidth={strokeWidth * 0.9} />
        </>
      )}
      {kind === 'padel' && (
        <>
          <rect
            x="11"
            y="7"
            width="15"
            height="23"
            rx="5.5"
            transform="rotate(-20 18.5 18.5)"
            {...common}
          />
          <circle cx="15.5" cy="16" r="1.6" {...common} />
          <circle cx="20.5" cy="14.5" r="1.6" {...common} />
          <circle cx="17.5" cy="21" r="1.6" {...common} />
          <path d="M16.5 30.5 13 41M20.5 31.5l1.2 9" {...common} />
          <circle cx="34" cy="14" r="3.2" {...common} />
          <circle cx="40" cy="21" r="2.6" {...common} />
        </>
      )}
      {kind === 'basketball' && (
        <>
          <circle cx="24" cy="22" r="13" {...common} />
          <path d="M11 22h26M24 9v26" {...common} />
          <path d="M14 13.5c4.5 4 4.5 13 0 17M34 13.5c-4.5 4-4.5 13 0 17" {...common} />
        </>
      )}
      {kind === 'squash' && (
        <>
          <rect
            x="12"
            y="8"
            width="14"
            height="20"
            rx="3.5"
            transform="rotate(-28 19 18)"
            {...common}
          />
          <path d="M14 18h8M16 14h6M15 22h7" {...common} strokeWidth={strokeWidth * 0.85} />
          <path d="M17 29.5 13.5 41M20.5 30.5l.8 9.5" {...common} />
          <circle cx="35" cy="14" r="2.8" {...common} />
        </>
      )}
      {kind === 'running' && (
        <>
          <path d="M22 10c2.2 0 3.8 1.7 3.8 3.7S24.2 17.4 22 17.4 18.2 15.7 18.2 13.7 19.8 10 22 10Z" {...common} />
          <path d="M20.5 18.5 17 27l-5 3.5M20.5 18.5l5 7.5 7-1.5M17 27l4.5 6.5 8.5 2" {...common} />
          <path d="M29.5 32.5 35 38.5h5.5" {...common} />
          <path d="M12 40.5h10" {...common} strokeWidth={strokeWidth * 0.75} />
        </>
      )}
      {kind === 'volleyball' && (
        <>
          <circle cx="24" cy="22" r="12.5" {...common} />
          <path d="M13.5 16c4 1.5 12 1.5 17 0M13.5 28c4-1.5 12-1.5 17 0" {...common} />
          <path d="M24 9.5c-2.5 4.5-2.5 12.5 0 25M24 9.5c2.5 4.5 2.5 12.5 0 25" {...common} />
        </>
      )}
      {kind === 'hockey' && (
        <>
          <path d="M14 10 34 28.5" {...common} />
          <path d="M34 28.5c2.5 2 4.5 5.5 4 8.5-3.5.5-7-1.5-9-4" {...common} />
          <ellipse cx="16" cy="36" rx="5.5" ry="3.2" {...common} />
          <path d="M12 36h8" {...common} strokeWidth={strokeWidth * 0.8} />
        </>
      )}
    </svg>
  );
}
