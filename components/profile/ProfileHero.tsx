'use client';

import { useState } from 'react';
import type { Profile, ProfileHeroStats } from '@/lib/data/profile-shared';
import { profileIsVerified } from '@/lib/utils/profile-tier';
import { initialsFromName } from '@/lib/utils/initials';
import { ProfileEditSheet } from '@/components/profile/ProfileEditSheet';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useT } from '@/components/i18n/LocaleProvider';

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
  const t = useT();
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
        setShareHint(t('profile.linkCopied'));
        window.setTimeout(() => setShareHint(null), 2000);
        return;
      }
      setShareHint(shareUrl);
    } catch {
      // User cancelled share sheet — ignore.
    }
  }

  const statCards = [
    { label: t('profile.stat.matches'), value: String(heroStats.gamesPlayed) },
    { label: t('profile.stat.groups'), value: String(heroStats.groupsCount) },
    { label: t('profile.stat.level'), value: heroStats.levelLabel },
  ];

  return (
    <>
      <section className="flex flex-col gap-4">
        {/* Full-bleed cover — breaks out of page padding on mobile */}
        <div className="relative -mx-container-margin-mobile md:mx-0">
          <div className="relative h-44 w-full overflow-hidden bg-surface-container-high md:h-48 md:rounded-2xl md:border md:border-white/8">
            {profile.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="h-full w-full object-cover" src={profile.coverUrl} alt="" />
            ) : (
              <div
                className="h-full w-full bg-gradient-to-br from-primary-container/40 via-surface-container to-secondary-container/25"
                aria-hidden
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/20 to-black/25" />

            <div className="absolute left-3 top-3 z-[1] md:left-4 md:top-4">
              {editable ? <LanguageSwitcher /> : null}
            </div>

            <div className="absolute right-3 top-3 flex gap-2 md:right-4 md:top-4">
              {editable ? (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  aria-label={t('common.edit')}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition-transform active:scale-90"
                >
                  <span className="material-symbols-outlined text-[22px]">edit</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleShare()}
                aria-label={t('common.share')}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition-transform active:scale-90"
              >
                <span className="material-symbols-outlined text-[22px]">ios_share</span>
              </button>
            </div>
          </div>

          <div className="relative z-[1] -mt-12 flex items-end justify-between gap-3 px-container-margin-mobile md:px-0">
            <div className="relative shrink-0">
              <div className="h-[88px] w-[88px] overflow-hidden rounded-full border-[3px] border-background bg-surface-container-high shadow-[0_8px_28px_rgba(0,0,0,0.45)]">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="h-full w-full object-cover" src={profile.avatarUrl} alt={displayName} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-headline-md text-[1.35rem] text-on-surface">
                    {initials}
                  </div>
                )}
              </div>
              {verified ? (
                <span
                  className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary-container text-white"
                  title="Overený profil"
                >
                  <span
                    className="material-symbols-outlined text-[15px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                </span>
              ) : null}
            </div>

            {editable ? (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="mb-1 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-surface-container px-4 font-label-caps text-[11px] uppercase tracking-[0.12em] text-on-surface transition-transform active:scale-[0.97] hover:border-white/25 hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                {t('common.edit')}
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5 px-0.5">
          <h1 className="font-headline-md text-[1.45rem] leading-tight tracking-wide text-on-surface md:text-[1.75rem]">
            {displayName}
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant">@{profile.username}</p>
          <p className="flex items-center gap-1 font-body-md text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-primary-container">location_on</span>
            {city}
          </p>
          {profile.bio ? (
            <p className="pt-1 font-body-md text-sm leading-relaxed text-on-surface">{profile.bio}</p>
          ) : editable ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="pt-1 text-left font-body-md text-sm text-on-surface-variant/70 active:text-primary-container"
            >
              {t('profile.addBio')}
            </button>
          ) : null}
          {shareHint ? (
            <p className="pt-1 font-label-caps text-[10px] uppercase tracking-widest text-secondary">
              {shareHint}
            </p>
          ) : null}
        </div>

        {/* Instagram-style compact stats — no heavy cards */}
        <div className="grid grid-cols-3 divide-x divide-white/8 rounded-2xl border border-white/8 bg-surface-container/60 py-3.5">
          {statCards.map((card) => (
            <div key={card.label} className="px-2 text-center">
              <div className="font-display-lg-mobile text-[1.35rem] leading-none text-on-surface">
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
