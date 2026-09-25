import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isSportAvatarUrl,
  resolveTabCover,
  sportAvatarUrl,
} from '@/lib/media/sport-avatars';

describe('sportAvatarUrl', () => {
  it('maps tournament + padel to the shipped avatar', () => {
    assert.equal(sportAvatarUrl('tournament', 'PADEL'), '/avatars/tournament/padel.png');
    assert.equal(sportAvatarUrl('tournament', 'padel'), '/avatars/tournament/padel.png');
  });

  it('maps event + padel to the gepard avatar', () => {
    assert.equal(sportAvatarUrl('event', 'PADEL'), '/avatars/event/padel.jpg');
    assert.equal(sportAvatarUrl('event', 'padel'), '/avatars/event/padel.jpg');
  });

  it('maps workshop + yoga (and joga alias) to the shipped avatar', () => {
    assert.equal(sportAvatarUrl('workshop', 'YOGA'), '/avatars/workshop/yoga.png');
    assert.equal(sportAvatarUrl('workshop', 'joga'), '/avatars/workshop/yoga.png');
  });

  it('returns null for sports / tabs without art yet', () => {
    assert.equal(sportAvatarUrl('tournament', 'TENNIS'), null);
    assert.equal(sportAvatarUrl('event', 'TENNIS'), null);
    assert.equal(sportAvatarUrl('workshop', 'PADEL'), null);
  });
});

describe('resolveTabCover', () => {
  it('uses the tournament padel avatar even when a cover exists', () => {
    assert.equal(
      resolveTabCover({
        tab: 'tournament',
        sport: 'PADEL',
        coverUrl: 'https://cdn.example/cup.jpg',
      }),
      '/avatars/tournament/padel.png',
    );
  });

  it('uses the event padel gepard even when a cover exists', () => {
    assert.equal(
      resolveTabCover({
        tab: 'event',
        sport: 'PADEL',
        coverUrl: 'https://cdn.example/court.jpg',
      }),
      '/avatars/event/padel.jpg',
    );
  });

  it('uses the workshop yoga avatar even when a cover exists', () => {
    assert.equal(
      resolveTabCover({
        tab: 'workshop',
        sport: 'YOGA',
        coverUrl: 'https://cdn.example/studio.jpg',
      }),
      '/avatars/workshop/yoga.png',
    );
  });

  it('keeps organizer cover when no avatar is shipped for that sport', () => {
    assert.equal(
      resolveTabCover({
        tab: 'tournament',
        sport: 'TENNIS',
        coverUrl: 'https://cdn.example/cup.jpg',
      }),
      'https://cdn.example/cup.jpg',
    );
  });

  it('uses the tournament padel avatar when cover is missing', () => {
    assert.equal(
      resolveTabCover({ tab: 'tournament', sport: 'PADEL', coverUrl: null }),
      '/avatars/tournament/padel.png',
    );
  });
});

describe('isSportAvatarUrl', () => {
  it('detects local mascot paths', () => {
    assert.equal(isSportAvatarUrl('/avatars/tournament/padel.png'), true);
    assert.equal(isSportAvatarUrl('/avatars/event/padel.jpg'), true);
    assert.equal(isSportAvatarUrl('/avatars/workshop/yoga.png'), true);
    assert.equal(isSportAvatarUrl('https://cdn.example/x.jpg'), false);
  });
});
