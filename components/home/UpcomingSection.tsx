import Link from 'next/link';
import { formatLobbyLabel } from '@/lib/constants/lobbies';
import type { UpcomingLobbyCard } from '@/lib/data/homepage';

function formatWhen(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today • ${time}`;
  if (isTomorrow) return `Tomorrow • ${time}`;
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • ${time}`;
}

export function UpcomingSection({ lobbies }: { lobbies: UpcomingLobbyCard[] }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">calendar_month</span>
          My Upcoming
        </h3>
        <Link
          href="/lobby"
          className="text-secondary font-label-caps text-label-caps hover:text-secondary-fixed transition-all flex items-center gap-1 group"
        >
          VIEW ALL{' '}
          <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
            chevron_right
          </span>
        </Link>
      </div>

      {lobbies.length === 0 ? (
        <div className="glass-card p-6 rounded-xl text-center space-y-2">
          <p className="font-body-md text-body-md text-on-surface">No upcoming matches yet.</p>
          <Link href="/lobby" className="font-label-caps text-label-caps text-secondary hover:text-secondary-fixed">
            FIND PARTNERS TO GET STARTED
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {lobbies.map((lobby, index) => (
            <Link
              key={lobby.id}
              href={`/lobby/${lobby.id}`}
              className={`glass-card p-5 rounded-xl flex items-center justify-between group cursor-pointer border-l-4 relative overflow-hidden ${
                index % 2 === 0 ? 'border-l-primary-container' : 'border-l-secondary-container'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-container/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 rounded-lg bg-surface-container flex items-center justify-center shrink-0 border border-secondary/20">
                  <span className="material-symbols-outlined text-primary text-[28px]">sports_tennis</span>
                </div>
                <div>
                  <p
                    className={`font-label-caps text-label-caps uppercase mb-1 ${
                      index % 2 === 0 ? 'text-primary' : 'text-secondary'
                    }`}
                  >
                    {formatWhen(lobby.scheduledAt)}
                  </p>
                  <h4 className="font-headline-md text-[18px] font-semibold text-on-surface">
                    {lobby.sport} • {formatLobbyLabel(lobby.format)}
                  </h4>
                  <p className="font-body-md text-body-md text-tertiary-container flex items-center gap-1 text-[14px]">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {lobby.venueName ?? lobby.city} {lobby.isHost ? '• Hosting' : ''}
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline group-hover:text-secondary transition-all relative z-10">
                arrow_forward
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
