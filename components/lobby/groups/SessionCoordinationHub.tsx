'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PollRefresh } from '@/lib/realtime/usePollingRefresh';
import { trackSignal } from '@/lib/telemetry/track';
import type { BookingEventOption, BookingVenueOption } from '@/lib/data/sport-groups';
import type { SessionDetailData, SessionRsvpStatus } from '@/lib/data/sport-groups-shared';
import { GearCheckPanel } from '@/components/lobby/groups/GearCheckPanel';
import { MercenarySOSButton } from '@/components/lobby/groups/MercenarySOSButton';
import { VenueEventBookingLinks } from '@/components/shared/VenueEventBookingLinks';

interface SessionCoordinationHubProps {
  session: SessionDetailData;
  venueOptions: BookingVenueOption[];
  eventOptions: BookingEventOption[];
}

type SaveState = 'idle' | 'saving';

const RSVP_OPTIONS: { value: SessionRsvpStatus; label: string; icon: string }[] = [
  { value: 'going', label: 'Going', icon: 'check_circle' },
  { value: 'maybe', label: 'Maybe', icon: 'help' },
  { value: 'declined', label: "Can't make it", icon: 'cancel' },
];

function MemberAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="w-10 h-10 rounded-full object-cover border border-surface-variant" src={avatarUrl} alt={name} />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-label-caps border border-surface-variant bg-surface-container-high">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function SessionCoordinationHub({ session, venueOptions, eventOptions }: SessionCoordinationHubProps) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [rsvpPending, setRsvpPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [destinationName, setDestinationName] = useState(session.destinationName ?? session.locationNote ?? '');
  const [destinationAddress, setDestinationAddress] = useState(session.destinationAddress ?? '');
  const [parkingNote, setParkingNote] = useState(session.parkingNote ?? '');
  const [venueId, setVenueId] = useState(session.venueId ?? '');
  const [eventId, setEventId] = useState(session.eventId ?? '');

  const goingCount = session.rsvps.filter((r) => r.status === 'going').length;
  const selectedVenue = venueOptions.find((v) => v.id === venueId);
  const selectedEvent = eventOptions.find((e) => e.id === eventId);

  async function updateRsvp(status: SessionRsvpStatus) {
    setError(null);
    setRsvpPending(true);
    const res = await fetch(`/api/groups/${session.groupId}/sessions/${session.id}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? 'Could not update RSVP');
      setRsvpPending(false);
      return;
    }

    trackSignal('group.rsvp', { sessionId: session.id, status });
    setRsvpPending(false);
    router.refresh();
  }

  async function saveLogistics(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaveState('saving');

    const res = await fetch(`/api/groups/${session.groupId}/sessions/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destinationName: destinationName.trim() || null,
        destinationAddress: destinationAddress.trim() || null,
        parkingNote: parkingNote.trim() || null,
        venueId: venueId || null,
        eventId: eventId || null,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setSaveState('idle');
      setError(body?.error ?? 'Could not save details');
      return;
    }

    setSaveState('idle');
    router.refresh();
  }

  const viewerRsvp = session.rsvps.find((r) => r.userId === session.viewerId);

  return (
    <div className="flex flex-col gap-gutter">
      <PollRefresh intervalMs={10000} />

      {(session.venueId || session.eventId) && (
        <section className="glass-panel rounded-xl p-6 space-y-3 border border-secondary/20">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">Book at the venue</h3>
            <p className="font-body-md text-body-md text-on-surface-variant text-sm">
              Tickets and court bookings happen on the venue or event page — not in SportSync.
            </p>
          </div>
          <VenueEventBookingLinks
            venueId={session.venueId}
            venueName={session.venueName}
            eventId={session.eventId}
            eventTitle={session.eventTitle}
          />
        </section>
      )}

      <section className="glass-panel rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">Who&apos;s coming?</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Confirm early so the crew can lock in location and parking.
            </p>
          </div>
          <span className="px-3 py-1 bg-primary-container/20 text-primary-container border border-primary-container/30 rounded-full font-label-caps text-[10px] uppercase">
            {goingCount} going
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {RSVP_OPTIONS.map((option) => {
            const active = viewerRsvp?.status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={rsvpPending}
                onClick={() => void updateRsvp(option.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-caps text-label-caps transition-all ${
                  active
                    ? 'bg-primary-container text-white glow-hover'
                    : 'border border-outline-variant/40 text-on-surface-variant hover:border-primary-container/40'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{option.icon}</span>
                {option.label}
              </button>
            );
          })}
        </div>

        <ul className="flex flex-col gap-2">
          {session.rsvps.map((rsvp) => (
            <li
              key={rsvp.userId}
              className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <MemberAvatar name={rsvp.name} avatarUrl={rsvp.avatarUrl} />
                <div>
                  <p className="font-body-md text-body-md text-on-surface font-semibold">{rsvp.name}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant text-sm capitalize">{rsvp.status}</p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                  rsvp.status === 'going'
                    ? 'bg-secondary/20 text-secondary'
                    : rsvp.status === 'maybe'
                      ? 'bg-tertiary-container/20 text-tertiary-container'
                      : rsvp.status === 'declined'
                        ? 'bg-error-container/20 text-error'
                        : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {rsvp.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <GearCheckPanel
        groupId={session.groupId}
        sessionId={session.id}
        gearClaims={session.gearClaims}
        viewerId={session.viewerId}
      />

      <MercenarySOSButton
        groupId={session.groupId}
        sessionId={session.id}
        openToMercenaries={session.openToMercenaries}
        spotsNeeded={session.spotsNeeded}
        mercenaryLobbyId={session.mercenaryLobbyId}
        goingCount={goingCount}
      />

      <form onSubmit={(e) => void saveLogistics(e)} className="glass-panel rounded-xl p-6 space-y-6">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-1">Where we&apos;re going</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Agree on the venue so everyone knows where to meet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="destination-name">
              Venue / place
            </label>
            <input
              id="destination-name"
              type="text"
              value={destinationName}
              onChange={(e) => setDestinationName(e.target.value)}
              placeholder="Padel Arena Bratislava"
              className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="destination-address">
              Address
            </label>
            <input
              id="destination-address"
              type="text"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="Račianska 12, Bratislava"
              className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="parking-note">
            Parking
          </label>
          <textarea
            id="parking-note"
            rows={3}
            value={parkingNote}
            onChange={(e) => setParkingNote(e.target.value)}
            placeholder="Free parking behind the building, or use the underground garage on the left."
            className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none resize-none"
          />
        </div>

        <div className="pt-4 border-t border-white/5 space-y-4">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-1">Booking links</h3>
            <p className="font-body-md text-body-md text-on-surface-variant text-sm">
              Link a venue or event so the crew can buy tickets or book courts there.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="venue-link">
                Venue
              </label>
              <select
                id="venue-link"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
              >
                <option value="">No venue linked</option>
                {venueOptions.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-tertiary uppercase" htmlFor="event-link">
                Event (tickets)
              </label>
              <select
                id="event-link"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant/40 rounded-lg px-3 py-2 text-on-surface font-body-md text-body-md focus:border-primary-container focus:outline-none"
              >
                <option value="">No event linked</option>
                {eventOptions.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(selectedVenue || selectedEvent) && (
            <VenueEventBookingLinks
              venueId={venueId || null}
              venueName={selectedVenue?.name ?? session.venueName}
              eventId={eventId || null}
              eventTitle={selectedEvent?.title ?? session.eventTitle}
              compact
            />
          )}
        </div>

        {error && <p className="font-body-md text-body-md text-error">{error}</p>}

        <button
          type="submit"
          disabled={saveState === 'saving'}
          className="w-full py-4 rounded-lg bg-primary-container text-white font-label-caps text-label-caps glow-hover transition-all active:scale-95 disabled:opacity-50"
        >
          {saveState === 'saving' ? 'SAVING…' : 'SAVE COORDINATION DETAILS'}
        </button>
      </form>
    </div>
  );
}
