// Dynamic, sport-specific visual theme for the AI-Driven Event Factory.
//
// Accents stay inside SportSync brand (coral / gold / warm dark). Per-sport
// hues may vary slightly, but never drift into purple / indigo defaults.

export type SportTypeKey = 'PADEL' | 'TENNIS' | 'FOOTBALL' | 'BASKETBALL' | 'ATLETIKA' | 'OTHER';

export interface ThemeConfig {
  /// Dominant accent color (hex) used for buttons, active tabs, accents.
  accent: string;
  /// Softer tint of the accent for backgrounds/borders.
  accentSoft: string;
  /// CSS gradient string for the hero/cover overlay.
  gradient: string;
  /// Sport-specific tab labels shown on the event detail page.
  tabs: string[];
  /// Short human label for the sport family (SK).
  label: string;
}

/** SportSync brand anchors — coral + gold from tailwind tokens. */
const BRAND = {
  coral: '#c84b24',
  coralDeep: '#5f1500',
  coralSoft: 'rgba(200,75,36,0.18)',
  gold: '#e9c349',
  goldDeep: '#574500',
  goldSoft: 'rgba(233,195,73,0.18)',
  green: '#16a34a',
  greenDeep: '#064e3b',
  greenSoft: 'rgba(22,163,74,0.18)',
  orange: '#ea580c',
  orangeDeep: '#7c2d12',
  orangeSoft: 'rgba(234,88,12,0.18)',
  amber: '#d97706',
  amberDeep: '#78350f',
  amberSoft: 'rgba(217,119,6,0.18)',
} as const;

export const SPORT_TYPE_THEMES: Record<SportTypeKey, ThemeConfig> = {
  PADEL: {
    accent: BRAND.green,
    accentSoft: BRAND.greenSoft,
    gradient: `linear-gradient(135deg, ${BRAND.greenDeep} 0%, ${BRAND.green} 100%)`,
    tabs: ['Prehľad', 'Kurty & Pravidlá', 'Sponzori', 'Účastníci'],
    label: 'Padel',
  },
  TENNIS: {
    accent: '#22c55e',
    accentSoft: 'rgba(34,197,94,0.18)',
    gradient: 'linear-gradient(135deg, #14532d 0%, #22c55e 100%)',
    tabs: ['Prehľad', 'Kurty & Pravidlá', 'Sponzori', 'Účastníci'],
    label: 'Tenis',
  },
  FOOTBALL: {
    accent: BRAND.coral,
    accentSoft: BRAND.coralSoft,
    gradient: `linear-gradient(135deg, ${BRAND.coralDeep} 0%, ${BRAND.coral} 100%)`,
    tabs: ['Prehľad', 'Rozpis & Pravidlá', 'Sponzori', 'Tímy'],
    label: 'Futbal',
  },
  BASKETBALL: {
    accent: BRAND.orange,
    accentSoft: BRAND.orangeSoft,
    gradient: `linear-gradient(135deg, ${BRAND.orangeDeep} 0%, ${BRAND.orange} 100%)`,
    tabs: ['Prehľad', 'Zápasy & Pravidlá', 'Sponzori', 'Tímy'],
    label: 'Basketbal',
  },
  ATLETIKA: {
    accent: BRAND.amber,
    accentSoft: BRAND.amberSoft,
    gradient: `linear-gradient(135deg, ${BRAND.amberDeep} 0%, ${BRAND.amber} 100%)`,
    tabs: ['Prehľad', 'Disciplíny & Harmonogram', 'Sponzori', 'Výsledky'],
    label: 'Atletika',
  },
  // FITNESS / HOCKEY / etc. — brand coral, never purple
  OTHER: {
    accent: BRAND.coral,
    accentSoft: BRAND.coralSoft,
    gradient: `linear-gradient(135deg, ${BRAND.coralDeep} 0%, ${BRAND.coral} 55%, ${BRAND.gold} 100%)`,
    tabs: ['Prehľad', 'Pravidlá & Harmonogram', 'Sponzori', 'Účastníci'],
    label: 'Šport',
  },
};

/** Map a long-tail EVENT_SPORTS value to its SportType family. */
export function resolveSportType(sport: string): SportTypeKey {
  const s = sport.toUpperCase();
  if (s === 'PADEL') return 'PADEL';
  if (s === 'TENNIS') return 'TENNIS';
  if (s === 'FOOTBALL' || s === 'SOCCER' || s === 'FUTSAL') return 'FOOTBALL';
  if (s === 'BASKETBALL' || s === 'BASKET') return 'BASKETBALL';
  if (
    s === 'RUNNING' ||
    s === 'CYCLING' ||
    s === 'GOLF' ||
    s === 'ATLETIKA' ||
    s === 'ATHLETICS' ||
    s === 'SWIMMING' ||
    s === 'SURFING' ||
    s === 'CLIMBING'
  )
    return 'ATLETIKA';
  // FITNESS, YOGA, HOCKEY, HANDBALL, COMBAT, SQUASH, VOLLEYBALL, BOWLING, OTHER → brand coral
  return 'OTHER';
}

export function getThemeForSportType(sportType: SportTypeKey): ThemeConfig {
  return SPORT_TYPE_THEMES[sportType] ?? SPORT_TYPE_THEMES.OTHER;
}

/** Strip legacy purple / indigo accents stored in theme_config JSON. */
export function sanitizeThemeColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const v = value.toLowerCase();
  if (
    v.includes('purple') ||
    v.includes('violet') ||
    v.includes('indigo') ||
    /#(?:7c3aed|4c1d95|9333ea|a855f7|8b5cf6|6d28d9|5b21b6|6366f1|4f46e5)/i.test(v)
  ) {
    return fallback;
  }
  return value;
}

export function sanitizeThemeGradient(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (/#(?:7c3aed|4c1d95|9333ea|a855f7|8b5cf6|6d28d9|5b21b6|6366f1|4f46e5)|purple|violet|indigo/i.test(value)) {
    return fallback;
  }
  return value;
}

/** Build a complete themeConfig JSON, merging AI overrides on sport defaults. */
export function buildThemeConfig(
  sportType: SportTypeKey,
  overrides?: Partial<ThemeConfig> | null,
): ThemeConfig {
  const base = getThemeForSportType(sportType);
  if (!overrides) return base;
  return {
    accent: sanitizeThemeColor(overrides.accent, base.accent),
    accentSoft: sanitizeThemeColor(overrides.accentSoft, base.accentSoft),
    gradient: sanitizeThemeGradient(overrides.gradient, base.gradient),
    tabs: Array.isArray(overrides.tabs) && overrides.tabs.length > 0 ? overrides.tabs : base.tabs,
    label: overrides.label ?? base.label,
  };
}
