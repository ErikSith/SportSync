/**
 * Event / tournament hero. When src is null (Form Factory, missing cover),
 * render a brand gradient — never a third-party photo fallback.
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

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
