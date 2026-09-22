/**
 * Run: npx tsx --test lib/cities-outside-ba.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  listingIsOutsideBratislava,
  pageContextIsOutsideBratislava,
  titleIsOutsideBratislava,
} from '@/lib/cities';

describe('titleIsOutsideBratislava', () => {
  it('flags Form Factory Piatkovica in Banská Bystrica (glued title)', () => {
    assert.equal(
      titleIsOutsideBratislava('Piatkovica — EUROPA BCBanská Bystrica'),
      true,
    );
  });

  it('flags EUROPA BC without city name', () => {
    assert.equal(titleIsOutsideBratislava('Piatkovica — EUROPA BC'), true);
  });

  it('keeps Bratislava Form Factory venues', () => {
    assert.equal(titleIsOutsideBratislava('Piatkovica — Farského'), false);
    assert.equal(titleIsOutsideBratislava('Piatkovica — OC Nivy'), false);
    assert.equal(titleIsOutsideBratislava('TK Slovan Bratislava'), false);
  });

  it('flags Košice even when Bratislava brand also appears', () => {
    assert.equal(
      titleIsOutsideBratislava('365 Fit&Co Bratislava oznamuje Grand Prix Košice'),
      true,
    );
  });
});

describe('listingIsOutsideBratislava', () => {
  it('rejects when city field is Košice', () => {
    assert.equal(
      listingIsOutsideBratislava('365 Grand Prix 2026', 'Košice', '365 Fit&Co'),
      true,
    );
  });

  it('keeps Bratislava city', () => {
    assert.equal(
      listingIsOutsideBratislava('Ronnie Coleman', 'Bratislava', 'Eurovea'),
      false,
    );
  });
});

describe('pageContextIsOutsideBratislava', () => {
  it('reads city from the same line as the title (Fit&Co pattern)', () => {
    const page =
      'Pripravujeme: 365 Grand Prix 2026, 24.-25.10.2026, Košice\n' +
      'Udialo sa: Ronnie Coleman v Bratislave';
    assert.equal(
      pageContextIsOutsideBratislava(page, '365 Grand Prix 2026'),
      true,
    );
    assert.equal(
      pageContextIsOutsideBratislava(page, 'Ronnie Coleman v Bratislave'),
      false,
    );
  });
});
