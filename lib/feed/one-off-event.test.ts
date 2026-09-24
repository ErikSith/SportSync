/**
 * Run: npx tsx --test lib/feed/one-off-event.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeOneOffSpecialEvent,
  looksLikeGroupClassListing,
} from './group-class';
import { belongsOnEventsMatchesTab } from './aggregate-routine-lessons';
import type { EventCardData } from '@/lib/data/events';

function card(partial: Partial<EventCardData>): EventCardData {
  return {
    id: '1',
    title: 'Test',
    description: null,
    sport: 'OTHER',
    sportType: 'OTHER',
    type: 'official',
    city: 'Bratislava',
    startsAt: new Date('2026-10-01T10:00:00+02:00'),
    endsAt: null,
    timeKnown: true,
    price: 0,
    priceCents: 0,
    currency: 'EUR',
    coverUrl: null,
    status: 'open',
    capacity: 20,
    maxParticipants: null,
    registeredCount: 0,
    distanceKm: 0,
    latitude: 48.15,
    longitude: 17.1,
    venueId: null,
    venueName: null,
    themeConfig: {},
    participationMode: 'participate',
    ticketUrl: null,
    sourceUrl: null,
    sourceName: null,
    source: 'gemini-web',
    externalId: 'abc',
    isAggregated: true,
    forKids: false,
    forWomen: false,
    sourceExcerpt: null,
    sourceEvidence: null,
    ...partial,
  };
}

describe('looksLikeOneOffSpecialEvent', () => {
  it('keeps marathon / Red Bull / dance nights', () => {
    assert.equal(looksLikeOneOffSpecialEvent('Bratislava Marathon 2026'), true);
    assert.equal(looksLikeOneOffSpecialEvent('Red Bull Dance Battle Eurovea'), true);
    assert.equal(looksLikeOneOffSpecialEvent('Tanečná party na Námestí'), true);
  });

  it('rejects news and weekly classes', () => {
    assert.equal(looksLikeOneOffSpecialEvent('Pohánková postúpila do osmičky'), false);
    assert.equal(looksLikeOneOffSpecialEvent('Ranný pilates'), false);
  });
});

describe('belongsOnEventsMatchesTab', () => {
  it('shows marathon on Eventy, hides pilates and STZ news', () => {
    assert.equal(
      belongsOnEventsMatchesTab(card({ title: 'Bratislava Marathon' })),
      true,
    );
    assert.equal(
      belongsOnEventsMatchesTab(
        card({ title: 'Ranný pilates', externalId: 'class-deadbeef' }),
      ),
      false,
    );
    assert.equal(
      belongsOnEventsMatchesTab(
        card({
          title: 'Morvayová v Singapure vypadla',
          sourceUrl: 'http://www.stz.sk/aktuality/x',
        }),
      ),
      false,
    );
  });

  it('keeps community and spectator fixtures', () => {
    assert.equal(
      belongsOnEventsMatchesTab(card({ type: 'community', title: 'Lobby padel' })),
      true,
    );
    assert.equal(
      belongsOnEventsMatchesTab(
        card({
          title: 'FC Petržalka - MŠK Žilina B',
          participationMode: 'spectator',
        }),
      ),
      true,
    );
  });
});

describe('group class vs one-off', () => {
  it('pilates is group class, marathon is not', () => {
    assert.equal(
      looksLikeGroupClassListing({ title: 'Pilates Midday' }),
      true,
    );
    assert.equal(
      looksLikeGroupClassListing({ title: 'Bratislava Marathon' }),
      false,
    );
  });
});
