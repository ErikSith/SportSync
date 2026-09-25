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

  it('returns null for sports / tabs without art yet', () => {
    assert.equal(sportAvatarUrl('tournament', 'TENNIS'), null);
    assert.equal(sportAvatarUrl('event', 'PADEL'), null);
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
    assert.equal(isSportAvatarUrl('https://cdn.example/x.jpg'), false);
  });
});
