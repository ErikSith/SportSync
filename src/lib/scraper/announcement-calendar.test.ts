/**
 * Expectations for Slovak announcement-calendar splitting (high recall).
 * Run: npx tsx --test src/lib/scraper/announcement-calendar.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeAnnouncementCalendar,
  splitAnnouncementCalendar,
} from './announcement-calendar';

const TENISOVA_JESEN = `
Tenisová jeseň

Dôležité dátumy, ktoré Vás budú zaujímať na jeseň

26.9. Ukončenie letnej sezóny. Tenisový turnaj žien 9.30-12:30 a Tenisový turnaj v mužskej štvorhre 13:00 – 18:00

27.9. Brigáda pred zimnou sezónou 14:00-18:00

28.9. Stavanie nafukovacej haly

29.9. Začiatok zimnej sezóny

29.10-1.11 Jesenné prázdniny
`;

describe('splitAnnouncementCalendar', () => {
  it('splits women + men doubles into two tournaments on the same day', () => {
    const now = new Date('2026-09-21T12:00:00+02:00');
    const events = splitAnnouncementCalendar(TENISOVA_JESEN, {
      now,
      seriesTitle: 'Tenisová jeseň',
    });

    assert.equal(events.length, 2);

    const women = events.find((e) => e.isForWomenOnly);
    const men = events.find((e) => !e.isForWomenOnly);
    assert.ok(women, 'women tournament missing');
    assert.ok(men, 'men doubles tournament missing');

    assert.equal(women.day, 26);
    assert.equal(women.month, 9);
    assert.equal(women.year, 2026);
    assert.equal(women.startHour, 9);
    assert.equal(women.startMinute, 30);
    assert.equal(women.endHour, 12);
    assert.equal(women.endMinute, 30);
    assert.equal(women.isTournament, true);
    assert.match(women.title, /turnaj|žien|zien/i);
    assert.equal(women.sportType, 'Tenis');

    assert.equal(men.day, 26);
    assert.equal(men.month, 9);
    assert.equal(men.startHour, 13);
    assert.equal(men.startMinute, 0);
    assert.equal(men.endHour, 18);
    assert.equal(men.endMinute, 0);
    assert.equal(men.isTournament, true);
    assert.equal(men.formatHint, 'doubles');
    assert.match(men.title, /štvorhr|stvorhr|mužsk|muzsk/i);
  });

  it('skips brigáda, stavanie haly, prázdniny and season start', () => {
    const events = splitAnnouncementCalendar(TENISOVA_JESEN, {
      now: new Date('2026-09-21T12:00:00+02:00'),
    });
    const hay = events.map((e) => e.title.toLowerCase()).join(' | ');
    assert.equal(/brigád|stavanie|prázdnin|začiatok zimnej/i.test(hay), false);
  });

  it('detects announcement calendar shape', () => {
    assert.equal(looksLikeAnnouncementCalendar(TENISOVA_JESEN), true);
    assert.equal(looksLikeAnnouncementCalendar('Vitajte na kurtoch Advantage'), false);
  });
});
