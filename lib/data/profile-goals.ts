import { createClient } from '@/lib/supabase/server';
import { buildGoalTitle, getGoalTemplate, type GoalMetricType } from '@/lib/constants/goal-templates';
import { getProfileGameStats, profileTierLabel, type ProfileGameStats } from '@/lib/data/profile-stats';

export type UserGoalStatus = 'active' | 'completed' | 'archived';

export interface UserGoalView {
  id: string;
  templateKey: string;
  title: string;
  sport: string | null;
  metricType: GoalMetricType;
  targetValue: number;
  targetMeta: Record<string, unknown>;
  currentValue: number;
  trackingMode: 'manual' | 'auto';
  /** ISO date string or null — must stay serializable for Client Components. */
  deadline: string | null;
  isFeatured: boolean;
  status: UserGoalStatus;
  progressPercent: number;
  progressLabel: string;
  /** ISO timestamp — must stay serializable for Client Components. */
  createdAt: string;
}

interface UserGoalRow {
  id: string;
  user_id: string;
  template_key: string;
  title: string;
  sport: string | null;
  metric_type: string;
  target_value: number | string;
  target_meta: Record<string, unknown> | null;
  current_value: number | string;
  tracking_mode: string;
  deadline: string | null;
  is_featured: boolean;
  status: string;
  created_at: string;
}

interface GoalLogRow {
  goal_id: string;
  value: number | string;
  logged_at: string;
  note: string | null;
}

function num(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(date: Date): string {
  return startOfWeek(date).toISOString().slice(0, 10);
}

function computeGymWeeklyProgress(
  logs: GoalLogRow[],
  targetPerWeek: number,
  totalWeeks: number,
  createdAt: Date,
): { current: number; label: string; percent: number } {
  const sessionsByWeek = new Map<string, number>();
  for (const log of logs) {
    const key = weekKey(new Date(log.logged_at));
    sessionsByWeek.set(key, (sessionsByWeek.get(key) ?? 0) + num(log.value));
  }

  let weeksCompleted = 0;
  const cursor = startOfWeek(createdAt);
  const now = new Date();

  for (let i = 0; i < totalWeeks; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (sessionsByWeek.get(key) ?? 0 >= targetPerWeek) weeksCompleted += 1;
    cursor.setDate(cursor.getDate() + 7);
    if (cursor > now && i > 0) break;
  }

  const percent = totalWeeks > 0 ? Math.min(100, Math.round((weeksCompleted / totalWeeks) * 100)) : 0;
  return {
    current: weeksCompleted,
    label: `${weeksCompleted}/${totalWeeks} weeks`,
    percent,
  };
}

function computeStrengthProgress(
  logs: GoalLogRow[],
  targetWeight: number,
  targetReps: number,
): { current: number; label: string; percent: number } {
  const successful = logs.filter((log) => num(log.value) >= targetWeight).length;
  const current = Math.min(successful, targetReps);
  const percent = targetReps > 0 ? Math.min(100, Math.round((current / targetReps) * 100)) : 0;
  return {
    current,
    label: `${targetWeight} kg × ${current}/${targetReps} reps`,
    percent,
  };
}

function computeDistanceProgress(logs: GoalLogRow[], targetKm: number): { current: number; label: string; percent: number } {
  const current = logs.reduce((sum, log) => sum + num(log.value), 0);
  const percent = targetKm > 0 ? Math.min(100, Math.round((current / targetKm) * 100)) : 0;
  return {
    current: Math.round(current * 10) / 10,
    label: `${Math.round(current * 10) / 10}/${targetKm} km`,
    percent,
  };
}

async function getSportCompletedLobbies(profileId: string, sport: string | null): Promise<number> {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from('lobby_participants')
    .select('lobby_id')
    .eq('user_id', profileId);

  const { data: hostedRows } = await supabase.from('lobbies').select('id').eq('host_id', profileId);

  const lobbyIds = [
    ...new Set([
      ...(memberships ?? []).map((row) => row.lobby_id as string),
      ...(hostedRows ?? []).map((row) => row.id as string),
    ]),
  ];

  if (lobbyIds.length === 0) return 0;

  let query = supabase
    .from('lobbies')
    .select('*', { count: 'exact', head: true })
    .in('id', lobbyIds)
    .eq('status', 'completed');

  if (sport) query = query.eq('sport', sport);

  const { count } = await query;
  return count ?? 0;
}

async function computeAutoProgress(
  profileId: string,
  karmaScore: number,
  stats: ProfileGameStats,
  metricType: GoalMetricType,
  targetValue: number,
  targetMeta: Record<string, unknown>,
  sport: string | null,
): Promise<{ current: number; label: string; percent: number }> {
  const kind = String(targetMeta.kind ?? '');

  if (metricType === 'karma_score') {
    const current = karmaScore;
    return {
      current,
      label: `${current}/${targetValue} karma`,
      percent: targetValue > 0 ? Math.min(100, Math.round((current / targetValue) * 100)) : 0,
    };
  }

  if (kind === 'tournament') {
    const current = stats.tournamentRegistrations;
    return {
      current,
      label: `${current}/${targetValue} tournaments`,
      percent: targetValue > 0 ? Math.min(100, Math.round((current / targetValue) * 100)) : 0,
    };
  }

  if (kind === 'hosted') {
    const current = stats.lobbiesHosted;
    return {
      current,
      label: `${current}/${targetValue} hosted`,
      percent: targetValue > 0 ? Math.min(100, Math.round((current / targetValue) * 100)) : 0,
    };
  }

  if (metricType === 'match_count') {
    const current = sport ? await getSportCompletedLobbies(profileId, sport) : stats.completedLobbies;
    return {
      current,
      label: `${current}/${targetValue} matches`,
      percent: targetValue > 0 ? Math.min(100, Math.round((current / targetValue) * 100)) : 0,
    };
  }

  return { current: 0, label: '0%', percent: 0 };
}

function computeManualProgress(
  logs: GoalLogRow[],
  metricType: GoalMetricType,
  targetValue: number,
  targetMeta: Record<string, unknown>,
  createdAt: Date,
): { current: number; label: string; percent: number } {
  switch (metricType) {
    case 'week_streak':
      return computeGymWeeklyProgress(logs, targetValue, Number(targetMeta.weeks ?? 8), createdAt);
    case 'weight_reps':
      return computeStrengthProgress(logs, targetValue, Number(targetMeta.reps ?? 6));
    case 'distance_km':
      return computeDistanceProgress(logs, targetValue);
    case 'session_count': {
      const current = logs.reduce((sum, log) => sum + num(log.value), 0);
      return {
        current,
        label: `${current}/${targetValue} sessions`,
        percent: targetValue > 0 ? Math.min(100, Math.round((current / targetValue) * 100)) : 0,
      };
    }
    default:
      return { current: 0, label: '0%', percent: 0 };
  }
}

function mapGoalRow(
  row: UserGoalRow,
  progress: { current: number; label: string; percent: number },
): UserGoalView {
  const status: UserGoalStatus =
    progress.percent >= 100 ? 'completed' : (row.status as UserGoalStatus);

  return {
    id: row.id,
    templateKey: row.template_key,
    title: row.title,
    sport: row.sport,
    metricType: row.metric_type as GoalMetricType,
    targetValue: num(row.target_value),
    targetMeta: row.target_meta ?? {},
    currentValue: progress.current,
    trackingMode: row.tracking_mode as 'manual' | 'auto',
    deadline: row.deadline ? new Date(row.deadline).toISOString() : null,
    isFeatured: row.is_featured,
    status: progress.percent >= 100 ? 'completed' : status,
    progressPercent: progress.percent,
    progressLabel: progress.label,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function getProfileGoals(
  profileId: string,
  karmaScore = 0,
): Promise<UserGoalView[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', profileId)
    .in('status', ['active', 'completed'])
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !rows?.length) return [];

  const goalIds = (rows as UserGoalRow[]).map((row) => row.id);
  const { data: logRows } = await supabase
    .from('user_goal_logs')
    .select('goal_id, value, logged_at, note')
    .in('goal_id', goalIds);

  const logsByGoal = new Map<string, GoalLogRow[]>();
  for (const log of (logRows ?? []) as GoalLogRow[]) {
    const list = logsByGoal.get(log.goal_id) ?? [];
    list.push(log);
    logsByGoal.set(log.goal_id, list);
  }

  const stats = await getProfileGameStats(profileId);

  const views = await Promise.all(
    (rows as UserGoalRow[]).map(async (row) => {
      const targetMeta = row.target_meta ?? {};
      const progress =
        row.tracking_mode === 'auto'
          ? await computeAutoProgress(
              profileId,
              karmaScore,
              stats,
              row.metric_type as GoalMetricType,
              num(row.target_value),
              targetMeta,
              row.sport,
            )
          : computeManualProgress(
              logsByGoal.get(row.id) ?? [],
              row.metric_type as GoalMetricType,
              num(row.target_value),
              targetMeta,
              new Date(row.created_at),
            );

      if (progress.percent >= 100 && row.status === 'active') {
        await supabase.from('user_goals').update({ status: 'completed', current_value: progress.current }).eq('id', row.id);
      } else if (row.tracking_mode === 'auto') {
        await supabase.from('user_goals').update({ current_value: progress.current }).eq('id', row.id);
      }

      return mapGoalRow(row, progress);
    }),
  );

  return views;
}

export function getFeaturedGoal(goals: UserGoalView[]): UserGoalView | null {
  return goals.find((g) => g.isFeatured && g.status === 'active') ?? goals.find((g) => g.status === 'active') ?? null;
}

export interface CreateGoalInput {
  templateKey: string;
  targetValue?: number;
  targetMeta?: Record<string, unknown>;
  sport?: string | null;
  title?: string;
  isFeatured?: boolean;
  deadline?: string | null;
}

export async function createUserGoal(profileId: string, input: CreateGoalInput): Promise<UserGoalView | null> {
  const template = getGoalTemplate(input.templateKey);
  if (!template) return null;

  const supabase = await createClient();
  const targetValue = input.targetValue ?? template.defaultTargetValue;
  const targetMeta = { ...template.defaultTargetMeta, ...(input.targetMeta ?? {}) };
  const title = input.title ?? buildGoalTitle(template, targetValue, targetMeta);

  if (input.isFeatured) {
    await supabase.from('user_goals').update({ is_featured: false }).eq('user_id', profileId);
  }

  const { data, error } = await supabase
    .from('user_goals')
    .insert({
      user_id: profileId,
      template_key: template.key,
      title,
      sport: input.sport ?? null,
      metric_type: template.metricType,
      target_value: targetValue,
      target_meta: targetMeta,
      tracking_mode: template.trackingMode,
      deadline: input.deadline ?? null,
      is_featured: input.isFeatured ?? false,
      status: 'active',
    })
    .select('*')
    .single();

  if (error || !data) return null;

  const goals = await getProfileGoals(profileId);
  return goals.find((g) => g.id === (data as UserGoalRow).id) ?? null;
}

export async function logGoalProgress(
  profileId: string,
  goalId: string,
  value: number,
  note?: string,
): Promise<UserGoalView | null> {
  const supabase = await createClient();

  const { data: goal } = await supabase
    .from('user_goals')
    .select('id, user_id, tracking_mode')
    .eq('id', goalId)
    .eq('user_id', profileId)
    .single();

  if (!goal || goal.tracking_mode !== 'manual') return null;

  const { error } = await supabase.from('user_goal_logs').insert({
    goal_id: goalId,
    value,
    note: note ?? null,
  });

  if (error) return null;

  const goals = await getProfileGoals(profileId);
  return goals.find((g) => g.id === goalId) ?? null;
}

export async function updateUserGoal(
  profileId: string,
  goalId: string,
  patch: { isFeatured?: boolean; status?: UserGoalStatus },
): Promise<boolean> {
  const supabase = await createClient();

  if (patch.isFeatured) {
    await supabase.from('user_goals').update({ is_featured: false }).eq('user_id', profileId);
  }

  const { error } = await supabase
    .from('user_goals')
    .update(patch)
    .eq('id', goalId)
    .eq('user_id', profileId);

  return !error;
}

export { profileTierLabel };
