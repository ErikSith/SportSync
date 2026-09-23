import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isMixedScrapePageKind,
  normalizeScrapePageKindInput,
  parseScrapePageKinds,
  scrapePageHasKind,
  serializeScrapePageKinds,
  shouldForceForKidsFromScrapePage,
  shouldSkipEventExtractForKind,
} from './scrape-page-kind';
import { shouldForceGroupClassFromScrapePage } from '../feed/group-class';

describe('scrape-page-kind', () => {
  it('parses and serializes multi-kinds stably', () => {
    assert.deepEqual(parseScrapePageKinds('events,schedule,tournaments'), [
      'schedule',
      'events',
      'tournaments',
    ]);
    assert.equal(
      serializeScrapePageKinds(['tournaments', 'schedule', 'events']),
      'schedule,events,tournaments',
    );
  });

  it('accepts mixed alias and aliases like rozvrh', () => {
    assert.equal(
      normalizeScrapePageKindInput('mixed'),
      'schedule,events,tournaments',
    );
    assert.deepEqual(parseScrapePageKinds('rozvrh,akcie'), ['schedule', 'events']);
  });

  it('detects mixed content roles', () => {
    assert.equal(isMixedScrapePageKind('schedule'), false);
    assert.equal(isMixedScrapePageKind('schedule,events'), true);
    assert.equal(isMixedScrapePageKind('schedule,tournaments'), true);
  });

  it('skips event extract only for pure availability', () => {
    assert.equal(shouldSkipEventExtractForKind('availability'), true);
    assert.equal(shouldSkipEventExtractForKind('availability,schedule'), false);
  });

  it('forceForKids when kids_camps or kids_clubs is among kinds', () => {
    assert.equal(shouldForceForKidsFromScrapePage('kids_camps'), true);
    assert.equal(shouldForceForKidsFromScrapePage('kids_clubs'), true);
    assert.equal(shouldForceForKidsFromScrapePage('schedule,kids_camps'), true);
    assert.equal(shouldForceForKidsFromScrapePage('schedule'), false);
  });

  it('does not force group-class on mixed schedule+events', () => {
    assert.equal(
      shouldForceGroupClassFromScrapePage('schedule', 'https://x.sk/foo'),
      true,
    );
    assert.equal(
      shouldForceGroupClassFromScrapePage(
        'schedule,events',
        'https://x.sk/treningy-a-skupinove-cvicenia/',
      ),
      false,
    );
    assert.equal(
      shouldForceGroupClassFromScrapePage('tournaments', 'https://x.sk/rozvrh'),
      false,
    );
    assert.equal(
      shouldForceGroupClassFromScrapePage('kids_clubs', 'https://x.sk/kruzky'),
      true,
    );
    assert.equal(
      shouldForceGroupClassFromScrapePage('kids_camps', 'https://x.sk/tabory'),
      false,
    );
    assert.equal(
      shouldForceGroupClassFromScrapePage('workshops', 'https://x.sk/workshopy'),
      false,
    );
  });

  it('parses kids_clubs and workshops aliases', () => {
    assert.deepEqual(parseScrapePageKinds('detske-kruzky'), ['kids_clubs']);
    assert.deepEqual(parseScrapePageKinds('kruzky'), ['kids_clubs']);
    assert.deepEqual(parseScrapePageKinds('workshopy'), ['workshops']);
  });

  it('scrapePageHasKind matches members of multi-kind', () => {
    assert.equal(scrapePageHasKind('schedule,events', 'schedule'), true);
    assert.equal(scrapePageHasKind('schedule,events', 'events'), true);
    assert.equal(scrapePageHasKind('schedule,events', 'tournaments'), false);
  });
});
