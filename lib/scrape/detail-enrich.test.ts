/**
 * Expectations for detail URL discovery / title match.
 * Run: npx tsx --test lib/scrape/detail-enrich.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { discoverDetailUrls, matchDetailUrl } from './detail-enrich';

describe('discoverDetailUrls', () => {
  it('finds gopass /e- event links', () => {
    const html = `
      <a href="/e-22427/harlem-globetrotters-100-vyrocie">HARLEM GLOBETROTTERS</a>
      <a href="/o-nas">O nás</a>
    `;
    const links = discoverDetailUrls(html, 'https://gopassarena.sk/');
    assert.ok(links.some((l) => l.url.includes('/e-22427/')));
  });
});

describe('matchDetailUrl', () => {
  it('matches Harlem title to detail slug', () => {
    const url = matchDetailUrl('HARLEM GLOBETROTTERS - 100. výročie', [
      {
        url: 'https://gopassarena.sk/e-22427/harlem-globetrotters-100-vyrocie',
        anchorText: 'HARLEM GLOBETROTTERS - 100. výročie',
      },
      {
        url: 'https://gopassarena.sk/e-1/bc-slovan',
        anchorText: 'BC Slovan',
      },
    ]);
    assert.equal(
      url,
      'https://gopassarena.sk/e-22427/harlem-globetrotters-100-vyrocie',
    );
  });
});
