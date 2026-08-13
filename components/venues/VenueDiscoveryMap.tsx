'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { VenueCardData } from '@/lib/data/venues';
import { sportDisplayLabel } from '@/lib/constants/sports';
import 'leaflet/dist/leaflet.css';

const BRATISLAVA: [number, number] = [48.1486, 17.1077];
const ACCENT = '#FF5722';
const SURFACE = '#121212';

export interface VenueMapPin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sports: string[];
  address: string | null;
  websiteUrl: string | null;
  eventCount: number;
  tournamentCount: number;
  activities: VenueCardData['activities'];
  distanceKm: number;
  verified: boolean;
}

function toPins(venues: VenueCardData[]): VenueMapPin[] {
  return venues
    .filter(
      (v): v is VenueCardData & { latitude: number; longitude: number } =>
        v.latitude != null &&
        v.longitude != null &&
        Number.isFinite(v.latitude) &&
        Number.isFinite(v.longitude),
    )
    .map((v) => ({
      id: v.id,
      name: v.name,
      latitude: v.latitude,
      longitude: v.longitude,
      sports: v.sports,
      address: v.address,
      websiteUrl: v.websiteUrl,
      eventCount: v.eventCount,
      tournamentCount: v.tournamentCount,
      activities: v.activities,
      distanceKm: v.distanceKm,
      verified: v.verified,
    }));
}

function pinIcon(active: boolean) {
  const size = active ? 36 : 28;
  return L.divIcon({
    className: 'sportsync-venue-pin',
    html: `<span style="
      display:block;width:${size}px;height:${size}px;border-radius:9999px;
      background:${ACCENT};border:2px solid #fff;box-shadow:0 0 0 3px rgba(255,87,34,0.35),0 8px 20px rgba(0,0,0,0.55);
      transform:translate(-50%,-50%);
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [0, 0],
  });
}

function FitBounds({ pins }: { pins: VenueMapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) {
      map.setView(BRATISLAVA, 12);
      return;
    }
    if (pins.length === 1) {
      map.setView([pins[0]!.latitude, pins[0]!.longitude], 14);
      return;
    }
    const bounds = L.latLngBounds(
      pins.map((p) => [p.latitude, p.longitude] as [number, number]),
    );
    map.fitBounds(bounds.pad(0.18));
  }, [map, pins]);
  return null;
}

function FlyToSelection({ pin }: { pin: VenueMapPin | null }) {
  const map = useMap();
  useEffect(() => {
    if (!pin) return;
    map.flyTo([pin.latitude, pin.longitude], Math.max(map.getZoom(), 14), {
      duration: 0.55,
    });
  }, [map, pin]);
  return null;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('sk-SK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function VenueBottomSheet({
  pin,
  onClose,
}: {
  pin: VenueMapPin | null;
  onClose: () => void;
}) {
  const open = Boolean(pin);

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-[500] flex justify-center px-3 pb-3 transition-transform duration-300 ease-out md:px-6 md:pb-5 ${
        open ? 'translate-y-0' : 'translate-y-[110%]'
      }`}
      aria-hidden={!open}
    >
      <div
        className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-t-2xl border border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.55)]"
        style={{ background: SURFACE }}
        role="dialog"
        aria-modal="true"
        aria-label={pin?.name ?? 'Venue details'}
      >
        <div className="flex justify-center pt-2.5">
          <span className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {pin ? (
          <div className="space-y-4 px-4 pb-5 pt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF5722]">
                  {pin.verified ? 'Verified venue' : 'Venue'}
                  {pin.distanceKm > 0 ? ` · ${pin.distanceKm.toFixed(1)} km` : ''}
                </p>
                <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-white">
                  {pin.name}
                </h2>
                {pin.address ? (
                  <p className="mt-1 text-sm text-white/55">{pin.address}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {pin.sports.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {pin.sports.slice(0, 6).map((sport) => (
                  <span
                    key={sport}
                    className="rounded-md border border-[#FF5722]/35 bg-[#FF5722]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FF5722]"
                  >
                    {sportDisplayLabel(sport)}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Events</p>
                <p className="text-lg font-semibold text-white">{pin.eventCount}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Cups</p>
                <p className="text-lg font-semibold text-white">{pin.tournamentCount}</p>
              </div>
            </div>

            {pin.activities.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  Upcoming
                </p>
                <ul className="space-y-1.5">
                  {pin.activities.slice(0, 3).map((activity) => (
                    <li
                      key={`${activity.kind}-${activity.id}`}
                      className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2"
                    >
                      <p className="truncate text-sm text-white">{activity.title}</p>
                      <p className="mt-0.5 text-[11px] text-white/45">
                        {formatWhen(activity.startsAt)}
                        {activity.kind === 'tournament' ? ' · Cup' : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-white/45">
                Zatiaľ žiadne nadchádzajúce termíny — skús oficiálny web alebo detail venues.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Link
                href={`/venues/${pin.id}`}
                className="flex-1 rounded-xl bg-[#FF5722] px-4 py-3 text-center text-sm font-semibold text-white transition hover:brightness-110"
              >
                Open venue
              </Link>
              {pin.websiteUrl ? (
                <a
                  href={pin.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                >
                  Web
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function VenueDiscoveryMap({ venues }: { venues: VenueCardData[] }) {
  const pins = useMemo(() => toPins(venues), [venues]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pins.find((p) => p.id === selectedId) ?? null;

  return (
    <div
      className="relative h-[min(72vh,720px)] min-h-[420px] w-full overflow-hidden rounded-2xl border border-white/10"
      style={{ background: SURFACE }}
    >
      <MapContainer
        center={BRATISLAVA}
        zoom={12}
        className="h-full w-full bg-[#121212]"
        zoomControl={false}
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds pins={pins} />
        <FlyToSelection pin={selected} />
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.latitude, pin.longitude]}
            icon={pinIcon(pin.id === selectedId)}
            eventHandlers={{
              click: () => setSelectedId(pin.id),
            }}
          />
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-lg border border-white/10 bg-[#121212]/85 px-3 py-2 backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF5722]">
          Map discovery
        </p>
        <p className="text-xs text-white/70">
          {pins.length} pin{pins.length === 1 ? '' : 's'} with GPS
        </p>
      </div>

      <VenueBottomSheet pin={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
