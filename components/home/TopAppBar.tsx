import Link from 'next/link';
import { ShareQrButton } from '@/components/home/ShareQrButton';

interface TopAppBarProps {
  avatarUrl: string | null;
  name: string;
}

export function TopAppBar({ avatarUrl, name }: TopAppBarProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-2xl shadow-black/50 fixed top-0 left-0 right-0 w-full max-w-[100vw] z-50 flex items-center justify-between px-4 sm:px-gutter h-16 pt-[env(safe-area-inset-top,0px)]">
      <ShareQrButton />
      <Link
        href="/"
        aria-label="Go to homepage"
        className="font-display-lg text-display-lg-mobile tracking-tighter text-primary-container md:font-display-lg hover:text-primary-fixed-dim transition-colors"
      >
        SPORTSYNC
      </Link>
      <Link
        href="/profile"
        className="text-primary hover:text-primary-fixed-dim transition-colors active:scale-95 flex items-center justify-center w-10 h-10 rounded-full overflow-hidden border-2 border-outline-variant/30"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={name} className="w-full h-full object-cover" src={avatarUrl} />
        ) : (
          <span className="w-full h-full flex items-center justify-center bg-surface-container text-on-surface font-label-caps text-[12px]">
            {initials}
          </span>
        )}
      </Link>
    </header>
  );
}
