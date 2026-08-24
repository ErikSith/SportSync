'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, MapPin, Tag } from 'lucide-react';
import type { PromotedBannerItem } from '@/lib/data/promoted-types';
import { getPromotedBannerPreviews } from '@/lib/data/promoted-previews';
import { SportLabel } from '@/components/shared/SportLabel';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';
import { TournamentPreviewModal } from '@/components/tournaments/TournamentPreviewModal';
import { ListingCover } from '@/components/shared/ListingCover';

const AUTOPLAY_MS = 5000;

function formatWhen(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  if (isToday) return `Dnes · ${time}`;
  if (isTomorrow) return `Zajtra · ${time}`;
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${time}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(233, 195, 73, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function PromotedSalesCta() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-secondary/25 bg-[#14120e] sm:rounded-3xl">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 20% 0%, rgba(233,195,73,0.18), transparent 55%), radial-gradient(ellipse 60% 50% at 90% 100%, rgba(200,75,36,0.12), transparent 50%)',
        }}
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
        <div className="min-w-0 space-y-1.5">
          <p className="inline-flex items-center gap-1.5 font-label-caps text-[10px] uppercase tracking-[0.16em] text-[#e8d59a]">
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              workspace_premium
            </span>
            Premium slot
          </p>
          <h3 className="font-headline-md text-[18px] leading-snug text-on-background sm:text-[20px]">
            Chceš tu promovať svoj turnaj?
          </h3>
          <p className="font-body-md text-sm text-on-surface-variant">
            Vyššie vidíš návrh, ako to vyzerá — potom slot otvoríme pre platené kampane.
          </p>
        </div>
        <Link
          href="/manage/events/create?promote=1"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#c4a035] via-[#e8d59a] to-[#c4a035] px-6 py-3.5 font-label-caps text-[12px] uppercase tracking-[0.14em] text-[#14120e] shadow-[0_0_28px_rgba(196,160,53,0.35)] transition-transform active:scale-[0.98]"
        >
          Chcem zviditeľniť event ↗
        </Link>
      </div>
    </div>
  );
}

function PromotedBannerCard({
  item,
  onOpen,
}: {
  item: PromotedBannerItem;
  onOpen: () => void;
}) {
  const cover = item.coverUrl;
  const accent = item.accentColor;
  const venue = item.venueName
    ? item.city
      ? `${item.venueName} · ${item.city}`
      : item.venueName
    : item.city || 'Venue TBA';
  const ctaLabel = item.kind === 'tournament' ? 'Prihlásiť sa ↗' : 'Zistiť viac ↗';

  return (
    <article
      className="relative flex h-full min-h-[280px] w-full flex-col overflow-hidden rounded-2xl border sm:min-h-[300px] sm:rounded-3xl"
      style={{
        borderColor: hexToRgba(accent, 0.35),
        boxShadow: `0 0 0 1px ${hexToRgba(accent, 0.12)}, 0 18px 48px rgba(0,0,0,0.45), 0 0 40px ${hexToRgba(accent, 0.12)}`,
      }}
    >
      <ListingCover src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0b09] via-[#0c0b09]/75 to-black/35" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 15% 10%, ${hexToRgba(accent, 0.28)}, transparent 55%), radial-gradient(ellipse 50% 40% at 85% 90%, ${hexToRgba(accent, 0.16)}, transparent 50%)`,
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-[0.14em] text-[#14120e] shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${accent} 0%, #e8d59a 55%, ${accent} 100%)`,
              }}
            >
              <span
                className="material-symbols-outlined text-[13px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                crown
              </span>
              {item.badgeText}
            </span>
            {item.isPreview ? (
              <span className="rounded-full border border-white/20 bg-black/45 px-2 py-1 font-label-caps text-[9px] uppercase tracking-[0.14em] text-white/85 backdrop-blur-md">
                Návrh
              </span>
            ) : null}
          </div>
          <span className="inline-flex items-center rounded-full border border-white/15 bg-background/70 px-2 py-1 backdrop-blur-md">
            <SportLabel
              sport={item.sport}
              iconSize={13}
              labelClassName="font-label-caps text-[10px] uppercase tracking-wide text-white"
            />
          </span>
        </div>

        <div className="mt-auto space-y-3 pt-10">
          <h3 className="line-clamp-2 font-headline-md text-[22px] leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] sm:text-[26px]">
            {item.title}
          </h3>

          <div className="flex flex-col gap-1.5 font-body-md text-[13px] text-white/90 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} strokeWidth={2.25} />
              <span className="truncate">{formatWhen(item.startsAt)}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} strokeWidth={2.25} />
              <span className="truncate">{venue}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} strokeWidth={2.25} />
              <span>{item.priceLabel}</span>
            </span>
          </div>

          {(item.sponsorName || item.sponsorLogoUrl) && (
            <div className="flex items-center gap-2 border-t border-white/10 pt-2.5">
              {item.sponsorLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.sponsorLogoUrl}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-md border border-white/15 object-cover bg-background/60"
                />
              ) : (
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/15 bg-background/60"
                  style={{ color: accent }}
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    storefront
                  </span>
                </span>
              )}
              <p className="min-w-0 truncate font-label-caps text-[10px] uppercase tracking-[0.12em] text-white/75">
                Organizuje / Partner:{' '}
                <span className="text-white">{item.sponsorName ?? 'Partner'}</span>
              </p>
            </div>
          )}

          <motion.button
            type="button"
            onClick={onOpen}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-label-caps text-[12px] uppercase tracking-[0.14em] text-[#14120e] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, #e8d59a 50%, ${accent} 100%)`,
              boxShadow: `0 0 28px ${hexToRgba(accent, 0.4)}`,
            }}
            animate={{
              boxShadow: [
                `0 0 22px ${hexToRgba(accent, 0.28)}`,
                `0 0 34px ${hexToRgba(accent, 0.5)}`,
                `0 0 22px ${hexToRgba(accent, 0.28)}`,
              ],
            }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            {ctaLabel}
          </motion.button>
        </div>
      </div>
    </article>
  );
}

function PromotedCarousel({
  items,
  previewMode,
}: {
  items: PromotedBannerItem[];
  previewMode: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState<PromotedBannerItem | null>(null);
  const touchStartX = useRef<number | null>(null);
  const count = items.length;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (count <= 1) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = window.setInterval(() => go(1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [count, paused, go, index]);

  const slide = items[Math.min(index, Math.max(count - 1, 0))];
  if (!slide) return null;

  return (
    <>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-headline-md text-headline-md text-on-surface">
            <span
              className="material-symbols-outlined text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              workspace_premium
            </span>
            {previewMode ? 'Promoted — návrh' : 'Promoted'}
          </h3>
          <p className="mt-0.5 font-body-md text-sm text-on-surface-variant">
            {previewMode
              ? 'Ukážka prémiového banneru (ešte nie je spoplatnený)'
              : 'Sponzorované eventy a turnaje'}
          </p>
        </div>
        {count > 1 && (
          <span className="shrink-0 rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wider text-[#e8d59a]">
            {index + 1}/{count}
          </span>
        )}
      </div>

      <div
        className="relative touch-pan-y"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onTouchStart={(e) => {
          setPaused(true);
          touchStartX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          const end = e.changedTouches[0]?.clientX;
          touchStartX.current = null;
          setPaused(false);
          if (start == null || end == null) return;
          const dx = end - start;
          if (Math.abs(dx) < 40) return;
          go(dx < 0 ? 1 : -1);
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <PromotedBannerCard item={slide} onOpen={() => setPreview(slide)} />
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2" role="tablist" aria-label="Promoted slides">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 22 : 8,
                backgroundColor: i === index ? slide.accentColor : 'rgba(255,255,255,0.22)',
              }}
            />
          ))}
        </div>
      )}

      {preview?.event ? (
        <EventPreviewModal event={preview.event} open onClose={() => setPreview(null)} />
      ) : null}
      {preview?.tournament ? (
        <TournamentPreviewModal
          tournament={preview.tournament}
          open
          onClose={() => setPreview(null)}
        />
      ) : null}
    </>
  );
}

export function PromotedBannerSection({ items }: { items: PromotedBannerItem[] }) {
  const paid = items.filter((i) => !i.isPreview);
  const previewMode = paid.length === 0;
  const slides = previewMode ? getPromotedBannerPreviews() : paid;

  return (
    <section aria-label="Promoted events and tournaments" className="space-y-4">
      <PromotedCarousel items={slides} previewMode={previewMode} />
      {previewMode ? <PromotedSalesCta /> : null}
    </section>
  );
}
