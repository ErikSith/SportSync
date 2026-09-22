import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { htmlToCleanText, htmlToCleanTextDetailed } from './fetcher';

describe('htmlToCleanText preferredSelector', () => {
  const html = `
    <html><body>
      <nav>Menu turnaj liga</nav>
      <main>
        <p>${'x'.repeat(50)}</p>
        <div class="events-list">
          <h2>Turnaj padel</h2>
          <p>${'Turnaj text '.repeat(20)}</p>
        </div>
      </main>
      <footer>Kontakt</footer>
    </body></html>
  `;

  it('uses preferred selector when it has enough text', () => {
    const result = htmlToCleanTextDetailed(html, '.events-list');
    assert.equal(result.preferredMatched, true);
    assert.equal(result.usedSelector, '.events-list');
    assert.match(result.text, /Turnaj padel/);
    assert.ok(result.text.length >= 40);
  });

  it('falls back to main when preferred misses', () => {
    const result = htmlToCleanTextDetailed(html, '.missing-zone');
    assert.equal(result.preferredMatched, false);
    assert.equal(result.usedSelector, 'main');
    assert.ok(result.text.length >= 40);
  });

  it('htmlToCleanText returns string with preferred', () => {
    const text = htmlToCleanText(html, '.events-list');
    assert.match(text, /Turnaj padel/);
  });
});
