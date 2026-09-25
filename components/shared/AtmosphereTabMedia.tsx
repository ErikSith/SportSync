import { isSportAvatarUrl } from '@/lib/media/sport-avatars';

/**
 * Shared photo plane for event / tournament atmosphere tabs.
 * Goal: sport readable at a glance, still clearly a background — never a loud hero.
 * SportSync mascot avatars: full character visible on the right (object-contain).
 */
interface AtmosphereTabMediaProps {
  src: string | null;
  /** Soft brand wash — red for events, brass for tournaments, teal for programs. */
  wash?: 'coral' | 'red' | 'brass' | 'teal' | 'none';
}

export function AtmosphereTabMedia({ src, wash = 'coral' }: AtmosphereTabMediaProps) {
  const isAvatar = isSportAvatarUrl(src);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: isAvatar
            ? 'linear-gradient(145deg, #1c1914 0%, #12110f 55%, #0e0d0b 100%)'
            : 'linear-gradient(145deg, #3a342e 0%, #1a1714 48%, #241f1b 100%)',
        }}
      />

      {isAvatar && (
        <div
          className="absolute right-[-4%] bottom-[-4%] h-[95%] w-[70%] rounded-full opacity-70 blur-2xl"
          style={{
            background:
              wash === 'brass'
                ? 'radial-gradient(circle, rgba(196,160,53,0.38) 0%, transparent 68%)'
                : wash === 'red'
                  ? 'radial-gradient(circle, rgba(229,57,53,0.32) 0%, transparent 68%)'
                  : wash === 'teal'
                    ? 'radial-gradient(circle, rgba(45,212,191,0.28) 0%, transparent 68%)'
                    : 'radial-gradient(circle, rgba(200,75,36,0.32) 0%, transparent 68%)',
          }}
        />
      )}

      {/* Photo path (non-avatar) */}
      {src && !isAvatar ? (
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
      ) : null}

      {isAvatar ? (
        /* Text scrim only on the left — never covers the mascot. */
        <div
          className="absolute inset-y-0 left-0 w-[52%]"
          style={{
            background:
              'linear-gradient(90deg, rgba(18,17,15,0.97) 0%, rgba(18,17,15,0.85) 62%, transparent 100%)',
          }}
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-[#12110f]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12110f] from-[12%] via-[#12110f]/55 via-[48%] to-[#12110f]/15" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 90% at 50% 35%, transparent 35%, rgba(18,17,15,0.55) 100%)',
            }}
          />
        </>
      )}

      {/* Mascot on top of scrims so the full figure stays crisp and uncropped. */}
      {src && isAvatar ? (
        <div className="absolute inset-y-2 right-2 z-[1] box-border w-[58%] p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="h-full w-full object-contain object-center drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            draggable={false}
          />
        </div>
      ) : null}

      {!isAvatar && wash === 'coral' && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-container/12 via-transparent to-transparent opacity-70" />
      )}
      {!isAvatar && wash === 'red' && (
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: 'linear-gradient(135deg, rgba(229,57,53,0.16) 0%, transparent 42%)',
          }}
        />
      )}
      {!isAvatar && wash === 'brass' && (
        <div
          className="absolute inset-0 opacity-45"
          style={{
            background: 'linear-gradient(135deg, rgba(196,160,53,0.14) 0%, transparent 42%)',
          }}
        />
      )}
      {!isAvatar && wash === 'teal' && (
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: 'linear-gradient(135deg, rgba(45,212,191,0.14) 0%, transparent 42%)',
          }}
        />
      )}
    </div>
  );
}
