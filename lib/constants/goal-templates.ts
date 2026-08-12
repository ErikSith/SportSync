export type GoalMetricType =
  | 'session_count'
  | 'weight_reps'
  | 'match_count'
  | 'karma_score'
  | 'week_streak'
  | 'distance_km';

export type GoalTrackingMode = 'manual' | 'auto';

export interface GoalTemplate {
  key: string;
  title: string;
  description: string;
  icon: string;
  metricType: GoalMetricType;
  trackingMode: GoalTrackingMode;
  defaultTargetValue: number;
  defaultTargetMeta: Record<string, number | string>;
  sportRequired: boolean;
  category: 'fitness' | 'sport';
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    key: 'gym_weekly',
    title: 'Gym streak',
    description: 'Hit the gym N times per week for W weeks',
    icon: 'fitness_center',
    metricType: 'week_streak',
    trackingMode: 'manual',
    defaultTargetValue: 4,
    defaultTargetMeta: { weeks: 8 },
    sportRequired: false,
    category: 'fitness',
  },
  {
    key: 'strength_pr',
    title: 'Strength PR',
    description: 'Hit a bench or squat PR — target weight × reps',
    icon: 'exercise',
    metricType: 'weight_reps',
    trackingMode: 'manual',
    defaultTargetValue: 80,
    defaultTargetMeta: { reps: 6, lift: 'bench' },
    sportRequired: false,
    category: 'fitness',
  },
  {
    key: 'running_distance',
    title: 'Monthly distance',
    description: 'Log running distance this month (km)',
    icon: 'directions_run',
    metricType: 'distance_km',
    trackingMode: 'manual',
    defaultTargetValue: 50,
    defaultTargetMeta: {},
    sportRequired: false,
    category: 'fitness',
  },
  {
    key: 'complete_matches',
    title: 'Complete matches',
    description: 'Finish community matches on SportSync',
    icon: 'sports_score',
    metricType: 'match_count',
    trackingMode: 'auto',
    defaultTargetValue: 10,
    defaultTargetMeta: {},
    sportRequired: false,
    category: 'sport',
  },
  {
    key: 'join_tournament',
    title: 'Tournament entries',
    description: 'Register for tournaments on SportSync',
    icon: 'emoji_events',
    metricType: 'match_count',
    trackingMode: 'auto',
    defaultTargetValue: 3,
    defaultTargetMeta: { kind: 'tournament' },
    sportRequired: false,
    category: 'sport',
  },
  {
    key: 'reach_karma_tier',
    title: 'Reach PRO tier',
    description: 'Earn enough karma to reach PRO tier (500+)',
    icon: 'star',
    metricType: 'karma_score',
    trackingMode: 'auto',
    defaultTargetValue: 500,
    defaultTargetMeta: { tier: 'PRO TIER' },
    sportRequired: false,
    category: 'sport',
  },
  {
    key: 'host_lobbies',
    title: 'Host matches',
    description: 'Host community lobbies for your sport',
    icon: 'groups',
    metricType: 'match_count',
    trackingMode: 'auto',
    defaultTargetValue: 5,
    defaultTargetMeta: { kind: 'hosted' },
    sportRequired: false,
    category: 'sport',
  },
];

export const GOAL_EMOJIS: Record<string, string> = {
  gym_weekly: '💪',
  strength_pr: '🏋️',
  running_distance: '🏃',
  complete_matches: '🎾',
  join_tournament: '🏆',
  reach_karma_tier: '⭐',
  host_lobbies: '🤝',
};

export function goalEmoji(templateKey: string): string {
  return GOAL_EMOJIS[templateKey] ?? '🎯';
}

export function getGoalTemplate(key: string): GoalTemplate | undefined {
  return GOAL_TEMPLATES.find((t) => t.key === key);
}

export function buildGoalTitle(
  template: GoalTemplate,
  targetValue: number,
  targetMeta: Record<string, unknown>,
): string {
  switch (template.key) {
    case 'gym_weekly':
      return `Gym ${targetValue}×/week for ${Number(targetMeta.weeks ?? 8)} weeks`;
    case 'strength_pr': {
      const lift = String(targetMeta.lift ?? 'bench');
      const reps = Number(targetMeta.reps ?? 6);
      return `${lift.charAt(0).toUpperCase()}${lift.slice(1)} ${targetValue} kg × ${reps} reps`;
    }
    case 'running_distance':
      return `Run ${targetValue} km this month`;
    case 'complete_matches':
      return targetMeta.sport
        ? `Complete ${targetValue} ${String(targetMeta.sport).toLowerCase()} matches`
        : `Complete ${targetValue} matches`;
    case 'join_tournament':
      return `Enter ${targetValue} tournaments`;
    case 'reach_karma_tier':
      return `Reach ${String(targetMeta.tier ?? 'PRO TIER')}`;
    case 'host_lobbies':
      return `Host ${targetValue} lobbies`;
    default:
      return template.title;
  }
}
