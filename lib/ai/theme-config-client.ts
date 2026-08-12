// Client-safe mirror of the server theme config (lib/ai/theme-config.ts).
// Used by React components to resolve a sportType + themeConfig JSON into
// concrete CSS values for the dynamic, sport-specific event UI.

export type SportTypeKey = 'PADEL' | 'TENNIS' | 'FOOTBALL' | 'BASKETBALL' | 'ATLETIKA' | 'OTHER';

export interface ThemeConfig {
  accent: string;
  accentSoft: string;
  gradient: string;
  tabs: string[];
  label: string;
}

const BRAND = {
  coral: '#c84b24',
  coralDeep: '#5f1500',
  coralSoft: 'rgba(200,75,36,0.18)',
  gold: '#e9c349',
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
  OTHER: {
    accent: BRAND.coral,
    accentSoft: BRAND.coralSoft,
    gradient: `linear-gradient(135deg, ${BRAND.coralDeep} 0%, ${BRAND.coral} 55%, ${BRAND.gold} 100%)`,
    tabs: ['Prehľad', 'Pravidlá & Harmonogram', 'Sponzori', 'Účastníci'],
    label: 'Šport',
  },
};

function sanitizeThemeColor(value: string | undefined, fallback: string): string {
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

function sanitizeThemeGradient(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (/#(?:7c3aed|4c1d95|9333ea|a855f7|8b5cf6|6d28d9|5b21b6|6366f1|4f46e5)|purple|violet|indigo/i.test(value)) {
    return fallback;
  }
  return value;
}

export function resolveTheme(
  sportType: string | undefined,
  themeConfig: Record<string, unknown> | undefined,
): ThemeConfig {
  const key = (sportType as SportTypeKey) ?? 'OTHER';
  const base = SPORT_TYPE_THEMES[key] ?? SPORT_TYPE_THEMES.OTHER;
  if (!themeConfig) return base;
  const tabs =
    Array.isArray(themeConfig.tabs) && (themeConfig.tabs as string[]).length > 0
      ? (themeConfig.tabs as string[])
      : base.tabs;
  return {
    accent: sanitizeThemeColor(
      typeof themeConfig.accent === 'string' ? themeConfig.accent : undefined,
      base.accent,
    ),
    accentSoft: sanitizeThemeColor(
      typeof themeConfig.accentSoft === 'string' ? themeConfig.accentSoft : undefined,
      base.accentSoft,
    ),
    gradient: sanitizeThemeGradient(
      typeof themeConfig.gradient === 'string' ? themeConfig.gradient : undefined,
      base.gradient,
    ),
    tabs,
    label: typeof themeConfig.label === 'string' ? (themeConfig.label as string) : base.label,
  };
}
