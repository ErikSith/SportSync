import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  categoryFromFlags,
  flagsFromCategory,
  syncCategoryAndFlags,
  parseEventCategory,
} from './category';
import { discoverDetailLinksFromHtml } from './browser';

describe('event category mapping', () => {
  it('maps all 6 categories to mutually exclusive flags', () => {
    assert.deepEqual(flagsFromCategory('TURNAJ').isTournament, true);
    assert.deepEqual(flagsFromCategory('SKUPINOVE_CVICENIE').isGroupClass, true);
    assert.deepEqual(flagsFromCategory('WORKSHOP').isWorkshop, true);
    assert.deepEqual(flagsFromCategory('DETSKY_TABOR').isCamp, true);
    assert.deepEqual(flagsFromCategory('DETSKY_KRUZOK').isCourse, true);
    assert.deepEqual(flagsFromCategory('PODUJATIE'), {
      isTournament: false,
      isGroupClass: false,
      isCamp: false,
      isWorkshop: false,
      isCourse: false,
    });
  });

  it('infers DETSKY_TABOR / DETSKY_KRUZOK from titles', () => {
    assert.equal(
      categoryFromFlags({ title: 'Letný tábor plávanie', isForKids: true }),
      'DETSKY_TABOR',
    );
    assert.equal(
      categoryFromFlags({ title: 'Plavecký krúžok U8', isForKids: true }),
      'DETSKY_KRUZOK',
    );
  });

  it('sync forces isForKids on kids categories', () => {
    const synced = syncCategoryAndFlags({
      title: 'Junior camp',
      category: 'DETSKY_TABOR' as const,
      isTournament: false,
      isGroupClass: false,
      isCamp: false,
      isWorkshop: false,
      isCourse: false,
      isForKids: false,
    });
    assert.equal(synced.category, 'DETSKY_TABOR');
    assert.equal(synced.isCamp, true);
    assert.equal(synced.isForKids, true);
  });

  it('parses category aliases', () => {
    assert.equal(parseEventCategory('tournament'), 'TURNAJ');
    assert.equal(parseEventCategory('DETSKY_KRUZOK'), 'DETSKY_KRUZOK');
    assert.equal(parseEventCategory('nope'), null);
  });
});

describe('discoverDetailLinksFromHtml', () => {
  it('finds card links under listing path and skips noise', () => {
    const html = `
      <html><body>
        <a href="/program/kruzky/plavanie-u8">Plavecký krúžok</a>
        <a href="/kontakt">Kontakt</a>
        <a href="https://other.example/event">External</a>
        <div data-href="/program/tabory/letny-2026"><img alt="Letný tábor" /></div>
      </body></html>
    `;
    const links = discoverDetailLinksFromHtml(
      html,
      'https://venue.example/program/kruzky',
    );
    const urls = links.map((l) => l.url);
    assert.ok(urls.some((u) => u.includes('/plavanie-u8')));
    assert.ok(urls.some((u) => u.includes('/letny-2026')));
    assert.ok(!urls.some((u) => u.includes('/kontakt')));
    assert.ok(!urls.some((u) => u.includes('other.example')));
  });
});
