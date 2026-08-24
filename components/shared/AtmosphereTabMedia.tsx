/**
 * Shared photo plane for event / tournament atmosphere tabs.
 * Goal: sport readable at a glance, still clearly a background — never a loud hero.
 */
interface AtmosphereTabMediaProps {
  src: string | null;
  /** Soft brand wash — coral for events, brass for tournaments. */
  wash?: 'coral' | 'brass' | 'none';
}

export function AtmosphereTabMedia({ src, wash = 'coral' }: AtmosphereTabMediaProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={[
            'absolute inset-0 h-full w-full object-cover object-[center_32%]',
            'scale-[1.06] opacity-[0.55] saturate-[0.65] brightness-[0.88] contrast-[0.92]',
            'transition-[transform,opacity,filter] duration-700 ease-out',
            'group-hover:scale-100 group-hover:opacity-[0.64] group-hover:saturate-[0.78] group-hover:brightness-[0.92]',
          ].join(' ')}
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(145deg, #3a342e 0%, #1a1714 48%, #241f1b 100%)',
          }}
        />
      )}

      {/* Even mute so busy photos don't punch through mid-card text. */}
      <div className="absolute inset-0 bg-[#12110f]/40" />

      {/* Text stage: strong only in the lower 55%. Upper scene stays legible. */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#12110f] from-[12%] via-[#12110f]/55 via-[48%] to-[#12110f]/15" />

      {/* Soft vignette — pulls eye to center subject without hard crops. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 35%, transparent 35%, rgba(18,17,15,0.55) 100%)',
        }}
      />

      {wash === 'coral' && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-container/12 via-transparent to-transparent opacity-70" />
      )}
      {wash === 'brass' && (
        <div
          className="absolute inset-0 opacity-45"
          style={{
            background: 'linear-gradient(135deg, rgba(196,160,53,0.14) 0%, transparent 42%)',
          }}
        />
      )}
    </div>
  );
}
