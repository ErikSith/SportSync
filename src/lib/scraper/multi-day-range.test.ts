/**
 * Run: npx tsx --test src/lib/scraper/multi-day-range.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMultiDayDateRanges,
  parseMultiDayRangesFromText,
} from './multi-day-range';
import { groundScrapedEventDates } from './ground-dates';
import type { ScrapedEvent } from './types';

const LATINKY = `
október 2026
So 24
Cuban Bratislava Weekend
24 októbra - 25 októbra
Dance Club Salsa by Norika

november 2026
Št 5
All Stars Festival
5 novembra - 9 novembra
Verdi Budapest Aquincum
Bachata, UrbanKiz, Kizomba, Zouk
`;

function base(partial: Partial<ScrapedEvent>): ScrapedEvent {
  return {
    title: 'All Stars Festival',
    sportType: 'Tanec',
    isTournament: false,
    isGroupClass: false,
    isForWomenOnly: false,
    isForKids: false,
    ageCategory: null,
    startTime: '2026-11-05T12:00:00+01:00',
    timeKnown: false,
    endTime: null,
    locationName: 'Budapest',
    priceText: null,
    description: null,
    originalUrl: 'http://www.latinky.sk/events',
    ...partial,
  };
}

describe('multi-day festival ranges', () => {
  it('parses Latinky-style "5 novembra - 9 novembra"', () => {
    const ranges = parseMultiDayRangesFromText(LATINKY, 2026);
    assert.ok(ranges.some((r) => {
      const s = r.start.toLocaleString('en-GB', {
        timeZone: 'Europe/Bratislava',
        day: '2-digit',
        month: '2-digit',
      });
      const e = r.end.toLocaleString('en-GB', {
        timeZone: 'Europe/Bratislava',
        day: '2-digit',
        month: '2-digit',
      });
      return s === '05/11' && e === '09/11';
    }));
  });

  it('fills endTime when LLM kept only the first festival day', () => {
    const out = applyMultiDayDateRanges(LATINKY, [
      base({ endTime: null, timeKnown: false }),
    ]);
    assert.ok(out[0]!.endTime);
    const endDay = new Date(out[0]!.endTime!).toLocaleString('en-GB', {
      timeZone: 'Europe/Bratislava',
      day: '2-digit',
      month: '2-digit',
    });
    assert.equal(endDay, '09/11');
  });

  it('groundScrapedEventDates recovers range even if date-only pass runs first', () => {
    const out = groundScrapedEventDates(LATINKY, [
      base({
        startTime: '2026-11-05T10:00:00+01:00',
        endTime: null,
        timeKnown: true,
      }),
    ]);
    assert.equal(out[0]!.timeKnown, false);
    assert.ok(out[0]!.endTime);
    const endDay = new Date(out[0]!.endTime!).toLocaleString('en-GB', {
      timeZone: 'Europe/Bratislava',
      day: '2-digit',
      month: '2-digit',
    });
    assert.equal(endDay, '09/11');
  });

  it('parses compact "5.–9. novembra"', () => {
    const ranges = parseMultiDayRangesFromText('Festival 5.–9. novembra 2026', 2026);
    assert.equal(ranges.length, 1);
    assert.ok(ranges[0]);
  });

  it('does not overwrite an existing later endTime', () => {
    const out = applyMultiDayDateRanges(LATINKY, [
      base({ endTime: '2026-11-09T12:00:00+01:00' }),
    ]);
    assert.equal(out[0]!.endTime, '2026-11-09T12:00:00+01:00');
  });
});
