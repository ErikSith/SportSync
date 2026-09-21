/**
 * Run: npx tsx --test src/lib/scraper/date-only-time.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyDateOnlyTimeUnknown, dateOnlyTitlesFromText } from './date-only-time';
import type { ScrapedEvent } from './types';

const TK_SLOVAN = `
26.9. Rozlúčka so sezónou
PO - PIA 8:00 - 20:00 SO 8:00 - 17:00
`;

function base(partial: Partial<ScrapedEvent>): ScrapedEvent {
  return {
    title: 'Rozlúčka so sezónou',
    sportType: 'Tenis',
    isTournament: false,
    isGroupClass: false,
    isForWomenOnly: false,
    isForKids: false,
    ageCategory: null,
    startTime: '2026-09-26T10:00:00+02:00',
    timeKnown: true,
    endTime: null,
    locationName: 'TK Slovan',
    priceText: null,
    description: null,
    originalUrl: 'http://tkslovan.sk/',
    ...partial,
  };
}

describe('date-only time unknown', () => {
  it('detects date-only calendar titles despite opening hours elsewhere', () => {
    const titles = dateOnlyTitlesFromText(TK_SLOVAN);
    assert.ok([...titles].some((t) => t.includes('rozlucka')));
  });

  it('collapses invented 10:00 and 14:00 into one date-only event', () => {
    const out = applyDateOnlyTimeUnknown(TK_SLOVAN, [
      base({ startTime: '2026-09-26T10:00:00+02:00' }),
      base({ startTime: '2026-09-26T14:00:00+02:00' }),
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0]!.timeKnown, false);
    assert.equal(out[0]!.endTime, null);
    // Noon Bratislava sort anchor (± DST)
    const hour = new Date(out[0]!.startTime).toLocaleString('en-GB', {
      timeZone: 'Europe/Bratislava',
      hour: '2-digit',
      hourCycle: 'h23',
    });
    assert.equal(hour, '12');
  });

  it('keeps multi-day festival end date when time is unknown', () => {
    const out = applyDateOnlyTimeUnknown('All Stars Festival', [
      base({
        title: 'All Stars Festival',
        startTime: '2026-11-05T12:00:00+01:00',
        endTime: '2026-11-09T12:00:00+01:00',
        timeKnown: false,
      }),
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0]!.timeKnown, false);
    assert.ok(out[0]!.endTime);
    const endDay = new Date(out[0]!.endTime!).toLocaleString('en-GB', {
      timeZone: 'Europe/Bratislava',
      day: '2-digit',
      month: '2-digit',
    });
    assert.equal(endDay, '09/11');
  });

  it('keeps explicit timed tournaments', () => {
    const text = '26.9. Tenisový turnaj žien 9.30-12:30';
    const out = applyDateOnlyTimeUnknown(text, [
      base({
        title: 'Tenisový turnaj žien',
        startTime: '2026-09-26T09:30:00+02:00',
        timeKnown: true,
      }),
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0]!.timeKnown, true);
  });
});
