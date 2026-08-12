import { getAiTasksForEntity } from '@/lib/ai/plan-executor';

interface AiManagementPlanPanelProps {
  entityType: 'event' | 'tournament';
  entityId: string;
}

export async function AiManagementPlanPanel({ entityType, entityId }: AiManagementPlanPanelProps) {
  const tasks = await getAiTasksForEntity(entityType, entityId);
  const latest = tasks[0];
  if (!latest) return null;

  return (
    <section className="glass-panel rounded-xl p-5 border border-primary/20 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-headline-md text-[16px] text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
          AI Management Plan
        </h3>
        <span
          className={`font-label-caps text-[10px] uppercase px-2 py-1 rounded-full border ${
            latest.status === 'completed'
              ? 'text-secondary border-secondary/40 bg-secondary/10'
              : latest.status === 'running'
                ? 'text-primary border-primary/40 bg-primary/10'
                : 'text-on-surface-variant border-outline-variant/40'
          }`}
        >
          {latest.status}
        </span>
      </div>
      <ul className="space-y-2">
        {latest.tasks.map((task, i) => (
          <li key={i} className="flex items-start gap-2 font-body-md text-body-md text-on-surface-variant">
            <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 shrink-0">check_circle</span>
            {task}
          </li>
        ))}
      </ul>
      {latest.lastRunAt && (
        <p className="font-label-caps text-[10px] text-tertiary-container uppercase">
          Last executed {latest.lastRunAt.toLocaleString()}
        </p>
      )}
    </section>
  );
}
