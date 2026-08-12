import { sportDisplayLabel } from '@/lib/constants/sports';
import { sportColor, sportIcon } from '@/lib/utils/sport-icons';

interface SportLabelProps {
  sport: string;
  /** Optional title — refines icon (wakeboard → surfing, korčule → ice skating). */
  title?: string;
  /** Text size for the Material icon glyph */
  iconSize?: number;
  className?: string;
  /** Label typography classes (icon keeps its color) */
  labelClassName?: string;
  /** Show only the icon */
  iconOnly?: boolean;
}

/** Colored sport glyph + label — same sport always repeats the same icon/color. */
export function SportLabel({
  sport,
  title,
  iconSize = 12,
  className = '',
  labelClassName = '',
  iconOnly = false,
}: SportLabelProps) {
  const icon = sportIcon(sport, title);
  const color = sportColor(sport, title);
  const label =
    /wakeboard|wakeskat|surf/i.test(title ?? '')
      ? 'Surfing'
      : /kor[cč]u[ľl]/i.test(title ?? '')
        ? 'Skating'
        : sportDisplayLabel(sport);

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-1 ${className}`}
      title={label}
    >
      <span
        className="material-symbols-outlined shrink-0 leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)]"
        style={{
          fontSize: iconSize,
          color,
          fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24",
        }}
        aria-hidden
      >
        {icon}
      </span>
      {iconOnly ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className={`min-w-0 truncate ${labelClassName}`}>{label}</span>
      )}
    </span>
  );
}
