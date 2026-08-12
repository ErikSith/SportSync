import { createClient } from '@/lib/supabase/server';
import {
  ORCHESTRATION_TASKS,
  type EmitDomainEventInput,
} from '@/lib/orchestration/types';

export interface EmitDomainEventResult {
  signalOk: boolean;
  taskOk: boolean;
  error?: string;
}

/**
 * Write-time orchestration hook: audit signal + enqueue AI work.
 * Every domain fact (event created, match recorded) must fan out here
 * so matching / ranking / tagging can subscribe later.
 */
export async function emitDomainEvent(
  input: EmitDomainEventInput,
): Promise<EmitDomainEventResult> {
  const supabase = await createClient();
  const { name, payload, extraTasks = [] } = input;

  const { error: signalError } = await supabase.from('platform_signals').insert({
    user_id: payload.userId ?? null,
    event_name: name,
    payload,
  });

  if (signalError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[orchestration] signal insert failed', signalError.message);
    }
    return { signalOk: false, taskOk: false, error: signalError.message };
  }

  const tasks = [
    ORCHESTRATION_TASKS.FIND_NEARBY_CANDIDATES,
    ...extraTasks.filter((t) => t && t !== ORCHESTRATION_TASKS.FIND_NEARBY_CANDIDATES),
  ];

  const { error: taskError } = await supabase.from('ai_management_tasks').insert({
    entity_type: payload.entityType,
    entity_id: payload.entityId,
    tasks,
    status: 'pending',
  });

  if (taskError) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[orchestration] task enqueue failed', taskError.message);
    }
    return { signalOk: true, taskOk: false, error: taskError.message };
  }

  return { signalOk: true, taskOk: true };
}
