/**
 * Run: npx tsx --test lib/retention/feed-window.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isListingStillActive } from './feed-window';

describe('isListingStillActive', () => {
  it('hides listings whose start day is before today', () => {
    const now = new Date('2026-09-22T14:00:00+02:00');
    assert.equal(
      isListingStillActive('2026-09-10T17:20:00+02:00', null, now),
      false,
    );
  });

  it('keeps listings that start later today', () => {
    const now = new Date('2026-09-22T14:00:00+02:00');
    assert.equal(
      isListingStillActive('2026-09-22T18:00:00+02:00', null, now),
      true,
    );
  });

  it('keeps multi-day ranges until the end day', () => {
    const now = new Date('2026-09-22T14:00:00+02:00');
    assert.equal(
      isListingStillActive(
        '2026-09-20T09:00:00+02:00',
        '2026-09-25T18:00:00+02:00',
        now,
      ),
      true,
    );
    assert.equal(
      isListingStillActive(
        '2026-09-10T09:00:00+02:00',
        '2026-09-12T18:00:00+02:00',
        now,
      ),
      false,
    );
  });
});
