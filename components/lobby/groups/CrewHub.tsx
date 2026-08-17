'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { GroupDetailData } from '@/lib/data/sport-groups-shared';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { PlanActivityForm } from '@/components/lobby/groups/PlanActivityForm';
import { CrewSessionMiniCard } from '@/components/lobby/groups/CrewSessionMiniCard';
import { CrewLockerRoom } from '@/components/lobby/groups/CrewLockerRoom';
import { DeleteCrewButton } from '@/components/lobby/groups/DeleteCrewButton';

const CREW_HERO_BY_SPORT: Record<string, string> = {
  FOOTBALL:
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80',
  PADEL: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80',
  TENNIS: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80',
  BASKETBALL:
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80',
  DEFAULT: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80',
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

interface CrewHubModalProps {
  group: GroupDetailData;
  viewerId: string;
  viewerName: string;
  viewerAvatarUrl: string | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Compact Friday Footballers modal — session chips with RSVP + avatars.
 */
export function CrewHubModal({
  group,
  viewerId,
  viewerName,
  viewerAvatarUrl,
  open,
  onClose,
}: CrewHubModalProps) {
  const titleId = useId();
  const [planOpen, setPlanOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const sportKey = group.sport.toUpperCase();
  const heroUrl = CREW_HERO_BY_SPORT[sportKey] ?? CREW_HERO_BY_SPORT.DEFAULT;

  const now = Date.now();
  const upcomingSessions = group.activities
    .filter((a) => a.isPinned || asDate(a.scheduledAt).getTime() >= now)
    .sort((a, b) => asDate(a.scheduledAt).getTime() - asDate(b.scheduledAt).getTime())
    .slice(0, 8);

  const activeSchedule =
    group.recurringSchedules.find((s) => s.isActive) ?? group.recurringSchedules[0];
  const capacity = Math.max(
    14,
    group.members.length + 2,
    ...upcomingSessions.map((s) => s.goingCount),
  );
  const heroPlace =
    upcomingSessions[0]?.destinationName ??
    upcomingSessions[0]?.venueName ??
    upcomingSessions[0]?.locationNote ??
    activeSchedule?.locationNote ??
    'Home venue';

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/lobby/groups/join/${group.inviteCode}`
      : `/lobby/groups/join/${group.inviteCode}`;

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      setSettingsOpen(false);
      setPlanOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (settingsOpen) setSettingsOpen(false);
      else if (!planOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, settingsOpen, planOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      const t = e.target as Node | null;
      if (settingsRef.current && t && !settingsRef.current.contains(t)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [settingsOpen]);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      /* ignore */
    }
    setSettingsOpen(false);
  }

  if (typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              className="fixed inset-0 z-[120] flex items-stretch justify-center overscroll-none sm:items-center sm:p-6"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.button
                type="button"
                aria-label="Close crew"
                className="absolute inset-0 bg-black/80 backdrop-blur-md sm:bg-black/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
              />

              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-[121] flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-0 bg-[#121212] sm:h-[min(88vh,720px)] sm:max-w-md sm:rounded-2xl sm:border sm:border-[#FF5722]/20 sm:shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-0.5 w-full shrink-0 bg-[#FF5722]" aria-hidden />

                <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/5 hover:text-white"
                    aria-label="Back"
                  >
                    <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                  </button>
                  <h2
                    id={titleId}
                    className="min-w-0 flex-1 truncate text-center text-[15px] font-bold text-[#FF7F50]"
                  >
                    {group.name}
                  </h2>
                  <div ref={settingsRef} className="relative">
                    <button
                      type="button"
                      aria-label="Settings"
                      aria-expanded={settingsOpen}
                      onClick={() => setSettingsOpen((v) => !v)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                        settingsOpen
                          ? 'bg-[#FF5722]/15 text-[#FF7F50]'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">settings</span>
                    </button>
                    {settingsOpen ? (
                      <div
                        role="menu"
                        className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#1F1F1F] shadow-2xl"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setSettingsOpen(false);
                            setPlanOpen(true);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white hover:bg-[#FF5722]/10"
                        >
                          <span className="material-symbols-outlined text-[18px] text-[#FF7F50]">
                            event
                          </span>
                          Propose session
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void copyInvite()}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white hover:bg-[#FF5722]/10"
                        >
                          <span className="material-symbols-outlined text-[18px] text-[#FF7F50]">
                            link
                          </span>
                          Copy invite
                        </button>
                        <Link
                          href="/events"
                          role="menuitem"
                          onClick={onClose}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-[#FF5722]/10"
                        >
                          <span className="material-symbols-outlined text-[18px] text-[#FF7F50]">
                            push_pin
                          </span>
                          Pin event
                        </Link>
                        {group.isOwner ? (
                          <div className="border-t border-white/5 p-2">
                            <DeleteCrewButton
                              groupId={group.id}
                              groupName={group.name}
                              variant="danger"
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2">
                  {/* Compact hero */}
                  <section className="relative h-[72px] shrink-0 overflow-hidden rounded-2xl sm:h-[80px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2">
                      <p className="min-w-0 truncate text-[11px] font-medium text-gray-200">
                        {heroPlace}
                      </p>
                      <span className="shrink-0 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-semibold text-gray-200 ring-1 ring-white/10">
                        Private Crew
                      </span>
                    </div>
                  </section>

                  {/* Sessions — tiny chips in a horizontal row; anyone can + add */}
                  <div className="shrink-0">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
                        Sessions
                      </h3>
                      <span className="text-[9px] text-gray-600">Swipe · tap In/Out/Maybe</span>
                    </div>

                    <div className="hide-scrollbar -mx-0.5 flex gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 pb-0.5">
                      {upcomingSessions.map((activity) => (
                        <CrewSessionMiniCard
                          key={activity.id}
                          groupId={group.id}
                          activity={activity}
                          members={group.members}
                          viewerId={viewerId}
                          capacity={capacity}
                        />
                      ))}

                      <button
                        type="button"
                        onClick={() => setPlanOpen(true)}
                        className="flex aspect-square w-[132px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#FF5722]/35 bg-[#FF5722]/5 px-2 text-[#FF7F50] transition hover:border-[#FF5722]/55 hover:bg-[#FF5722]/10 active:scale-[0.98]"
                        aria-label="Create new session"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5722]/15">
                          <span className="material-symbols-outlined text-[20px]">add</span>
                        </span>
                        <span className="text-center text-[9px] font-bold leading-tight">
                          New
                          <br />
                          session
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Locker Room — inline private chat */}
                  <CrewLockerRoom
                    groupId={group.id}
                    viewerName={viewerName}
                    viewerAvatarUrl={viewerAvatarUrl}
                    compact
                  />
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}

      <PlanActivityForm
        groupId={group.id}
        defaultSport={group.sport}
        hideTrigger
        open={planOpen}
        onOpenChange={setPlanOpen}
      />
    </>
  );
}

export const CrewHub = CrewHubModal;
