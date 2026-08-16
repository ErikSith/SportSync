'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { GroupDetailData, GroupMemberData } from '@/lib/data/sport-groups-shared';
import {
  GROUP_SPORT_ICONS,
  sportDisplayLabel,
} from '@/lib/data/sport-groups-shared';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { PlanActivityForm } from '@/components/lobby/groups/PlanActivityForm';
import { CrewAvatarStack } from '@/components/lobby/groups/CrewAvatarStack';
import { CrewSessionMiniCard } from '@/components/lobby/groups/CrewSessionMiniCard';
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

function formatBadge(sport: string, memberCount: number): string {
  const label = sportDisplayLabel(sport).toUpperCase();
  if (sport.toUpperCase() === 'FOOTBALL' || sport.toUpperCase() === 'FUTSAL') {
    return `${label} ${memberCount >= 14 ? '7V7' : '5V5'}`;
  }
  return label;
}

function chatPreview(members: GroupMemberData[]) {
  const a = members.find((m) => m.isOwner) ?? members[0];
  const b = members.find((m) => m.id !== a?.id) ?? members[1] ?? a;
  return [
    {
      id: '1',
      author: a?.name ?? 'Captain',
      avatarUrl: a?.avatarUrl ?? null,
      time: '10:42 AM',
      body: 'We need 2 more for tomorrow. Anyone bringing a +1?',
    },
    {
      id: '2',
      author: b?.name ?? 'Teammate',
      avatarUrl: b?.avatarUrl ?? null,
      time: '11:15 AM',
      body: "I can ask if someone's free.",
    },
  ] as const;
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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const settingsRef = useRef<HTMLDivElement>(null);

  const sportKey = group.sport.toUpperCase();
  const sportIcon = GROUP_SPORT_ICONS[sportKey] ?? 'sports_soccer';
  const heroUrl = CREW_HERO_BY_SPORT[sportKey] ?? CREW_HERO_BY_SPORT.DEFAULT;
  const sportBadge = formatBadge(group.sport, group.members.length);
  const messages = chatPreview(group.members);

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
      setChatOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (chatOpen) setChatOpen(false);
      else if (settingsOpen) setSettingsOpen(false);
      else if (!planOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, settingsOpen, planOpen, chatOpen]);

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
                    <div className="absolute left-2.5 top-2 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white ring-1 ring-white/10">
                      <span className="material-symbols-outlined text-[12px] text-[#FF7F50]" aria-hidden>
                        {sportIcon}
                      </span>
                      {sportBadge}
                    </div>
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
                        className="flex w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#FF5722]/35 bg-[#FF5722]/5 px-2 py-2 text-[#FF7F50] transition hover:border-[#FF5722]/55 hover:bg-[#FF5722]/10 active:scale-[0.98]"
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

                  {/* Locker Room */}
                  <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/[0.05] bg-[#1F1F1F] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-[13px] font-bold text-white">Locker Room Talk</h3>
                      <button
                        type="button"
                        onClick={() => setChatOpen(true)}
                        className="text-[10px] font-bold uppercase tracking-wide text-[#FF7F50]"
                      >
                        Open Chat →
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {messages.slice(0, 1).map((msg) => (
                        <li key={msg.id} className="flex gap-2">
                          <CrewAvatarStack
                            people={[
                              { id: msg.id, name: msg.author, avatarUrl: msg.avatarUrl },
                            ]}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="truncate text-[11px] font-bold text-white">{msg.author}</p>
                              <span className="shrink-0 text-[9px] text-gray-500">{msg.time}</span>
                            </div>
                            <p className="line-clamp-2 text-[12px] leading-snug text-gray-300">
                              {msg.body}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <AnimatePresence>
                  {chatOpen ? (
                    <motion.div
                      className="absolute inset-0 z-[30] flex flex-col bg-[#121212]"
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    >
                      <div className="flex items-center justify-between border-b border-white/5 px-3 py-3">
                        <h3 className="text-sm font-bold text-white">Locker Room Talk</h3>
                        <button
                          type="button"
                          onClick={() => setChatOpen(false)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-white/5 hover:text-white"
                          aria-label="Close chat"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
                        {messages.map((msg) => (
                          <div key={msg.id} className="flex gap-2.5">
                            <CrewAvatarStack
                              people={[
                                { id: msg.id, name: msg.author, avatarUrl: msg.avatarUrl },
                              ]}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-[#1F1F1F] px-3 py-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-[12px] font-bold text-white">{msg.author}</p>
                                <span className="text-[10px] text-gray-500">{msg.time}</span>
                              </div>
                              <p className="mt-0.5 text-[13px] text-gray-300">{msg.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="shrink-0 border-t border-white/5 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
                        <div className="flex gap-2">
                          <CrewAvatarStack
                            people={[
                              {
                                id: 'me',
                                name: viewerName,
                                avatarUrl: viewerAvatarUrl,
                              },
                            ]}
                            size="sm"
                          />
                          <input
                            value={chatDraft}
                            onChange={(e) => setChatDraft(e.target.value)}
                            placeholder="Message the crew…"
                            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#1F1F1F] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-[#FF5722]/40 focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={!chatDraft.trim()}
                            onClick={() => setChatDraft('')}
                            className="rounded-xl bg-[#FF5722] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
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
