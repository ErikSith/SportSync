import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  discoverCardDetailLinks,
  discoverDetailUrls,
  matchDetailUrl,
} from './detail-enrich';

describe('discoverDetailUrls', () => {
  it('finds gopass /e- event links', () => {
    const html = `
      <a href="/e-22427/harlem-globetrotters-100-vyrocie">HARLEM GLOBETROTTERS</a>
      <a href="/o-nas">O nás</a>
    `;
    const links = discoverDetailUrls(html, 'https://gopassarena.sk/');
    assert.ok(links.some((l) => l.url.includes('/e-22427/')));
    assert.ok(!links.some((l) => l.url.includes('/o-nas')));
  });

  it('finds kids club card children under listing path', () => {
    const html = `
      <main>
        <a href="/kruzky-a-kurzy/curling-kruzok"><img alt="Curling krúžok" /></a>
        <a href="/kruzky-a-kurzy/tenisovy-kruzok">Tenisový krúžok</a>
        <a href="/kontakty">Kontakty</a>
      </main>
    `;
    const links = discoverCardDetailLinks(
      html,
      'https://www.rskruzinov.sk/kruzky-a-kurzy',
    );
    assert.equal(links.length, 2);
    assert.ok(links.some((l) => l.url.includes('curling-kruzok')));
    assert.equal(
      links.find((l) => l.url.includes('curling'))?.anchorText,
      'Curling krúžok',
    );
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
