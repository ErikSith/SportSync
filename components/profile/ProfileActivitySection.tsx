import type { KarmaHistoryEntry } from '@/lib/data/profile-stats';
import { ActivityFeed } from '@/components/profile/ActivityFeed';

interface ProfileActivitySectionProps {
  entries: KarmaHistoryEntry[];
}

export function ProfileActivitySection({ entries }: ProfileActivitySectionProps) {
  return (
    <section className="glass-panel rounded-xl p-5">
      <ActivityFeed entries={entries} embedded />
    </section>
  );
}
