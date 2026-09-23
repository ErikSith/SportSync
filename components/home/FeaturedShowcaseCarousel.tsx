'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import type { PromotedBannerItem } from '@/lib/data/promoted-types';
import { getPromotedBannerPreviews } from '@/lib/data/promoted-previews';
import { sportIcon } from '@/lib/utils/sport-icons';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';
import { TournamentPreviewModal } from '@/components/tournaments/TournamentPreviewModal';
import { ListingCover } from '@/components/shared/ListingCover';
import { useT } from '@/components/i18n/LocaleProvider';

const AUTOPLAY_MS = 4800;
const GAP_PX = 14;
/** Home / Apex coral — not per-sport rainbow. */
const CORAL = '#FF5722';

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
  return `${date.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' })} · ${time}`;
}

function countdownLabel(startsAt: Date): string | null {
  const ms = startsAt.getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 48) {
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    if (hours < 1) return `${mins} min`;
    return `${hours}h ${mins}m`;
  }
  const days = Math.ceil(ms / 86_400_000);
  return `${days} d`;
}

function useVisibleCount(): number {
  const [visible, setVisible] = useState(3);

  useEffect(() => {
    const update = () => {
      if (window.matchMedia('(min-width: 720px)').matches) setVisible(3);
      else if (window.matchMedia('(min-width: 480px)').matches) setVisible(2);
      else setVisible(1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return visible;
}

function ShowcaseCard({
  item,
  onOpen,
  compact,
  lead,
}: {
  item: PromotedBannerItem;
  onOpen: () => void;
  compact?: boolean;
  lead?: boolean;
}) {
  const t = useT();
  const venue = item.venueName
    ? item.city
      ? `${item.venueName} · ${item.city}`
      : item.venueName
    : item.city || 'Venue TBA';
  const cta =
    item.kind === 'tournament' ? t('home.showcase.register') : t('home.showcase.detail');
  const badge =
    item.kind === 'tournament'
      ? t('home.showcase.premiumTournament')
      : t('home.showcase.featured');
  const countdown = countdownLabel(item.startsAt);

  return (
    <article
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-[22px] ${
        compact ? 'min-h-[280px] sm:min-h-[300px]' : 'min-h-[300px] sm:min-h-[328px]'
      }`}
      style={{
        border: lead ? '1px solid rgba(255,87,34,0.55)' : '1px solid rgba(255,87,34,0.18)',
        boxShadow: lead
          ? '0 16px 40px rgba(0,0,0,0.45), 0 0 28px rgba(255,87,34,0.22)'
          : '0 12px 28px rgba(0,0,0,0.35)',
      }}
    >
      <ListingCover
        src={item.coverUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#121212]/88 to-[#121212]/35" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 8% 0%, rgba(255,87,34,0.28), transparent 58%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full bg-[#FF5722] px-2 py-0.5 font-label-caps text-[9px] uppercase tracking-[0.14em] text-white">
            {badge}
          </span>
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#FF5722]/25 bg-black/45 backdrop-blur-md">
            <span
              className="material-symbols-outlined text-[14px] leading-none text-[#FF5722]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
              aria-hidden
            >
              {sportIcon(item.sport, item.title)}
            </span>
          </span>
        </div>
        {item.isPreview ? (
          <span className="mt-1.5 w-fit rounded-full border border-white/12 bg-black/40 px-1.5 py-0.5 font-label-caps text-[8px] uppercase tracking-[0.14em] text-white/70">
            {t('home.showcase.preview')}
          </span>
        ) : null}

        <div className="mt-auto space-y-3 pt-8">
          <h3 className="line-clamp-2 font-headline-md text-[16px] leading-snug text-white sm:text-[18px]">
            {item.title}
          </h3>

          <div className="rounded-xl border border-white/[0.08] bg-black/30 px-2.5 py-2 font-body-md text-[11px] text-white/85 backdrop-blur-sm">
            <span className="flex min-w-0 items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-[#FF5722]" strokeWidth={2.25} />
              <span className="truncate">{formatWhen(item.startsAt)}</span>
              {countdown ? (
                <span className="ml-auto shrink-0 rounded-md bg-[#FF5722]/20 px-1.5 py-0.5 font-label-caps text-[9px] uppercase tracking-wide text-[#FF5722]">
                  {countdown}
                </span>
              ) : null}
            </span>
            <span className="mt-1 flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#FF5722]" strokeWidth={2.25} />
              <span className="truncate">{venue}</span>
            </span>
          </div>

          <motion.button
            type="button"
            onClick={onOpen}
            className="flex w-full items-center justify-center rounded-xl bg-[#FF5722] px-4 py-2.5 font-label-caps text-[11px] uppercase tracking-[0.14em] text-white active:scale-[0.98]"
            whileTap={{ scale: 0.98 }}
          >
            {cta}
          </motion.button>
        </div>
      </div>
    </article>
  );
}

function buildLoopSlides(items: PromotedBannerItem[]): PromotedBannerItem[] {
  if (items.length === 0) return [];
  return [...items, ...items.map((item) => ({ ...item, id: `${item.id}::loop` }))];
}

export function FeaturedShowcaseCarousel({ items }: { items: PromotedBannerItem[] }) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  const visibleIdeal = useVisibleCount();
  const paid = items.filter((i) => !i.isPreview);
  const previewMode = paid.length === 0;
  const slides = previewMode ? getPromotedBannerPreviews() : paid;
  const count = slides.length;
  const visible = Math.min(visibleIdeal, Math.max(1, count));
  const loopSlides = buildLoopSlides(slides);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [preview, setPreview] = useState<PromotedBannerItem | null>(null);
  const [animating, setAnimating] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const wrapTimer = useRef<number | null>(null);

  const goNext = useCallback(() => {
    if (count <= 1) return;
    setAnimating(true);
    setIndex((i) => i + 1);
  }, [count]);

  useEffect(() => {
    if (count <= 1) return;
    if (index < count) return;
    if (wrapTimer.current != null) window.clearTimeout(wrapTimer.current);
    wrapTimer.current = window.setTimeout(() => {
      setAnimating(false);
      setIndex(0);
    }, reduceMotion ? 0 : 420);
    return () => {
      if (wrapTimer.current != null) window.clearTimeout(wrapTimer.current);
    };
  }, [index, count, reduceMotion]);

  useEffect(() => {
    if (!animating) {
      const id = window.requestAnimationFrame(() => setAnimating(true));
      return () => window.cancelAnimationFrame(id);
    }
  }, [animating]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = window.setInterval(goNext, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [count, paused, goNext]);

  if (count === 0) return null;

  const slideWidth = `calc((100% - ${(visible - 1) * GAP_PX}px) / ${visible})`;
  const x = `calc(-${index} * (100% + ${GAP_PX}px) / ${visible})`;
  const active = index % count;

  return (
    <section
      aria-label={t('home.showcase.title')}
      className="overflow-hidden rounded-[28px] border border-white/[0.07] bg-surface-container-low"
    >
      <div className="flex items-end justify-between gap-3 px-4 pb-1 pt-4 sm:px-5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-headline-md text-[15px] text-on-surface md:text-[18px]">
            <span
              className="material-symbols-outlined text-[#FF5722]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              workspace_premium
            </span>
            {previewMode ? t('home.showcase.titlePreview') : t('home.showcase.title')}
          </h3>
          <p className="mt-0.5 font-body-md text-sm text-on-surface-variant">
            {previewMode ? t('home.showcase.subPreview') : t('home.showcase.sub')}
          </p>
        </div>
        {count > 1 ? (
          <div
            className="flex shrink-0 items-center gap-1.5"
            role="tablist"
            aria-label={t('home.showcase.tabs')}
          >
            {slides.map((item, i) => {
              const selected = i === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={item.title}
                  onClick={() => {
                    setAnimating(true);
                    setIndex(i);
                  }}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: selected ? 22 : 8,
                    backgroundColor: selected ? CORAL : 'rgba(255,255,255,0.22)',
                  }}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        className="relative overflow-hidden touch-pan-y px-4 pb-4 pt-3 sm:px-5"
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
          if (start == null || end == null || count <= 1) return;
          const dx = end - start;
          if (Math.abs(dx) < 40) return;
          if (dx < 0) goNext();
          else {
            setAnimating(true);
            setIndex((i) => (i <= 0 ? 0 : i - 1));
          }
        }}
      >
        <motion.div
          className="flex w-full"
          style={{ gap: GAP_PX }}
          animate={{ x }}
          transition={
            animating && !reduceMotion
              ? { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0 }
          }
        >
          {loopSlides.map((item) => {
            const baseId = item.id.replace(/::loop$/, '');
            const source = slides.find((s) => s.id === baseId) ?? item;
            const lead = source.id === slides[active]?.id;
            return (
              <div
                key={item.id}
                className="shrink-0"
                style={{ width: slideWidth, minWidth: slideWidth }}
              >
                <ShowcaseCard
                  item={source}
                  compact={visible > 1}
                  lead={lead}
                  onOpen={() => setPreview(source)}
                />
              </div>
            );
          })}
        </motion.div>
      </div>

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
    </section>
  );
}
