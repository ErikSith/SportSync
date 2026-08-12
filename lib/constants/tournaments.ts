export const TOURNAMENT_FORMATS = [
  'SINGLE_ELIMINATION',
  'DOUBLE_ELIMINATION',
  'ROUND_ROBIN',
  'GROUP_STAGE',
] as const;

export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  SINGLE_ELIMINATION: 'Single Elimination',
  DOUBLE_ELIMINATION: 'Double Elimination',
  ROUND_ROBIN: 'Round Robin',
  GROUP_STAGE: 'Group Stage',
};

export const SKILL_LEVEL_PRESETS = {
  ALL: { label: 'All levels', min: null, max: null },
  BEGINNER: { label: 'Beginner', min: 0, max: 800 },
  INTERMEDIATE: { label: 'Intermediate', min: 800, max: 1400 },
  ADVANCED: { label: 'Advanced', min: 1400, max: 1800 },
  PRO: { label: 'Pro / Elite', min: 1600, max: 3000 },
} as const;
