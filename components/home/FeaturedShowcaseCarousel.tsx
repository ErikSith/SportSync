'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { PromotedBannerItem } from '@/lib/data/promoted-types';
import { getPromotedBannerPreviews } from '@/lib/data/promoted-previews';
import { sportIcon } from '@/lib/utils/sport-icons';
import { EventPreviewModal } from '@/components/events/EventPreviewModal';
import { TournamentPreviewModal } from '@/components/tournaments/TournamentPreviewModal';
import { ListingCover } from '@/components/shared/ListingCover';
import { useT } from '@/components/i18n/LocaleProvider';

const AUTOPLAY_MS = 4800;
const GAP_PX = 12;
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
  return `${date.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}, ${time}`;
}

function metaLine(item: PromotedBannerItem): string {
  const when = formatWhen(item.startsAt);
  const place = [item.venueName, item.city].filter(Boolean).join(', ');
  return place ? `${when}, ${place}` : when;
}

/** Integer slots; mobile uses a peek gutter instead of a fraction. */
function useVisibleCount(): number {
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    const update = () => {
      if (window.matchMedia('(min-width: 900px)').matches) setVisible(3);
      else if (window.matchMedia('(min-width: 640px)').matches) setVisible(2);
      else setVisible(1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return visible;
}

/**
 * Poster-style premium card — full-bleed plane, soft badge, title + meta at bottom.
 * Inspired by ticket / “odporúčania” hero cards.
 */
function ShowcaseCard({
  item,
  onOpen,
}: {
  item: PromotedBannerItem;
  onOpen: () => void;
}) {
  const t = useT();
  const badge =
    item.kind === 'tournament'
      ? t('home.showcase.premiumTournament')
      : t('home.showcase.featured');
  const cta =
    item.kind === 'tournament' ? t('home.showcase.register') : t('home.showcase.detail');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex h-full min-h-[320px] w-full flex-col overflow-hidden rounded-[28px] text-left outline-none transition-[transform,box-shadow] active:scale-[0.985] sm:min-h-[340px] focus-visible:ring-2 focus-visible:ring-[#FF5722]/70"
      style={{
        boxShadow: '0 18px 42px rgba(0,0,0,0.45)',
      }}
    >
      <ListingCover
        src={item.coverUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      {/* Atmosphere when no photo — soft coral wash on brand gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 70% 15%, rgba(255,87,34,0.35), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(255,87,34,0.12), transparent 50%)',
        }}
        aria-hidden
      />
      {/* Bottom-heavy read like ticket posters */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(8,8,8,0.96) 0%, rgba(8,8,8,0.72) 28%, rgba(8,8,8,0.2) 58%, transparent 78%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/55 bg-black/35 px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-[0.12em] text-white backdrop-blur-md">
            <span
              className="material-symbols-outlined text-[13px] leading-none text-[#FF5722]"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden
            >
              {sportIcon(item.sport, item.title)}
            </span>
            {badge}
          </span>
          {item.isPreview ? (
            <span className="rounded-full border border-white/25 bg-black/40 px-2 py-1 font-label-caps text-[8px] uppercase tracking-[0.14em] text-white/75 backdrop-blur-md">
              {t('home.showcase.preview')}
            </span>
          ) : null}
        </div>

        <div className="mt-auto space-y-3 pt-16">
          <h3 className="line-clamp-2 font-headline-md text-[22px] leading-[1.15] tracking-tight text-white sm:text-[26px]">
            {item.title}
          </h3>
          <p className="line-clamp-2 font-body-md text-[13px] leading-snug text-white/80 sm:text-[14px]">
            {metaLine(item)}
          </p>
          <span className="inline-flex items-center gap-1.5 font-label-caps text-[11px] uppercase tracking-[0.16em] text-[#FF5722]">
            {cta}
            <span
              className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5"
              aria-hidden
            >
              arrow_forward
            </span>
          </span>
        </div>
      </div>
    </button>
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

  const peek = visible === 1 && count > 1;
  const peekGutter = 22;
  const slideWidth = peek
    ? `calc(100% - ${peekGutter}px)`
    : `calc((100% - ${(visible - 1) * GAP_PX}px) / ${visible})`;
  const x = peek
    ? `calc(-${index} * (100% - ${peekGutter}px + ${GAP_PX}px))`
    : `calc(-${index} * (100% + ${GAP_PX}px) / ${visible})`;
  const active = index % count;

  return (
    <section aria-label={t('home.showcase.title')} className="space-y-3">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div className="min-w-0">
          <h3 className="font-headline-md text-[18px] text-on-surface md:text-[22px]">
            {previewMode ? t('home.showcase.titlePreview') : t('home.showcase.title')}
          </h3>
          <p className="mt-0.5 font-body-md text-sm text-on-surface-variant">
            {previewMode ? t('home.showcase.subPreview') : t('home.showcase.sub')}
          </p>
        </div>
        {count > 1 ? (
          <div
            className="flex shrink-0 items-center gap-1.5 pb-1"
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
                    width: selected ? 20 : 7,
                    backgroundColor: selected ? CORAL : 'rgba(255,255,255,0.22)',
                  }}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        className="relative overflow-hidden touch-pan-y"
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
            return (
              <div
                key={item.id}
                className="shrink-0"
                style={{ width: slideWidth, minWidth: slideWidth }}
              >
                <ShowcaseCard item={source} onOpen={() => setPreview(source)} />
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
