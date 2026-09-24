/**
 * Run: npx tsx --test lib/scrape/news-result.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeNewsListingNoiseTitle,
  looksLikeNewsOrResultTitle,
  sourceUrlLooksLikeNewsArticle,
} from './news-result';

describe('looksLikeNewsOrResultTitle', () => {
  it('rejects STZ result headlines', () => {
    assert.equal(looksLikeNewsOrResultTitle('Pohánková postúpila do osmičky'), true);
    assert.equal(looksLikeNewsOrResultTitle('Morvayová v Singapure vypadla'), true);
    assert.equal(
      looksLikeNewsOrResultTitle('Šramková prehrala v Singapure s Chwalinskou'),
      true,
    );
    assert.equal(looksLikeNewsOrResultTitle('ME U18: Šupová získala striebro!'), true);
  });

  it('rejects listing chrome', () => {
    assert.equal(looksLikeNewsListingNoiseTitle('AKTUALITY / News'), true);
    assert.equal(looksLikeNewsOrResultTitle('Čítať viac'), true);
  });

  it('keeps real joinable / watchable events', () => {
    assert.equal(looksLikeNewsOrResultTitle('ITF J30 Bratislava Open'), false);
    assert.equal(
      looksLikeNewsOrResultTitle('Davis Cup: vstupenky v predpredaji'),
      false,
    );
    assert.equal(
      looksLikeNewsOrResultTitle(
        'Pohánková v Porte',
        'Uzávierka prihlášok 12. 10. Turnaj sa uskutoční od 15. októbra.',
      ),
      false,
    );
  });
});

describe('sourceUrlLooksLikeNewsArticle', () => {
  it('detects aktuality paths', () => {
    assert.equal(
      sourceUrlLooksLikeNewsArticle(
        'http://www.stz.sk/aktuality/pohankova-postupila-do-osmicky',
      ),
      true,
    );
    assert.equal(
      sourceUrlLooksLikeNewsArticle('https://arenapadel.sk/turnaje'),
      false,
    );
  });
});
