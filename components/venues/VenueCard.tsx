'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { VenueCardActivity, VenueCardData } from '@/lib/data/venues';
import { sportDisplayLabel } from '@/lib/constants/sports';
import { resolveVenueCover, resolveVenueLogo } from '@/lib/venues/venue-media';

/** Fixed grid tile — same footprint family as event/tournament cards. */
export const VENUE_CARD_HEIGHT = 'h-[420px]';

const EVENT_FALLBACK =
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=640&q=80';
const CUP_FALLBACK =
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=640&q=80';

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 10) / 10} km`;
  return `${km} km`;
}

function formatPeekWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d
    .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time}`;
}

function nextUpLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return 'Now';
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (hours <= 24) return hours <= 1 ? 'In 1h' : `In ${hours}h`;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `In ${days}d`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
}

function activityThumb(activity: VenueCardActivity): string {
  if (activity.coverUrl) return activity.coverUrl;
  return activity.kind === 'tournament' ? CUP_FALLBACK : EVENT_FALLBACK;
}

function ActivityThumbs({
  activities,
  activeId,
  onPeek,
  onClear,
}: {
  activities: VenueCardActivity[];
  activeId: string | null;
  onPeek: (activity: VenueCardActivity) => void;
  onClear: () => void;
}) {
  const thumbs = activities.slice(0, 3);
  if (thumbs.length === 0) return null;

  return (
    <div className="flex items-center gap-1" onMouseLeave={onClear}>
      {thumbs.map((activity) => {
        const isActive = activeId === activity.id;
        return (
          <button
            key={activity.id}
            type="button"
            onMouseEnter={() => onPeek(activity)}
            onFocus={() => onPeek(activity)}
            onBlur={onClear}
            onClick={(e) => {
              e.preventDefault();
              if (activeId === activity.id) onClear();
              else onPeek(activity);
            }}
            aria-label={`Preview ${activity.title}`}
            aria-pressed={isActive}
            className={[
              'relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-surface-container transition-transform duration-150',
              isActive ? 'scale-105 ring-2 ring-offset-1 ring-offset-surface-container-high' : 'hover:scale-105',
              activity.kind === 'tournament'
                ? isActive
                  ? 'ring-secondary'
                  : 'ring-1 ring-secondary/60'
                : isActive
                  ? 'ring-primary-container'
                  : 'ring-1 ring-primary-container/60',
            ].join(' ')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activityThumb(activity)} alt="" className="h-full w-full object-cover" />
          </button>
        );
      })}
    </div>
  );
}

export function VenueCard({ venue }: { venue: VenueCardData }) {
  const cover = resolveVenueCover({
    name: venue.name,
    sports: venue.sports,
    coverUrl: venue.coverUrl,
  });
  const logo = resolveVenueLogo({
    name: venue.name,
    logoUrl: venue.logoUrl,
    websiteUrl: venue.websiteUrl,
  });
  const primarySport = venue.sports[0] ? sportDisplayLabel(venue.sports[0]) : 'Multi';
  const extraSports = Math.max(0, venue.sports.length - 1);
  const nextUp = venue.activities[0] ?? null;
  const [active, setActive] = useState<VenueCardActivity | null>(null);

  const sportChips = venue.sports.slice(0, 3);
  const amenityIcons = venue.amenities.slice(0, 3);

  return (
    <article
      className={[
        VENUE_CARD_HEIGHT,
        'group relative flex flex-col overflow-hidden rounded-2xl',
        'bg-surface-container-high border border-tertiary/20',
        'transition-colors duration-300 hover:border-tertiary/50',
      ].join(' ')}
    >
      <Link
        href={`/venues/${venue.id}`}
        aria-label={`View ${venue.name}`}
        className="absolute inset-0 z-0"
      />

      <div
        className="relative z-[1] h-0.5 shrink-0 w-full pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, #929090 0%, #e5e2e1 45%, #929090 100%)',
        }}
        aria-hidden
      />

      <div className="relative z-[1] h-[168px] shrink-0 overflow-hidden bg-surface-container pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          src={cover}
          alt=""
        />
        <div
          className={[
            'absolute inset-0 transition-colors duration-200',
            active?.kind === 'tournament'
              ? 'bg-gradient-to-t from-surface-container-high via-secondary/25 to-black/40'
              : active
                ? 'bg-gradient-to-t from-surface-container-high via-primary-container/25 to-black/40'
                : 'bg-gradient-to-t from-surface-container-high via-black/30 to-black/40',
          ].join(' ')}
        />

        <span
          className="material-symbols-outlined absolute -right-1 -bottom-2 text-[88px] text-tertiary/15 select-none"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden
        >
          stadium
        </span>

        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2 pointer-events-none">
          {venue.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-tertiary/30 bg-background/75 px-2 py-1 text-tertiary backdrop-blur-md">
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
              <span className="font-label-caps text-[10px] uppercase tracking-wide">Elite</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-outline-variant/30 bg-background/75 px-2 py-1 text-on-surface-variant backdrop-blur-md">
              <span className="material-symbols-outlined text-[14px]">stadium</span>
              <span className="font-label-caps text-[10px] uppercase tracking-wide">Club</span>
            </span>
          )}

          <div className="pointer-events-auto flex items-start gap-1.5">
            {venue.activities.length > 0 && (
              <ActivityThumbs
                activities={venue.activities}
                activeId={active?.id ?? null}
                onPeek={setActive}
                onClear={() => setActive(null)}
              />
            )}
            {logo ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-background/85 backdrop-blur-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="" className="h-5 w-5 object-contain" />
              </span>
            ) : null}
          </div>
        </div>

        {active ? (
          <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
            <div className="rounded-xl border border-white/10 bg-background/85 px-2.5 py-2 shadow-lg backdrop-blur-md">
              <div className="mb-0.5 flex items-center gap-1.5">
                <span
                  className={[
                    'font-label-caps text-[9px] uppercase tracking-wide',
                    active.kind === 'tournament' ? 'text-secondary' : 'text-primary-container',
                  ].join(' ')}
                >
                  {active.kind === 'tournament' ? 'Cup' : 'Event'}
                </span>
                <span className="font-label-caps text-[9px] uppercase tracking-wide text-on-surface-variant">
                  {formatPeekWhen(active.startsAt)}
                </span>
              </div>
              <p className="line-clamp-1 font-headline-md text-[13px] leading-snug text-on-surface">
                {active.title}
              </p>
              <p className="mt-0.5 font-label-caps text-[9px] uppercase tracking-wide text-on-surface-variant">
                {sportDisplayLabel(active.sport)}
              </p>
            </div>
          </div>
        ) : (
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 pointer-events-none">
            <span className="rounded-full bg-tertiary-container/95 px-2.5 py-1 font-label-caps text-[10px] uppercase tracking-wide text-on-tertiary-container backdrop-blur-sm">
              {primarySport}
              {extraSports > 0 ? ` +${extraSports}` : ''}
            </span>
            {(venue.eventCount > 0 || venue.tournamentCount > 0) && (
              <div className="flex items-center gap-1">
                {venue.eventCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-white/20 bg-primary-container/90 px-1.5 py-0.5 text-white backdrop-blur-md">
                    <span className="material-symbols-outlined text-[11px]">event</span>
                    <span className="font-label-caps text-[9px] uppercase tracking-wide">
                      {venue.eventCount}
                    </span>
                  </span>
                )}
                {venue.tournamentCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-white/20 bg-secondary/90 px-1.5 py-0.5 text-on-secondary backdrop-blur-md">
                    <span className="material-symbols-outlined text-[11px]">emoji_events</span>
                    <span className="font-label-caps text-[9px] uppercase tracking-wide">
                      {venue.tournamentCount}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 pointer-events-none">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1 text-tertiary">
            <span className="material-symbols-outlined text-[14px]">near_me</span>
            <span className="font-label-caps text-[10px] uppercase tracking-wide">
              {formatDistance(venue.distanceKm)}
              <span className="text-on-surface-variant"> · {venue.city}</span>
            </span>
          </p>
          {venue.openingHoursSummary && (
            <p className="flex min-w-0 items-center gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-[13px]">schedule</span>
              <span className="truncate font-label-caps text-[9px] uppercase tracking-wide">
                {venue.openingHoursSummary}
              </span>
            </p>
          )}
        </div>

        <h3 className="line-clamp-2 min-h-[2.4em] font-headline-md text-[17px] leading-snug text-on-background transition-colors group-hover:text-tertiary">
          {venue.name}
        </h3>

        {venue.address && (
          <p className="mt-1 flex items-start gap-1 text-on-surface-variant">
            <span className="material-symbols-outlined mt-px shrink-0 text-[13px]">location_on</span>
            <span className="line-clamp-1 font-body-md text-[11px] leading-snug">{venue.address}</span>
          </p>
        )}

        {sportChips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {sportChips.map((sport) => (
              <span
                key={sport}
                className="rounded-md border border-tertiary/20 bg-surface-container px-1.5 py-0.5 font-label-caps text-[9px] uppercase tracking-wide text-on-surface-variant"
              >
                {sportDisplayLabel(sport)}
              </span>
            ))}
            {venue.sports.length > 3 && (
              <span className="rounded-md border border-tertiary/20 bg-surface-container px-1.5 py-0.5 font-label-caps text-[9px] uppercase tracking-wide text-tertiary">
                +{venue.sports.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto space-y-2 border-t border-tertiary/15 pt-3">
          {nextUp ? (
            <div
              className={[
                'rounded-xl border px-2.5 py-2',
                nextUp.kind === 'tournament'
                  ? 'border-secondary/25 bg-secondary/10'
                  : 'border-primary-container/25 bg-primary-container/10',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={[
                    'font-label-caps text-[9px] uppercase tracking-wide',
                    nextUp.kind === 'tournament' ? 'text-secondary' : 'text-primary-container',
                  ].join(' ')}
                >
                  Next {nextUp.kind === 'tournament' ? 'cup' : 'event'}
                </span>
                <span className="font-label-caps text-[9px] uppercase tracking-wide text-on-surface-variant">
                  {nextUpLabel(nextUp.startsAt)}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-1 font-headline-md text-[12px] leading-snug text-on-surface">
                {nextUp.title}
              </p>
            </div>
          ) : (
            <p className="line-clamp-2 font-body-md text-[12px] leading-snug text-on-surface-variant">
              {venue.description ?? 'Courts, booking & clubs at this facility.'}
            </p>
          )}

          {amenityIcons.length > 0 && (
            <div className="flex items-center gap-2 text-tertiary">
              {amenityIcons.map((amenity) => (
                <span
                  key={amenity.key}
                  className="inline-flex items-center gap-0.5"
                  title={amenity.label}
                >
                  <span className="material-symbols-outlined text-[14px]">{amenity.icon}</span>
                  <span className="sr-only">{amenity.label}</span>
                </span>
              ))}
              <span className="ml-auto font-label-caps text-[9px] uppercase tracking-wide text-on-surface-variant/70">
                {venue.eventCount + venue.tournamentCount > 0
                  ? `${venue.eventCount + venue.tournamentCount} upcoming`
                  : 'Open to book'}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
