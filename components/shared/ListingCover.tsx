import { isSportAvatarUrl } from '@/lib/media/sport-avatars';

/**
 * Event / tournament hero. When src is null (Form Factory, missing cover),
 * render a brand gradient — never a third-party photo fallback.
 * SportSync mascot avatars (`/avatars/...`) use contain so the character stays whole.
 */
export function ListingCover({
  src,
  alt = '',
  className,
}: {
  src: string | null;
  alt?: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={className}
        aria-hidden
        style={{
          background: 'linear-gradient(145deg, #3a342e 0%, #1a1714 48%, #241f1b 100%)',
        }}
      />
    );
  }

  if (isSportAvatarUrl(src)) {
    return (
      <div
        className={className}
        aria-hidden
        style={{
          background: 'linear-gradient(145deg, #2a2622 0%, #1a1714 55%, #12110f 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-contain object-center" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
