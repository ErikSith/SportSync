'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { VenueEventBookingLinks } from '@/components/shared/VenueEventBookingLinks';
import { LobbyActions } from '@/components/lobby/LobbyActions';
import { SportLinearIcon } from '@/components/lobby/SportLinearIcon';
import {
  sportIconAccent,
  sportIconLabel,
  sportToIconKind,
} from '@/components/lobby/lobby-ui';
import {
  previewStatusBadge,
  type LobbyPreviewData,
} from '@/components/lobby/lobby-preview';
import { sportDisplayLabel } from '@/lib/constants/sports';
import { sportColor } from '@/lib/utils/sport-icons';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface LobbyPreviewModalProps {
  lobby: LobbyPreviewData;
  open: boolean;
  onClose: () => void;
}

function RosterSlot({
  name,
  image,
  isHost,
}: {
  name?: string;
  image?: string | null;
  isHost?: boolean;
}) {
  if (!name) {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center border border-dashed border-white/25 text-zinc-600"
        aria-hidden
      >
        <span className="material-symbols-outlined text-[18px]">person_add</span>
      </div>
    );
  }
  return (
    <div className="relative shrink-0" title={name}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name}
          className={`h-12 w-12 object-cover ${
            isHost ? 'ring-1 ring-secondary' : 'ring-1 ring-[#FF5722]/50'
          }`}
        />
      ) : (
        <div
          className={`flex h-12 w-12 items-center justify-center bg-[#1a1816] text-[11px] font-semibold text-zinc-200 ${
            isHost ? 'ring-1 ring-secondary' : 'ring-1 ring-[#FF5722]/50'
          }`}
        >
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      {isHost ? (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-secondary px-1 font-label-caps text-[7px] uppercase tracking-wide text-on-secondary">
          Host
        </span>
      ) : null}
    </div>
  );
}

export function LobbyPreviewModal({ lobby, open, onClose }: LobbyPreviewModalProps) {
  const titleId = useId();
  const [preview, setPreview] = useState(lobby);

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) setPreview(lobby);
  }, [open, lobby]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  const badge = previewStatusBadge(preview.status, preview.spotsFilled, preview.spotsTotal);
  const almostFull =
    preview.spotsFilled / Math.max(1, preview.spotsTotal) >= 0.75 && badge.label !== 'Full';
  const venueLine =
    preview.venueName && preview.city && preview.city !== preview.venueName
      ? `${preview.venueName} · ${preview.city}`
      : preview.venueName || preview.city;
  const slotCount = Math.min(Math.max(preview.spotsTotal, 2), 6);
  const heroSlots = Array.from({ length: slotCount }, (_, i) => preview.roster[i] ?? null);
  const openSlots = Math.max(0, preview.spotsTotal - preview.spotsFilled);
  const sportKind = sportToIconKind(preview.sport, preview.title);
  const sportTint = sportColor(preview.sport, preview.title);
  const sportName = sportDisplayLabel(preview.sport) || sportIconLabel(sportKind);
  const sportAccent = sportIconAccent(sportKind);

  return createPortal(
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
            aria-label="Zavrieť preview"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm sm:bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-[121] flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-0 bg-[#0f0e0c] sm:h-[min(88vh,680px)] sm:max-w-md sm:border sm:border-white/10 sm:shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-px w-full shrink-0 bg-[#FF5722]" aria-hidden />

            <header className="relative shrink-0 overflow-hidden border-b border-white/10 px-4 pb-5 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
              {/* Soft sport watermark — same linear glyphs as Lobby feed */}
              <div
                className="pointer-events-none absolute -right-6 top-10 select-none opacity-[0.11] sm:-right-4 sm:top-8 sm:opacity-[0.13]"
                aria-hidden
              >
                <SportLinearIcon
                  kind={sportKind}
                  accent={sportAccent}
                  color={sportTint}
                  strokeWidth={1.35}
                  className="h-40 w-40 rotate-[-12deg] opacity-100 blur-[0.3px] sm:h-44 sm:w-44"
                />
              </div>
              <div
                className="pointer-events-none absolute -left-8 bottom-2 select-none opacity-[0.05]"
                aria-hidden
              >
                <SportLinearIcon
                  kind={sportKind}
                  accent={sportAccent}
                  color={sportTint}
                  strokeWidth={1.2}
                  className="h-28 w-28 rotate-[18deg] opacity-100"
                />
              </div>

              <div className="relative z-[1] flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-label-caps text-[10px] uppercase tracking-[0.2em] text-[#FF5722]">
                    Lobby
                  </span>
                  <span className="h-3 w-px bg-white/15" aria-hidden />
                  <span
                    className={`font-label-caps text-[10px] uppercase tracking-[0.16em] ${
                      badge.live ? 'text-secondary' : 'text-zinc-500'
                    }`}
                  >
                    {badge.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center border border-white/15 text-zinc-400 transition-colors hover:border-white/30 hover:text-white"
                  aria-label="Zavrieť"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <div className="relative z-[1] mt-6 flex items-center justify-center gap-2">
                {heroSlots.map((player, i) => (
                  <RosterSlot
                    key={player?.id ?? `open-${i}`}
                    name={player?.name}
                    image={player?.image}
                    isHost={i === 0 && Boolean(player)}
                  />
                ))}
              </div>

              <div className="relative z-[1] mt-5 space-y-1.5 text-center">
                <p className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 font-label-caps text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  <span
                    className="inline-flex items-center gap-1.5"
                    title={sportName}
                  >
                    <SportLinearIcon
                      kind={sportKind}
                      accent={sportAccent}
                      color={sportTint}
                      strokeWidth={2.1}
                      className="h-[15px] w-[15px] shrink-0 opacity-100"
                    />
                    <span className="text-zinc-400">{sportName}</span>
                  </span>
                  {openSlots > 0 ? (
                    <>
                      <span className="text-white/20" aria-hidden>
                        |
                      </span>
                      <span className="text-[#FF5722]">{openSlots} open</span>
                    </>
                  ) : null}
                </p>
                <h2
                  id={titleId}
                  className="line-clamp-2 font-headline-md text-[22px] leading-snug text-white"
                >
                  {preview.title}
                </h2>
                <p className="truncate text-sm text-zinc-500">
                  {preview.typeLabel}
                  {preview.hostName ? (
                    <>
                      <span className="text-white/20"> · </span>
                      Host {preview.hostName}
                    </>
                  ) : null}
                </p>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
              <dl className="divide-y divide-white/10 border-b border-white/10">
                <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <dt className="shrink-0 font-label-caps text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                    Dátum
                  </dt>
                  <dd className="truncate text-right text-sm text-zinc-200">{preview.dateLabel}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <dt className="shrink-0 font-label-caps text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                    Kickoff
                  </dt>
                  <dd className="truncate text-right text-sm text-zinc-200">{preview.timeLabel}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <dt className="shrink-0 font-label-caps text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                    Miesto
                  </dt>
                  <dd className="truncate text-right text-sm text-zinc-200">{venueLine}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <dt className="shrink-0 font-label-caps text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                    Squad
                  </dt>
                  <dd className="text-right text-sm text-zinc-200">
                    <span className={almostFull ? 'text-error' : undefined}>
                      {preview.spotsFilled}/{preview.spotsTotal}
                    </span>
                    <span className="text-white/20"> · </span>
                    <span className="text-[#FF5722]">{preview.skillLabel}</span>
                  </dd>
                </div>
              </dl>

              <div className="flex items-center gap-px px-4 py-3" aria-hidden>
                {Array.from({ length: Math.max(preview.spotsTotal, 1) }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-px flex-1 ${
                      i < preview.spotsFilled
                        ? almostFull
                          ? 'bg-error'
                          : 'bg-[#FF5722]'
                        : 'bg-white/15'
                    }`}
                  />
                ))}
              </div>

              <div className="space-y-2.5 border-t border-white/10 px-4 py-3">
                <p className="font-label-caps text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  {preview.formatLabel || 'Open match'}
                  {preview.mercenaryMode ? (
                    <>
                      <span className="text-white/15"> · </span>
                      Merc +1
                    </>
                  ) : null}
                </p>
                {preview.venueId || preview.websiteUrl ? (
                  <VenueEventBookingLinks
                    venueId={preview.venueId}
                    venueName={preview.venueName}
                    websiteUrl={preview.websiteUrl}
                    quiet
                  />
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
              <LobbyActions
                lobbyId={preview.id}
                isHost={preview.isHost}
                isJoined={preview.isJoined}
                mercenaryMode={preview.mercenaryMode}
                status={preview.status}
                spotsFilled={preview.spotsFilled}
                spotsTotal={preview.spotsTotal}
                venueId={preview.venueId}
                venueName={preview.venueName}
                websiteUrl={preview.websiteUrl}
                embedded
                onMembershipChange={(next) => {
                  setPreview((current) => ({
                    ...current,
                    isJoined: next.isJoined,
                    isHost: next.isHost ?? current.isHost,
                    spotsFilled: next.spotsFilled ?? current.spotsFilled,
                    status: next.status ?? current.status,
                  }));
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
