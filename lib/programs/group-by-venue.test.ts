import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EventCardData } from '@/lib/data/events';
import {
  groupProgramsByVenue,
  slovakProgramCountLabel,
} from './group-by-venue';

function stub(
  partial: Partial<EventCardData> & Pick<EventCardData, 'id' | 'title'>,
): EventCardData {
  return {
    description: null,
    sport: 'OTHER',
    sportType: 'OTHER',
    type: 'community',
    city: 'Bratislava',
    startsAt: new Date('2026-10-01T10:00:00+02:00'),
    endsAt: null,
    timeKnown: false,
    price: 0,
    priceCents: 0,
    currency: 'EUR',
    coverUrl: null,
    status: 'PUBLISHED',
    capacity: null,
    maxParticipants: null,
    registeredCount: 0,
    distanceKm: 1,
    latitude: null,
    longitude: null,
    venueId: null,
    venueName: null,
    themeConfig: {},
    participationMode: 'participate',
    ticketUrl: null,
    sourceUrl: null,
    sourceName: null,
    source: null,
    externalId: null,
    isAggregated: true,
    forKids: true,
    forWomen: false,
    sourceExcerpt: null,
    sourceEvidence: null,
    ...partial,
  };
}

describe('groupProgramsByVenue', () => {
  it('groups by venue name and sorts within group by start', () => {
    const groups = groupProgramsByVenue([
      stub({
        id: '2',
        title: 'Florbal',
        venueName: 'RŠK',
        startsAt: new Date('2026-10-02T10:00:00+02:00'),
      }),
      stub({
        id: '1',
        title: 'Futbal',
        venueName: 'RŠK',
        startsAt: new Date('2026-10-01T10:00:00+02:00'),
      }),
      stub({
        id: '3',
        title: 'Skate',
        venueName: 'HANGAIR',
        distanceKm: 0.5,
      }),
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0]!.venueName, 'HANGAIR');
    assert.equal(groups[1]!.venueName, 'RŠK');
    assert.deepEqual(
      groups[1]!.events.map((e) => e.title),
      ['Futbal', 'Florbal'],
    );
  });

  it('uses venueId over name', () => {
    const groups = groupProgramsByVenue([
      stub({ id: 'a', title: 'A', venueId: 'v1', venueName: 'One' }),
      stub({ id: 'b', title: 'B', venueId: 'v1', venueName: 'Other label' }),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]!.events.length, 2);
  });
});

describe('slovakProgramCountLabel', () => {
  it('conjugates krúžok / tábor / workshop', () => {
    assert.equal(slovakProgramCountLabel(1, 'courses'), '1 krúžok');
    assert.equal(slovakProgramCountLabel(3, 'courses'), '3 krúžky');
    assert.equal(slovakProgramCountLabel(5, 'courses'), '5 krúžkov');
    assert.equal(slovakProgramCountLabel(2, 'camps'), '2 tábory');
    assert.equal(slovakProgramCountLabel(1, 'workshops'), '1 workshop');
  });
});
