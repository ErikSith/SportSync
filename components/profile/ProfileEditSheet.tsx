'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/lib/data/profile-shared';
import { SUPPORTED_CITIES } from '@/lib/cities';
import { EVENT_SPORTS, sportDisplayLabel } from '@/lib/constants/sports';
import {
  normalizeSportSkills,
  sportSkillLabel,
  type SportSkillLevel,
  type SportSkillsMap,
} from '@/lib/profile/sport-skills';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface ProfileEditSheetProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
}

export function ProfileEditSheet({ open, onClose, profile }: ProfileEditSheetProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState(profile.fullName ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [username, setUsername] = useState(profile.username);
  const [city, setCity] = useState(profile.city ?? SUPPORTED_CITIES[0]?.name ?? 'Bratislava');
  const [preferredSports, setPreferredSports] = useState<string[]>(profile.preferredSports);
  const [sportSkills, setSportSkills] = useState<SportSkillsMap>(profile.sportSkills);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl);
  const [coverPreview, setCoverPreview] = useState(profile.coverUrl);
  const [error, setError] = useState<string | null>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const sports = (profile.preferredSports ?? []).map((s) => s.toUpperCase());
    setFullName(profile.fullName ?? '');
    setBio(profile.bio ?? '');
    setUsername(profile.username);
    setCity(profile.city ?? SUPPORTED_CITIES[0]?.name ?? 'Bratislava');
    setPreferredSports(sports);
    setSportSkills(normalizeSportSkills(sports, profile.sportSkills ?? {}));
    setAvatarPreview(profile.avatarUrl);
    setCoverPreview(profile.coverUrl);
    setError(null);
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  function toggleSport(sport: string) {
    setPreferredSports((prev) => {
      const next = prev.includes(sport)
        ? prev.filter((s) => s !== sport)
        : prev.length < 7
          ? [...prev, sport]
          : prev;
      setSportSkills((skills) => normalizeSportSkills(next, skills));
      return next;
    });
  }

  function setSkill(sport: string, level: SportSkillLevel) {
    setSportSkills((prev) => ({ ...prev, [sport]: level }));
  }

  async function uploadImage(kind: 'avatar' | 'cover', file: File) {
    setUploading(kind);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`/api/profile/${kind}`, { method: 'POST', body: formData });
    const body = (await res.json().catch(() => null)) as
      | { error?: string; avatarUrl?: string; coverUrl?: string }
      | null;

    setUploading(null);
    if (!res.ok) {
      setError(body?.error ?? `Could not upload ${kind}`);
      return;
    }

    if (kind === 'avatar' && body?.avatarUrl) setAvatarPreview(body.avatarUrl);
    if (kind === 'cover' && body?.coverUrl) setCoverPreview(body.coverUrl);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      setSubmitting(false);
      setError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setSubmitting(false);
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    const normalizedSports = preferredSports.map((s) => s.toUpperCase());
    const profileRes = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: fullName.trim() || null,
        bio: bio.trim() || null,
        username: trimmedUsername,
        preferredSports: normalizedSports,
        sportSkills: normalizeSportSkills(normalizedSports, sportSkills),
      }),
    });

    if (!profileRes.ok) {
      const body = (await profileRes.json().catch(() => null)) as {
        error?: string;
        issues?: { message?: string }[];
      } | null;
      setSubmitting(false);
      const issue = body?.issues?.[0]?.message;
      setError(body?.error ?? issue ?? 'Could not save profile');
      return;
    }

    const locationRes = await fetch('/api/profile/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'city', city }),
    });

    setSubmitting(false);

    if (!locationRes.ok) {
      setError('Profile saved but city could not be updated');
      router.refresh();
      return;
    }

    onClose();
    router.refresh();
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center overscroll-none sm:items-center sm:p-6"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Zavrieť"
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="relative z-[101] flex max-h-[92dvh] w-full max-w-none flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#141210] sm:max-h-[min(88vh,720px)] sm:max-w-lg sm:rounded-2xl"
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-white/25" />
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 pb-3 pt-2 sm:px-5 sm:pt-4">
              <h3 id="edit-profile-title" className="font-headline-md text-[1.15rem] text-on-surface">
                Upraviť profil
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Zavrieť"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-on-surface-variant transition-transform active:scale-90"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                <div className="flex gap-3">
                  <label className="flex-1 cursor-pointer space-y-2">
                    <span className="block font-label-caps text-[10px] uppercase text-on-surface-variant">
                      Profilovka
                    </span>
                    <span className="relative flex min-h-[88px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-surface-container">
                      {avatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarPreview}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : null}
                      <span className="relative z-[1] flex min-h-11 items-center justify-center gap-2 rounded-full bg-black/55 px-3.5 text-sm text-white backdrop-blur-sm">
                        <span className="material-symbols-outlined text-lg">photo_camera</span>
                        {uploading === 'avatar' ? 'Nahrávam…' : 'Zmeniť'}
                      </span>
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={uploading !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadImage('avatar', file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <label className="flex-1 cursor-pointer space-y-2">
                    <span className="block font-label-caps text-[10px] uppercase text-on-surface-variant">
                      Banner
                    </span>
                    <span className="relative flex min-h-[88px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-surface-container">
                      {coverPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverPreview}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : null}
                      <span className="relative z-[1] flex min-h-11 items-center justify-center gap-2 rounded-full bg-black/55 px-3.5 text-sm text-white backdrop-blur-sm">
                        <span className="material-symbols-outlined text-lg">wallpaper</span>
                        {uploading === 'cover' ? 'Nahrávam…' : 'Zmeniť'}
                      </span>
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={uploading !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadImage('cover', file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                <label className="block space-y-1.5">
                  <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">
                    Meno
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={80}
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-surface-container px-3.5 text-on-surface outline-none focus:border-primary-container/50"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">
                    Username
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={30}
                    pattern="^[a-zA-Z0-9_]+$"
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-surface-container px-3.5 text-on-surface outline-none focus:border-primary-container/50"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Bio</span>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={160}
                    rows={3}
                    placeholder="Čo hráš a s kým hľadáš partiu?"
                    className="w-full resize-none rounded-xl border border-white/10 bg-surface-container px-3.5 py-3 text-on-surface outline-none focus:border-primary-container/50"
                  />
                  <span className="font-label-caps text-[10px] text-on-surface-variant">
                    {bio.length}/160
                  </span>
                </label>

                <label className="block space-y-1.5">
                  <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">
                    Mesto
                  </span>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="min-h-12 w-full rounded-xl border border-white/10 bg-surface-container px-3.5 text-on-surface outline-none focus:border-primary-container/50"
                  >
                    {SUPPORTED_CITIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">
                    Preferované športy
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_SPORTS.map((sport) => {
                      const active = preferredSports.includes(sport);
                      return (
                        <button
                          key={sport}
                          type="button"
                          onClick={() => toggleSport(sport)}
                          className={`min-h-10 rounded-full border px-3.5 font-label-caps text-[10px] uppercase transition-colors active:scale-95 ${
                            active
                              ? 'border-primary-container/40 bg-primary-container/20 text-primary-container'
                              : 'border-white/10 bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {sportDisplayLabel(sport)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {preferredSports.length > 0 ? (
                  <div className="space-y-3">
                    <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">
                      Úroveň športov
                    </span>
                    {preferredSports.map((sport) => {
                      const level = (sportSkills[sport as keyof SportSkillsMap] ?? 2) as SportSkillLevel;
                      return (
                        <div
                          key={sport}
                          className="space-y-2 rounded-2xl border border-white/8 bg-surface-container/80 p-3.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-body-md text-sm text-on-surface">
                              {sportDisplayLabel(sport)}
                            </span>
                            <span className="font-label-caps text-[9px] uppercase text-primary-container">
                              {sportSkillLabel(level)}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            {([1, 2, 3, 4] as const).map((step) => (
                              <button
                                key={step}
                                type="button"
                                onClick={() => setSkill(sport, step)}
                                className={`min-h-11 rounded-xl font-label-caps text-[10px] uppercase transition-transform active:scale-95 ${
                                  level === step
                                    ? 'bg-primary-container text-white'
                                    : 'bg-black/25 text-on-surface-variant'
                                }`}
                              >
                                {step}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {error ? <p className="text-sm text-primary">{error}</p> : null}
              </div>

              <div className="shrink-0 border-t border-white/5 px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom,0px))] sm:px-5">
                <button
                  type="submit"
                  disabled={submitting || uploading !== null}
                  className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary-container font-label-caps text-[12px] uppercase tracking-[0.14em] text-white transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? 'Ukladám…' : 'Uložiť zmeny'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
