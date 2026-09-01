'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { VenueCardData } from '@/lib/data/venues';
import { sportDisplayLabel } from '@/lib/constants/sports';
import { sportEmoji } from '@/lib/constants/badge-emojis';
import MarkerClusterGroup from '@/components/venues/MarkerClusterGroup';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';

const BRATISLAVA: [number, number] = [48.1486, 17.1077];
const SURFACE = '#121212';
/** Approximate pill size — must be non-zero or Leaflet clips the DivIcon. */
const BADGE_SIZE: [number, number] = [148, 34];

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

export interface UserMapLocation {
  latitude: number;
  longitude: number;
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function activeEventCount(pin: VenueMapPin): number {
  return pin.eventCount + pin.tournamentCount;
}

function venueBadgeIcon(pin: VenueMapPin, selected: boolean): L.DivIcon {
  const emoji = sportEmoji(pin.sports[0] ?? 'OTHER');
  const name = escapeHtml(pin.name);
  const active = activeEventCount(pin);
  const eventBadge =
    active > 0
      ? `<span class="ss-venue-badge__count">+${active}</span>`
      : '';
  const selectedClass = selected ? ' is-selected' : '';

  return L.divIcon({
    className: 'ss-venue-badge',
    html: `<div class="ss-venue-badge__inner${selectedClass}" title="${name}">
      <span class="ss-venue-badge__emoji">${emoji}</span>
      <span class="ss-venue-badge__name">${name}</span>
      ${eventBadge}
    </div>`,
    iconSize: BADGE_SIZE,
    iconAnchor: [BADGE_SIZE[0] / 2, BADGE_SIZE[1]],
  });
}

function userLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: 'ss-user-loc',
    html: `<div class="ss-user-loc__pulse" aria-hidden="true"><div class="ss-user-loc__dot"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  return L.divIcon({
    className: 'ss-cluster-badge',
    html: `<div class="ss-cluster-badge__inner">${count}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function FitBounds({
  pins,
  userLocation,
}: {
  pins: VenueMapPin[];
  userLocation: UserMapLocation | null;
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = pins.map((p) => [p.latitude, p.longitude]);
    if (userLocation) {
      points.push([userLocation.latitude, userLocation.longitude]);
    }
    if (points.length === 0) {
      map.setView(BRATISLAVA, 12);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0]!, 14);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.18));
  }, [map, pins, userLocation]);
  return null;
}

function FlyToSelection({ pin }: { pin: VenueMapPin | null }) {
  const map = useMap();
  useEffect(() => {
    if (!pin) return;
    map.flyTo([pin.latitude, pin.longitude], Math.max(map.getZoom(), 15), {
      duration: 0.55,
    });
  }, [map, pin]);
  return null;
}

function FlyToUser({
  location,
  requestId,
}: {
  location: UserMapLocation | null;
  requestId: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!location || requestId === 0) return;
    map.flyTo([location.latitude, location.longitude], Math.max(map.getZoom(), 14), {
      duration: 0.55,
    });
  }, [map, location, requestId]);
  return null;
}

function VenuePinPopup({ pin }: { pin: VenueMapPin }) {
  const active = activeEventCount(pin);

  return (
    <div className="ss-venue-popup-body w-[220px] space-y-3">
      <div className="min-w-0 pr-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FF5722]">
          {pin.verified ? 'Verified' : 'Venue'}
          {pin.distanceKm > 0 ? ` · ${pin.distanceKm.toFixed(1)} km` : ''}
        </p>
        <h3 className="mt-1 truncate text-sm font-bold leading-snug text-white">
          {pin.name}
        </h3>
        {pin.address ? (
          <p className="mt-1 line-clamp-2 text-xs text-gray-400">{pin.address}</p>
        ) : null}
      </div>

      {pin.sports.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {pin.sports.slice(0, 3).map((sport) => (
            <span
              key={sport}
              className="rounded-full border border-[#FF5722]/40 bg-[#FF5722]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FF5722]"
            >
              {sportDisplayLabel(sport)}
            </span>
          ))}
          {active > 0 ? (
            <span className="rounded-full bg-[#FF5722] px-2 py-0.5 text-[10px] font-bold text-white">
              +{active}
            </span>
          ) : null}
        </div>
      ) : active > 0 ? (
        <span className="inline-flex rounded-full bg-[#FF5722] px-2 py-0.5 text-[10px] font-bold text-white">
          +{active} events
        </span>
      ) : null}

      <Link
        href={`/venues/${pin.id}`}
        className="block w-full rounded-xl bg-[#FF5722] px-3 py-2.5 text-center text-xs font-semibold text-white transition hover:brightness-110"
      >
        Open venue
      </Link>
    </div>
  );
}

export function VenueDiscoveryMap({
  venues,
  userLocation: savedLocation = null,
}: {
  venues: VenueCardData[];
  userLocation?: UserMapLocation | null;
}) {
  const pins = useMemo(() => toPins(venues), [venues]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveLocation, setLiveLocation] = useState<UserMapLocation | null>(null);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [flyRequestId, setFlyRequestId] = useState(0);
  const selected = pins.find((p) => p.id === selectedId) ?? null;
  const userLocation = liveLocation ?? savedLocation;

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLiveLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocateError(null);
      },
      () => {
        /* Keep saved profile pin if permission denied. */
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  function locateMe() {
    if (!('geolocation' in navigator)) {
      setLocateError('GPS nie je dostupné');
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLiveLocation(next);
        setFlyRequestId((n) => n + 1);
        setLocating(false);
        void fetch('/api/profile/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'gps',
            latitude: next.latitude,
            longitude: next.longitude,
          }),
        }).catch(() => {
          /* map pin still works without persist */
        });
      },
      () => {
        setLocating(false);
        setLocateError('Povolenie GPS bolo zamietnuté');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div
      className="relative h-[min(72vh,720px)] min-h-[420px] w-full overflow-hidden rounded-2xl border border-white/10"
      style={{ background: SURFACE }}
    >
      <MapContainer
        center={
          userLocation
            ? ([userLocation.latitude, userLocation.longitude] as [number, number])
            : BRATISLAVA
        }
        zoom={12}
        className="h-full w-full bg-[#121212]"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds pins={pins} userLocation={userLocation} />
        <FlyToSelection pin={selected} />
        <FlyToUser location={userLocation} requestId={flyRequestId} />
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          maxClusterRadius={56}
          spiderfyOnMaxZoom
          zoomToBoundsOnClick
          animate
          iconCreateFunction={createClusterIcon}
        >
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              position={[pin.latitude, pin.longitude]}
              icon={venueBadgeIcon(pin, pin.id === selectedId)}
              eventHandlers={{
                popupopen: () => setSelectedId(pin.id),
                popupclose: () =>
                  setSelectedId((current) => (current === pin.id ? null : current)),
              }}
            >
              <Popup
                className="ss-venue-popup"
                closeButton
                offset={[0, -8]}
                maxWidth={260}
                minWidth={220}
              >
                <VenuePinPopup pin={pin} />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {userLocation ? (
          <>
            <CircleMarker
              center={[userLocation.latitude, userLocation.longitude]}
              radius={18}
              pathOptions={{
                color: '#FF5722',
                fillColor: '#FF5722',
                fillOpacity: 0.15,
                weight: 1,
                opacity: 0.45,
              }}
            />
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={userLocationIcon()}
              zIndexOffset={1200}
            >
              <Popup className="ss-venue-popup" closeButton offset={[0, -4]}>
                <div className="ss-venue-popup-body px-1 py-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FF5722]">
                    Tvoja poloha
                  </p>
                  <p className="mt-0.5 text-xs text-white/80">Tu si podľa GPS</p>
                </div>
              </Popup>
            </Marker>
          </>
        ) : null}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-lg border border-white/10 bg-[#121212]/85 px-3 py-2 backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF5722]">
          Map discovery
        </p>
        <p className="text-xs text-white/70">
          {pins.length} pin{pins.length === 1 ? '' : 's'} with GPS
          {userLocation ? ' · Ty' : ''}
        </p>
      </div>

      <div className="absolute bottom-3 right-3 z-[400] flex flex-col items-end gap-1.5">
        {locateError ? (
          <p className="rounded-lg border border-red-500/30 bg-[#121212]/90 px-2.5 py-1.5 text-[10px] text-red-300 backdrop-blur-md">
            {locateError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-[#FF5722]/35 bg-[#121212]/90 px-3 py-2 text-[11px] font-semibold text-white backdrop-blur-md transition hover:border-[#FF5722]/55 hover:bg-[#1a1a1a] active:scale-[0.98] disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[16px] text-[#FF7F50]">
            {locating ? 'progress_activity' : 'my_location'}
          </span>
          {locating ? 'Hľadám…' : userLocation ? 'Centrovať na mňa' : 'Zapnúť GPS'}
        </button>
      </div>
    </div>
  );
}
