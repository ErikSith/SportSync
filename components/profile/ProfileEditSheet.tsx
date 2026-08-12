'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/lib/data/profile';
import { SUPPORTED_CITIES } from '@/lib/cities';
import { EVENT_SPORTS, sportDisplayLabel } from '@/lib/constants/sports';

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
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setFullName(profile.fullName ?? '');
    setBio(profile.bio ?? '');
    setUsername(profile.username);
    setCity(profile.city ?? SUPPORTED_CITIES[0]?.name ?? 'Bratislava');
    setPreferredSports(profile.preferredSports);
    setError(null);
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  function toggleSport(sport: string) {
    setPreferredSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : prev.length < 7 ? [...prev, sport] : prev,
    );
  }

  async function uploadImage(kind: 'avatar' | 'cover', file: File) {
    setUploading(kind);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`/api/profile/${kind}`, { method: 'POST', body: formData });
    const body = (await res.json().catch(() => null)) as { error?: string } | null;

    setUploading(null);
    if (!res.ok) {
      setError(body?.error ?? `Could not upload ${kind}`);
      return;
    }

    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const profileRes = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: fullName.trim() || null,
        bio: bio.trim() || null,
        username: username.trim(),
        preferredSports,
      }),
    });

    if (!profileRes.ok) {
      const body = (await profileRes.json().catch(() => null)) as { error?: string } | null;
      setSubmitting(false);
      setError(body?.error ?? 'Could not save profile');
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

  if (!open || !mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl p-6 md:p-8 w-full max-w-lg border border-secondary/10 space-y-5 max-h-[90vh] overflow-y-auto relative z-[101]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="edit-profile-title" className="font-headline-md text-headline-md text-on-surface">
            Edit profile
          </h3>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-secondary transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex gap-4">
          <label className="flex-1 cursor-pointer">
            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant block mb-2">Avatar</span>
            <span className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 hover:border-secondary/30 transition-colors text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-lg">photo_camera</span>
              {uploading === 'avatar' ? 'Uploading…' : 'Change'}
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
          <label className="flex-1 cursor-pointer">
            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant block mb-2">Cover</span>
            <span className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 hover:border-secondary/30 transition-colors text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-lg">wallpaper</span>
              {uploading === 'cover' ? 'Uploading…' : 'Change'}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Display name</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg bg-surface-container border border-white/10 px-3 py-2 text-on-surface"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              pattern="^[a-zA-Z0-9_]+$"
              className="w-full rounded-lg bg-surface-container border border-white/10 px-3 py-2 text-on-surface"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder="What are you training for?"
              className="w-full rounded-lg bg-surface-container border border-white/10 px-3 py-2 text-on-surface resize-none"
            />
            <span className="font-label-caps text-[10px] text-on-surface-variant">{bio.length}/160</span>
          </label>

          <label className="block space-y-1">
            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">City</span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg bg-surface-container border border-white/10 px-3 py-2 text-on-surface"
            >
              {SUPPORTED_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Preferred sports</span>
            <div className="flex flex-wrap gap-2">
              {EVENT_SPORTS.map((sport) => {
                const active = preferredSports.includes(sport);
                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => toggleSport(sport)}
                    className={`font-label-caps text-[10px] uppercase px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? 'bg-secondary/20 text-secondary border-secondary/40'
                        : 'bg-surface-container text-on-surface-variant border-white/10 hover:border-white/20'
                    }`}
                  >
                    {sportDisplayLabel(sport)}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-primary text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || uploading !== null}
            className="w-full font-label-caps text-label-caps uppercase px-4 py-2.5 rounded-lg bg-secondary text-on-secondary disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
