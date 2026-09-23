'use client';

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const BRATISLAVA: [number, number] = [48.1486, 17.1077];
const SURFACE = '#121212';

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'ss-meeting-pin',
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    html: `<div style="
      width:28px;height:36px;display:flex;align-items:flex-end;justify-content:center;
      filter:drop-shadow(0 2px 4px rgba(0,0,0,.55));
    ">
      <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="#FF5722"/>
        <circle cx="14" cy="14" r="5.5" fill="#121212"/>
      </svg>
    </div>`,
  });
}

function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToPin({
  lat,
  lng,
  zoom,
  nonce,
}: {
  lat: number;
  lng: number;
  zoom?: number;
  nonce: number;
}) {
  const map = useMap();
  const lastNonce = useRef(-1);

  useEffect(() => {
    if (nonce === lastNonce.current) return;
    lastNonce.current = nonce;
    map.flyTo([lat, lng], zoom ?? Math.max(map.getZoom(), 15), { duration: 0.55 });
  }, [lat, lng, zoom, nonce, map]);

  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(t);
  }, [map]);
  return null;
}

export interface MeetingPointMapProps {
  latitude: number | null;
  longitude: number | null;
  /** Bump to fly the map to the current lat/lng (e.g. after tip select). */
  flyNonce?: number;
  onPinChange: (lat: number, lng: number) => void;
  className?: string;
}

export function MeetingPointMap({
  latitude,
  longitude,
  flyNonce = 0,
  onPinChange,
  className,
}: MeetingPointMapProps) {
  const icon = useMemo(() => pinIcon(), []);
  const hasPin =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const center: [number, number] = hasPin ? [latitude, longitude] : BRATISLAVA;

  useEffect(() => {
    const id = 'ss-meeting-pin-style';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent =
      '.ss-meeting-pin{background:transparent!important;border:none!important;}';
    document.head.appendChild(el);
  }, []);

  return (
    <div
      className={[
        'relative h-[200px] w-full overflow-hidden rounded-xl border border-white/10',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ background: SURFACE }}
    >
      <MapContainer
        center={center}
        zoom={hasPin ? 15 : 12}
        className="h-full w-full bg-[#121212]"
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <InvalidateSize />
        <MapClickHandler onPick={onPinChange} />
        {hasPin ? (
          <>
            <FlyToPin lat={latitude} lng={longitude} nonce={flyNonce} />
            <Marker
              position={[latitude, longitude]}
              icon={icon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target as L.Marker;
                  const pos = marker.getLatLng();
                  onPinChange(pos.lat, pos.lng);
                },
              }}
            />
          </>
        ) : null}
      </MapContainer>
      <p className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-lg bg-black/55 px-2 py-1 text-center text-[10px] text-zinc-300 backdrop-blur-sm">
        {hasPin ? 'Ťahaj pin alebo ťukni inde na mape' : 'Ťukni na mapu a umiestni pin'}
      </p>
    </div>
  );
}
