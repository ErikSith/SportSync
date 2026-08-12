import { createClient } from '@/lib/supabase/server';
import { ORCHESTRATION_TASKS } from '@/lib/orchestration/types';
import type { DomainEntityType } from '@/lib/orchestration/types';
import { findNearbyCandidates } from '@/lib/orchestration/handlers/find-nearby-candidates';

export type AiEntityType = DomainEntityType;

export interface AiTaskRecord {
  id: string;
  entityType: AiEntityType;
  entityId: string;
  tasks: string[];
  status: string;
  lastRunAt: Date | null;
}

/** Persist an AI management plan when an event/tournament is created. */
export async function persistAiPlan(
  entityType: 'event' | 'tournament',
  entityId: string,
  tasks: string[],
): Promise<void> {
  const supabase = await createClient();
  await supabase.from('ai_management_tasks').insert({
    entity_type: entityType,
    entity_id: entityId,
    tasks,
    status: 'pending',
  });
}

/** Execute pending AI management tasks (called by cron or manual trigger). */
export async function executePendingAiTasks(): Promise<{
  processed: number;
  results: Array<{ taskId: string; entityType: string; entityId: string; actions: string[] }>;
}> {
  const supabase = await createClient();

  const { data: pending, error } = await supabase
    .from('ai_management_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20);

  if (error || !pending?.length) return { processed: 0, results: [] };

  const results: Array<{ taskId: string; entityType: string; entityId: string; actions: string[] }> = [];

  for (const task of pending) {
    await supabase.from('ai_management_tasks').update({ status: 'running' }).eq('id', task.id);

    const taskList = (task.tasks as string[]) ?? [];
    const actions: string[] = [];
    const entityType = task.entity_type as AiEntityType;
    const entityId = task.entity_id as string;

    for (const item of taskList) {
      const action = await executeTaskItem(entityType, entityId, item);
      if (action) actions.push(action);
    }

    await supabase
      .from('ai_management_tasks')
      .update({ status: 'completed', last_run_at: new Date().toISOString() })
      .eq('id', task.id);

    results.push({
      taskId: task.id as string,
      entityType,
      entityId,
      actions,
    });
  }

  return { processed: results.length, results };
}

async function executeTaskItem(
  entityType: AiEntityType,
  entityId: string,
  taskText: string,
): Promise<string | null> {
  const normalized = taskText.trim().toLowerCase();
  const supabase = await createClient();

  if (normalized === ORCHESTRATION_TASKS.FIND_NEARBY_CANDIDATES) {
    const result = await findNearbyCandidates(entityType, entityId);
    return `nearby_candidates:${result.candidateCount}:${result.reason ?? 'ok'}`;
  }

  // Legacy keyword stubs for free-text AI management plans
  if (normalized.includes('waitlist') && entityType === 'event') {
    return `waitlist_monitoring_enabled:${entityId}`;
  }

  if (normalized.includes('reminder') || normalized.includes('notify')) {
    await supabase.from('platform_signals').insert({
      event_name: 'ai.plan_executed',
      payload: { entityType, entityId, action: 'schedule_reminder', task: taskText },
    });
    return `reminder_scheduled:${entityId}`;
  }

  if (normalized.includes('bracket') && entityType === 'tournament') {
    const { generateBracket } = await import('@/lib/tournaments/bracket');
    const result = await generateBracket(entityId);
    return result.ok ? `bracket_generated:${entityId}` : null;
  }

  if (normalized.includes('fill') || normalized.includes('promote')) {
    await supabase.from('platform_signals').insert({
      event_name: 'ai.plan_executed',
      payload: { entityType, entityId, action: 'fill_campaign', task: taskText },
    });
    return `fill_campaign_logged:${entityId}`;
  }

  if (normalized.includes('cancel') && normalized.includes('never')) {
    await supabase.from('platform_signals').insert({
      event_name: 'ai.plan_executed',
      payload: { entityType, entityId, action: 'auto_cancel_policy', task: taskText },
    });
    return `auto_cancel_policy:${entityId}`;
  }

  return null;
}

export async function getAiTasksForEntity(
  entityType: AiEntityType,
  entityId: string,
): Promise<AiTaskRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ai_management_tasks')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    entityType: row.entity_type as AiEntityType,
    entityId: row.entity_id as string,
    tasks: (row.tasks as string[]) ?? [],
    status: row.status as string,
    lastRunAt: row.last_run_at ? new Date(row.last_run_at as string) : null,
  }));
}
