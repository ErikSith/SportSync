'use client';

import { useState } from 'react';
import type { Profile, ProfileHeroStats } from '@/lib/data/profile-shared';
import { profileIsVerified } from '@/lib/utils/profile-tier';
import { initialsFromName } from '@/lib/utils/initials';
import { ProfileEditSheet } from '@/components/profile/ProfileEditSheet';

interface ProfileHeroProps {
  profile: Profile;
  heroStats: ProfileHeroStats;
  editable?: boolean;
  /** Open edit sheet from parent (e.g. sports "Pridať"). */
  editOpen?: boolean;
  onEditOpenChange?: (open: boolean) => void;
}

export function ProfileHero({
  profile,
  heroStats,
  editable = false,
  editOpen: controlledEditOpen,
  onEditOpenChange,
}: ProfileHeroProps) {
  const [internalEditOpen, setInternalEditOpen] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);

  const editOpen = controlledEditOpen ?? internalEditOpen;
  function setEditOpen(open: boolean) {
    onEditOpenChange?.(open);
    if (controlledEditOpen === undefined) setInternalEditOpen(open);
  }

  const displayName = profile.fullName ?? profile.username;
  const initials = initialsFromName(displayName);
  const city = profile.city ?? 'Bratislava';
  const verified = profileIsVerified(profile.role, profile.karmaScore);
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/players/${profile.username}`
      : `/players/${profile.username}`;

  async function handleShare() {
    setShareHint(null);
    const payload = {
      title: `${displayName} · SportSync`,
      text: profile.bio ?? `Pozri si profil ${displayName} na SportSync`,
      url: shareUrl,
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(payload);
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareHint('Odkaz skopírovaný');
        window.setTimeout(() => setShareHint(null), 2000);
        return;
      }
      setShareHint(shareUrl);
    } catch {
      // User cancelled share sheet — ignore.
    }
  }

  const statCards = [
    { label: 'Odohrané hry', value: String(heroStats.gamesPlayed) },
    { label: 'Skupiny', value: String(heroStats.groupsCount) },
    { label: 'Úroveň', value: heroStats.levelLabel },
  ];

  return (
    <>
      <section className="flex flex-col items-center text-center gap-4">
        <div className="relative w-full">
          <div className="relative h-36 w-full overflow-hidden rounded-2xl border border-white/8 bg-surface-container-high">
            {profile.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="h-full w-full object-cover"
                src={profile.coverUrl}
                alt=""
              />
            ) : (
              <div
                className="h-full w-full bg-gradient-to-br from-primary-container/35 via-surface-container to-secondary-container/20"
                aria-hidden
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          </div>

          <div className="relative -mt-14 flex justify-center">
            <div className="relative">
              <div className="h-28 w-28 overflow-hidden rounded-full border-[3px] border-primary-container bg-surface-container-high shadow-[0_0_24px_rgba(200,75,36,0.35)]">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="h-full w-full object-cover" src={profile.avatarUrl} alt={displayName} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-headline-md text-headline-md text-on-surface">
                    {initials}
                  </div>
                )}
              </div>
              {verified ? (
                <span
                  className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary-container text-white"
                  title="Overený profil"
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 max-w-md">
          <h1 className="font-headline-md text-headline-md text-on-surface md:text-[1.75rem]">{displayName}</h1>
          <p className="flex items-center justify-center gap-1 font-body-md text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-primary-container">location_on</span>
            {city}, Slovakia
          </p>
          {profile.bio ? (
            <p className="line-clamp-2 font-body-md text-sm leading-relaxed text-on-surface">{profile.bio}</p>
          ) : editable ? (
            <p className="font-body-md text-sm text-on-surface-variant/70">Pridaj bio v úprave profilu.</p>
          ) : null}
        </div>

        <div className="flex w-full max-w-md gap-2">
          {editable ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex-1 rounded-xl bg-primary-container py-3 font-label-caps text-[11px] uppercase tracking-[0.14em] text-white transition-colors hover:brightness-110"
            >
              Upraviť profil
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleShare()}
            className={`rounded-xl border border-white/15 bg-surface-container py-3 font-label-caps text-[11px] uppercase tracking-[0.14em] text-on-surface transition-colors hover:border-white/25 hover:bg-surface-container-high ${
              editable ? 'flex-1' : 'w-full'
            }`}
          >
            Zdieľať
          </button>
        </div>
        {shareHint ? (
          <p className="font-label-caps text-[10px] uppercase tracking-widest text-secondary">{shareHint}</p>
        ) : null}

        <div className="grid w-full grid-cols-3 gap-2">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-white/5 bg-surface-container px-2 py-3.5 text-center"
            >
              <div className="font-display-lg-mobile text-[1.65rem] leading-none text-primary-container">
                {card.value}
              </div>
              <div className="mt-1.5 font-label-caps text-[9px] uppercase tracking-[0.12em] text-on-surface-variant">
                {card.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {editable ? (
        <ProfileEditSheet open={editOpen} onClose={() => setEditOpen(false)} profile={profile} />
      ) : null}
    </>
  );
}
