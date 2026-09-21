/**
 * Run: npx tsx --test src/lib/scraper/source-evidence.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applySourceEvidence,
  buildSourceEvidence,
  sourceUrlWithTextFragment,
} from './source-evidence';
import type { ScrapedEvent } from './types';

const MOVE_ACADEMY = `
Kalendár
BODYART SUNSET #1
Lektori: Lea Grančič, Oľga Bartalská
MIESTO: NIVY TOWER
27. 9 2026
18:00 – 20:30
DEEPWORK BASIC
Lektori: Lea Grančič – MASTER lektor DEEPWORK
MIESTO: MOVE academy štúdio
WORKSHOP: DEEPWORK INSPIRATION
Lektori: Lea Grančič – MASTER lektor DEEPWORK
Workshop: BODYART SPIRAL
BODYART SUNSET #2
6. 12. 2026
18:30 - 20:30
`;

const ADVANTAGE = `
Tenisová jeseň
26.9. Ukončenie letnej sezóny. Tenisový turnaj žien 9.30-12:30 a Tenisový turnaj v mužskej štvorhre 13:00 – 18:00
`;

function base(partial: Partial<ScrapedEvent>): ScrapedEvent {
  return {
    title: 'WORKSHOP: DEEPWORK INSPIRATION',
    sportType: 'Fitness',
    isTournament: false,
    isGroupClass: false,
    isForWomenOnly: false,
    isForKids: false,
    ageCategory: null,
    startTime: '2026-10-24T09:00:00+02:00',
    timeKnown: true,
    endTime: null,
    locationName: 'MOVE ACADEMY',
    priceText: null,
    description: null,
    originalUrl: 'https://www.moveacademy.sk/',
    ...partial,
  };
}

describe('buildSourceEvidence', () => {
  it('marks Deepwork workshop date/time missing when only title is on the page', () => {
    const ev = buildSourceEvidence(MOVE_ACADEMY, base({}), {
      sourceUrl: 'https://www.moveacademy.sk/',
    });
    assert.equal(ev.fields.title, 'found');
    assert.equal(ev.fields.date, 'missing');
    assert.equal(ev.fields.time, 'missing');
    assert.match(ev.excerpt, /DEEPWORK INSPIRATION/i);
    assert.ok(ev.textFragment.length > 0);
  });

  it('finds date and time for Advantage women tournament', () => {
    const ev = buildSourceEvidence(
      ADVANTAGE,
      base({
        title: 'Tenisový turnaj žien',
        startTime: '2026-09-26T09:30:00+02:00',
        originalUrl: 'https://tenisadvantage.sk/announcements/tenisova-jesen',
      }),
    );
    assert.equal(ev.fields.title, 'found');
    assert.equal(ev.fields.date, 'found');
    assert.equal(ev.fields.time, 'found');
  });
});

describe('applySourceEvidence', () => {
  it('skips Deepwork when date is not on the page', () => {
    const out = applySourceEvidence(MOVE_ACADEMY, [base({})], 'https://www.moveacademy.sk/');
    assert.equal(out.length, 0);
  });

  it('keeps timed Advantage tournament with evidence attached', () => {
    const out = applySourceEvidence(
      ADVANTAGE,
      [
        base({
          title: 'Tenisový turnaj žien',
          startTime: '2026-09-26T09:30:00+02:00',
          timeKnown: true,
          originalUrl: 'https://tenisadvantage.sk/announcements/tenisova-jesen',
        }),
      ],
      'https://tenisadvantage.sk/announcements/tenisova-jesen',
    );
    assert.equal(out.length, 1);
    assert.equal(out[0]!.timeKnown, true);
    assert.equal(out[0]!.sourceEvidence?.fields.time, 'found');
    assert.ok(out[0]!.sourceExcerpt);
  });

  it('keeps weekly schedule class when title+time on page without absolute date', () => {
    const rozvrh = `
Pondelok
Pilates 18:00
Utorok
TRX 19:00
Streda
Jumping 17:30
Štvrtok
Deepwork 18:00
Piatok
Tabata 18:30
`;
    const out = applySourceEvidence(
      rozvrh,
      [
        base({
          title: 'Pilates',
          startTime: '2026-09-21T18:00:00+02:00', // Monday
          timeKnown: true,
          isGroupClass: true,
          originalUrl: 'http://www.fitworld.sk/rozvrh',
        }),
      ],
      'http://www.fitworld.sk/rozvrh',
    );
    assert.equal(out.length, 1);
    assert.equal(out[0]!.title, 'Pilates');
  });

  it('builds text-fragment verify URL', () => {
    const url = sourceUrlWithTextFragment(
      'https://www.moveacademy.sk/',
      'WORKSHOP%3A%20DEEPWORK',
    );
    assert.match(url, /#:~:text=/);
  });
});
