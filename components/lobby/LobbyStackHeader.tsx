'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';

interface LobbyStackHeaderProps {
  city: string;
}

export function LobbyStackHeader({ city }: LobbyStackHeaderProps) {
  return (
    <header className="space-y-5 pt-2">
      <div className="relative flex items-center justify-center">
        <Link
          href="/"
          className="font-headline-md text-lg font-bold uppercase tracking-[0.2em] text-[#FF5722] md:text-xl"
        >
          SPORTSYNC
        </Link>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#1A1A1A] px-3 py-1.5 text-xs font-medium text-white">
            <MapPin className="h-3.5 w-3.5 text-[#FF7F50]" strokeWidth={2.25} />
            {city}
          </span>
        </div>
      </div>

      <h1 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF5722]">
        Lobby &amp; Recurring
      </h1>
    </header>
  );
}
