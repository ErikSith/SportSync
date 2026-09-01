'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import type { LobbyStackCardData, PlayerAvatar } from '@/types/lobby';
import { statusBadgeLabel } from '@/lib/lobby-stack';
import { VerifiedAvatarBadge } from '@/components/profile/VerifiedBadge';

function Avatar({ player }: { player: PlayerAvatar }) {
  return (
    <div
      title={player.name}
      className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-[#1A1A1A] bg-zinc-800"
    >
      {player.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.image} alt={player.name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[9px] font-bold text-zinc-300">
          {player.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <VerifiedAvatarBadge verified={player.isVerified} />
    </div>
  );
}

interface LobbyStackCardProps {
  card: LobbyStackCardData;
  depth?: number;
  interactive?: boolean;
}

export function LobbyStackCard({ card, depth = 0, interactive = true }: LobbyStackCardProps) {
  const badge = statusBadgeLabel(card);
  const shownRoster = card.roster.slice(0, 4);
  const overflowSlot = card.openSlots > 0 ? Math.min(card.openSlots, 9) : 0;
  const heroOverflow = card.has3dEffect && depth === 0;

  const body = (
    <article
      className={[
        'relative overflow-hidden rounded-2xl border border-white/8 bg-[#1A1A1A]',
        'shadow-[0_20px_50px_rgba(0,0,0,0.55)]',
        interactive ? 'transition-transform active:scale-[0.99]' : '',
      ].join(' ')}
    >
      <div
        className={[
          'relative overflow-hidden',
          heroOverflow ? '-mx-1 -mt-4 h-56 md:h-64' : 'h-52 md:h-60',
        ].join(' ')}
      >
        {card.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.coverUrl}
            alt=""
            className={[
              'h-full w-full object-cover',
              heroOverflow ? 'scale-[1.06]' : '',
            ].join(' ')}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#262626] to-[#121212]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#1A1A1A]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1A1A1A] to-transparent" />

        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-[#FF5722]/70 bg-[#121212]/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#FF7F50] backdrop-blur-sm">
          <User className="h-3 w-3" strokeWidth={2.5} />
          {badge}
        </span>
      </div>

      <div className="relative space-y-3 px-4 pb-4 pt-1">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold uppercase tracking-wide text-white md:text-2xl">
              {card.sport}
            </h2>
            <span className="rounded-full border border-[#FF5722]/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#FF5722]">
              {badge}
            </span>
          </div>
          <p className="text-sm text-white/90">
            <span className="font-medium uppercase">{card.sport}</span>
            <span className="text-gray-500"> • </span>
            {card.dateLabel} {card.timeLabel}
            <span className="text-gray-500"> • </span>
            Skill: {card.skillLabel}
          </p>
        </div>

        <div className="h-px bg-white/8" />

        <div className="flex items-end justify-between gap-3">
          <div className="flex items-center -space-x-2">
            {shownRoster.map((p) => (
              <Avatar key={p.id} player={p} />
            ))}
            {overflowSlot > 0 && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 bg-[#121212] text-[11px] font-semibold text-gray-400">
                +{overflowSlot}
              </div>
            )}
          </div>
          <p className="max-w-[45%] truncate text-right text-xs text-gray-400">
            {card.venueName}
            <span className="text-gray-600"> | </span>
            {card.city}
          </p>
        </div>
      </div>
    </article>
  );

  if (!interactive) return body;

  return (
    <Link href={card.href} className="block outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722]">
      {body}
    </Link>
  );
}
