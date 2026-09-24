import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyProgramSignals,
  parseProgramsFeedTab,
  programKindFromScrapePage,
} from './classify';

describe('classifyProgramSignals', () => {
  it('does not treat weekly academy lessons as courses (venue akademia)', () => {
    assert.equal(
      classifyProgramSignals({
        title: 'Stolný tenis',
        description: 'Skupinové cvičenie na športovisku.',
        sourceUrl: 'http://www.treningovaakademia.sk/rozvrh',
        venueName: 'Tréningová akadémia Miletička',
        externalId: 'class-abc',
        isGroupClass: true,
      }),
      null,
    );
    assert.equal(
      classifyProgramSignals({
        title: 'Fitbox (Pokročilí)',
        sourceUrl: 'http://www.treningovaakademia.sk/rozvrh',
        venueName: 'Tréningová akadémia Miletička',
        externalId: 'class-fitbox',
      }),
      null,
    );
    assert.equal(
      classifyProgramSignals({
        title: 'Pole Dance',
        sourceUrl: 'http://www.nolimitsgym.sk/rozvrh',
        externalId: 'class-pole',
      }),
      null,
    );
  });

  it('does not treat for-kids weekly classes as camps', () => {
    assert.equal(
      classifyProgramSignals({
        title: 'Zápasenie (Lohyňa Wrestling Academy)',
        sourceUrl: 'http://www.treningovaakademia.sk/rozvrh',
        externalId: 'class-zapas',
        isGroupClass: true,
      }),
      null,
    );
  });

  it('keeps named workshops in workshops', () => {
    assert.equal(
      classifyProgramSignals({
        title: 'WORKSHOP: DEEPWORK INSPIRATION',
        sourceUrl: 'https://www.moveacademy.sk/',
        externalId: 'dee7c144e93c5e30',
      }),
      'workshops',
    );
  });

  it('classifies multi-day camps from title or kids_camps page', () => {
    assert.equal(
      classifyProgramSignals({
        title: 'Futbalový tábor 2026',
        sourceUrl: 'https://summercamp.sk/kurzy/futbalovy-tabor-2026/',
      }),
      'camps',
    );
    assert.equal(
      classifyProgramSignals({
        title: 'Denný plavecký tábor',
        scrapePageKind: 'kids_camps',
      }),
      'camps',
    );
  });

  it('does not treat FitCamp group classes as camps', () => {
    assert.equal(
      classifyProgramSignals({
        title: 'Spinning',
        sourceUrl: 'https://fitcamp.formfactory.sk/calendar',
        venueName: 'Form Factory FitCamp',
        externalId: 'ff-class-377',
      }),
      null,
    );
  });

  it('keeps weekly "kurz" studio slots as lessons, not courses', () => {
    assert.equal(
      classifyProgramSignals({
        title: 'Thajský box pre ženy - Stronger kurz',
        description: 'Skupinové cvičenie na športovisku.',
        sourceUrl: 'http://www.ladiesthaibox.sk/',
        externalId: 'class-d54c44',
        isGroupClass: true,
      }),
      null,
    );
  });

  it('ignores wrongly stored programKind on weekly gym slots', () => {
    assert.equal(
      classifyProgramSignals({
        title: 'Basic kurz',
        sourceUrl: 'http://www.ladiesthaibox.sk/treningy',
        externalId: 'class-5fe6c9',
        themeProgramKind: 'courses',
        isGroupClass: true,
      }),
      null,
    );
    assert.equal(
      classifyProgramSignals({
        title: 'Badmintonový tréning - Skupina A',
        sourceUrl: 'https://badmintonland.sk/klub/treningy',
        externalId: 'class-cef0b5',
        themeProgramKind: 'courses',
      }),
      null,
    );
    assert.equal(
      classifyProgramSignals({
        title: 'FC Petržalka vs OFK Dynamo Malženice',
        themeProgramKind: 'courses',
      }),
      null,
    );
    assert.equal(
      classifyProgramSignals({
        title: 'Turnaje',
        themeProgramKind: 'camps',
      }),
      null,
    );
    assert.equal(
      classifyProgramSignals({
        title: 'Rafting',
        sourceUrl: 'https://www.divokavoda.sk/aktivity-sport/rafting-cunovo',
        themeProgramKind: 'courses',
      }),
      null,
    );
    assert.equal(
      classifyProgramSignals({
        title: 'Basketbalová prípravka - ZŠ Vazovova',
        themeProgramKind: 'courses',
      }),
      'courses',
    );
  });

  it('classifies a structured course that is not a weekly class', () => {
    assert.equal(
      classifyProgramSignals({
        title: 'Kurz plávania pre začiatočníkov (8 týždňov)',
        sourceUrl: 'https://example.sk/kurzy/plavanie',
        externalId: 'abc123',
        isGroupClass: false,
      }),
      'courses',
    );
  });

  it('classifies seasonal kids clubs as courses (Programs → Krúžky)', () => {
    assert.equal(
      classifyProgramSignals({
        title: 'Curling krúžok',
        sourceUrl: 'https://www.rskruzinov.sk/kruzky-a-kurzy/curling-kruzok',
        isCourse: true,
        isGroupClass: false,
        scrapePageKind: 'events,tournaments,kids_clubs,kids_camps',
      }),
      'courses',
    );
    assert.equal(
      classifyProgramSignals({
        title: 'Kurz korčuľovania',
        sourceUrl: 'https://www.rskruzinov.sk/kruzky-a-kurzy/kurz-korculovania',
        scrapePageKind: 'kids_clubs',
      }),
      'courses',
    );
    assert.equal(
      classifyProgramSignals({
        title: 'Tenisový krúžok',
        sourceUrl: 'https://www.rskruzinov.sk/kruzky-a-kurzy/tenisovy-kruzok',
      }),
      'courses',
    );
    assert.equal(
      classifyProgramSignals({
        title: 'Podujatie · 23. septembra 2026 Športový večer pre nezadaných',
        description: 'Singles party v Sportcentre Pionierska',
        scrapePageKind: 'schedule,events,tournaments,kids_clubs,kids_camps,workshops',
        isCourse: true,
        themeProgramKind: 'courses',
      }),
      null,
    );
  });
});

describe('programKindFromScrapePage', () => {
  it('forces camps/courses/workshops only on dedicated pages', () => {
    assert.equal(programKindFromScrapePage('kids_camps'), 'camps');
    assert.equal(programKindFromScrapePage('kids_clubs'), 'courses');
    assert.equal(programKindFromScrapePage('workshops'), 'workshops');
    assert.equal(programKindFromScrapePage('schedule'), null);
    assert.equal(programKindFromScrapePage('schedule,kids_camps'), null);
    assert.equal(programKindFromScrapePage('events,tournaments,kids_clubs,kids_camps'), null);
  });
});

describe('parseProgramsFeedTab', () => {
  it('defaults to workshops', () => {
    assert.equal(parseProgramsFeedTab(null), 'workshops');
    assert.equal(parseProgramsFeedTab('all'), 'workshops');
    assert.equal(parseProgramsFeedTab('camps'), 'camps');
  });
});
