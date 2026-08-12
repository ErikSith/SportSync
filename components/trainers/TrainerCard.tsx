import Link from 'next/link';
import { formatCoachRating, formatDistanceMiles, type CoachCardData } from '@/lib/data/trainers-shared';

const DEFAULT_PORTRAIT =
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80';

const SPORT_COVERS: Record<string, string> = {
  STRENGTH: 'https://lh3.googleusercontent.com/aida/AP1WRLsYRKIaOjjGsaYtIgkr37HlkcCYgb5DB_-1tbGoMbeb8B4ilpz1kp7SFlKbnzHFisfCzsPq5S_tmYYEUOz5JTvTvVHXdTZfCLg3zARPqT5ZTUMQq7_NfuMtZtqw6_8hhpxhke7O6GLWLnwIfZnSSkjD7LPyJ2WBLAkdcvK6cK2zS1CYfrdOx1WVgJNnDymMTW1nyTWsUjHXMhon4ud1_yiCPJym0YqbTYO1mgOAQlMyeEqecpAHPtIW6n8',
  HIIT: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQS8aFSfkpa-lN2FZ6-dSvVOoZ2iYh-GhPWLDjK3rR9UKypkv_jOxmiT_UIpk5m4KNVeH13ExnBODcUSrj-F3On9vW0VgaO9oJkHdcpaZ-3M_qMuunD1UXOV9GIaxKiK1hr5qq1_kqHZExuNEgdkVywqZF4qapLGFRjJbarBPMleaj-KdeRipJFQKtBW0X5tmT2caBrNm_hFvn8dQQmX5lLOyDjEG806Va-So7C7kwoy0juPR-MeIpOO6fF_FPAzZoHJMwkL2HkJY',
  TENNIS: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWlFg5rmemTB8z0I2srwQsvrVlphVz6ucwzuVa6fKBYHvMOBKPq0Aoo2kcNL_wbKzWgg8NtRj7YopcBIJOrotKcvNKUh8TkjBntEq8Xg9U04g_pgbkorSmn1YOqpPAi9nyhAypdGNJ7QQszfNYNDuCubXg53qBDSyr24ZIcMrfFnojtRFFcVJKdLkfcWVaqpmNqmpQDAoaUEWxsjRqtOVjDiNqKuspZKizS2a74c_LfeYpFlUMsfSu962vjJE4FGfpUJ25aUyVxe8',
  PADEL: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80',
  RUNNING: 'https://images.unsplash.com/photo-1476480862126-209bfaa8ecc8?w=800&q=80',
  CYCLING: 'https://images.unsplash.com/photo-1517649763962-0c62306601b7?w=800&q=80',
  FOOTBALL: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&q=80',
  BASKETBALL: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
  GOLF: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80',
};

function coverForCoach(coach: CoachCardData): string {
  if (coach.avatarUrl) return coach.avatarUrl;
  const primarySport = coach.sports[0]?.toUpperCase();
  if (primarySport && SPORT_COVERS[primarySport]) return SPORT_COVERS[primarySport];
  return DEFAULT_PORTRAIT;
}

export function TrainerCard({ coach, staggerIndex = 0 }: { coach: CoachCardData; staggerIndex?: number }) {
  const cover = coverForCoach(coach);
  const isElite = coach.karmaScore >= 50;
  const distanceLabel = formatDistanceMiles(coach.distanceMiles);
  const staggerClass =
    staggerIndex === 1 ? 'md:translate-y-8' : staggerIndex === 2 ? 'lg:translate-y-16' : '';

  return (
    <Link
      href={`/trainers/${coach.id}`}
      className={`glass-card rounded-2xl overflow-hidden relative group cursor-pointer block ${staggerClass}`}
    >
      {isElite && (
        <div className="absolute top-4 right-4 z-10 bg-surface-container-lowest/80 backdrop-blur-md border border-secondary/50 px-3 py-1 rounded-full flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified
          </span>
          <span className="font-label-caps text-[10px] text-secondary uppercase tracking-widest">Elite Certified</span>
        </div>
      )}

      {coach.isNew && !isElite && (
        <div className="absolute top-4 right-4 z-10 bg-primary-container px-3 py-1 rounded-full flex items-center shadow-[0_0_10px_rgba(255,87,34,0.5)]">
          <span className="font-label-caps text-[10px] text-on-primary-container uppercase tracking-widest font-bold">New</span>
        </div>
      )}

      <div className="aspect-[4/5] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent z-[1] opacity-90" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          src={cover}
          alt={coach.name}
        />

        <div className="absolute bottom-0 left-0 w-full p-6 z-10 flex flex-col gap-2">
          <h3 className="font-headline-md text-headline-md text-white m-0 leading-tight">{coach.name}</h3>
          <p className="font-label-caps text-label-caps text-secondary uppercase tracking-widest m-0">{coach.specialty}</p>

          <div className="flex items-center gap-4 mt-2 pt-4 border-t border-white/10 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              <span className="font-body-md text-white font-bold">{formatCoachRating(coach.karmaScore)}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/30" />
            <span className="font-body-md text-tertiary-container text-sm">{coach.yearsExp}+ yrs exp</span>
            {(distanceLabel || coach.city) && (
              <>
                <div className="w-1 h-1 rounded-full bg-white/30" />
                <span className="font-body-md text-tertiary-container text-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {distanceLabel ?? coach.city}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
