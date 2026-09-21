import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { foldDiacritics } from '@/lib/text/fold-diacritics';

describe('foldDiacritics', () => {
  it('folds Slovak diacritics for venue search', () => {
    assert.equal(
      foldDiacritics('Národné tenisové centrum Bratislava'),
      'narodne tenisove centrum bratislava',
    );
    assert.equal(foldDiacritics('Narodne Tenisove Centr'), 'narodne tenisove centr');
    assert.ok(
      foldDiacritics('Národné tenisové centrum Bratislava').includes(
        foldDiacritics('Narodne Tenisove Centr').split(/\s+/)[0]!,
      ),
    );
  });
});
