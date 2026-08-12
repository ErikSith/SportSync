'use client';

import { useCallback, useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import type { LobbyStackCardData } from '@/types/lobby';
import { LobbyStackCard } from '@/components/lobby/LobbyStackCard';

interface LobbyCardStackProps {
  cards: LobbyStackCardData[];
}

const SWIPE_THRESHOLD = 80;

export function LobbyCardStack({ cards }: LobbyCardStackProps) {
  const [index, setIndex] = useState(0);

  const goNext = useCallback(() => {
    setIndex((i) => (cards.length === 0 ? 0 : (i + 1) % cards.length));
  }, [cards.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (cards.length === 0 ? 0 : (i - 1 + cards.length) % cards.length));
  }, [cards.length]);

  const onDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.y < -SWIPE_THRESHOLD || info.offset.x < -SWIPE_THRESHOLD) {
        goNext();
      } else if (info.offset.y > SWIPE_THRESHOLD || info.offset.x > SWIPE_THRESHOLD) {
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] px-6 py-16 text-center">
        <p className="text-sm text-gray-400">Žiadne otvorené lobby v okolí.</p>
      </div>
    );
  }

  const visible = [0, 1, 2]
    .map((offset) => {
      const i = (index + offset) % cards.length;
      return { card: cards[i]!, offset };
    })
    .reverse();

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="relative h-[440px] touch-pan-y md:h-[480px]">
        {visible.map(({ card, offset }) => {
          const isFront = offset === 0;
          return (
            <motion.div
              key={`${card.id}-${offset}-${index}`}
              className="absolute inset-x-0 top-0"
              style={{ zIndex: 30 - offset }}
              initial={false}
              animate={{
                y: offset * 18,
                scale: 1 - offset * 0.05,
                opacity: 1 - offset * 0.18,
              }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              drag={isFront ? 'y' : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.65}
              onDragEnd={isFront ? onDragEnd : undefined}
            >
              <LobbyStackCard card={card} depth={offset} interactive={isFront} />
            </motion.div>
          );
        })}
      </div>

      {cards.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              aria-label={`Show lobby ${i + 1}`}
              onClick={() => setIndex(i)}
              className={[
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-6 bg-[#FF5722]' : 'w-1.5 bg-white/25 hover:bg-white/40',
              ].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
