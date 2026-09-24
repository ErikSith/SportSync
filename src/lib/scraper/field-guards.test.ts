/**
 * Run: npx tsx --test src/lib/scraper/field-guards.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFieldGuards,
  guardScrapedEventFields,
  sanitizeDescription,
  sanitizeLocationName,
  sanitizePriceText,
  sanitizeTitle,
} from './field-guards';
import type { ScrapedEvent } from './types';

function base(partial: Partial<ScrapedEvent> = {}): ScrapedEvent {
  return {
    title: 'Padel Open Bratislava',
    sportType: 'Padel',
    isTournament: true,
    isGroupClass: false,
    isForWomenOnly: false,
    isForKids: false,
    ageCategory: null,
    startTime: '2026-10-10T09:00:00+02:00',
    timeKnown: true,
    endTime: null,
    locationName: 'NTC Aréna',
    city: 'Bratislava',
    priceText: '15 €',
    description: 'Otvorený turnaj pre amatérov.',
    originalUrl: 'https://example.com/turnaj',
    ...partial,
  };
}

describe('sanitizeLocationName', () => {
  it('keeps venue names and addresses', () => {
    assert.equal(sanitizeLocationName('NTC Aréna'), 'NTC Aréna');
    assert.equal(sanitizeLocationName('Kalinčiakova 12'), 'Kalinčiakova 12');
  });

  it('rejects transport / parking fluff', () => {
    assert.equal(sanitizeLocationName('doprava je 15min'), null);
    assert.equal(sanitizeLocationName('Parkovanie zadarmo pri hale'), null);
    assert.equal(sanitizeLocationName('MHD 50 a 70 – 5 min od zastávky'), null);
  });

  it('keeps venue when junk is appended after a dash', () => {
    assert.equal(
      sanitizeLocationName('NTC Aréna – parkovanie zadarmo'),
      'NTC Aréna',
    );
  });
});

describe('sanitizePriceText', () => {
  it('keeps short prices and Zadarmo', () => {
    assert.equal(sanitizePriceText('15 €'), '15 €');
    assert.equal(sanitizePriceText('Zadarmo'), 'Zadarmo');
  });

  it('strips payment-condition paragraphs down to euro token', () => {
    assert.equal(
      sanitizePriceText(
        'Štartovné 20 € sa platí na mieste kartou alebo hotovosťou po registrácii do 12:00',
      ),
      '20 €',
    );
  });

  it('drops hourly court-hire rates', () => {
    assert.equal(sanitizePriceText('Prenájom kurtu 25 €/hod'), null);
  });
});

describe('sanitizeDescription', () => {
  it('drops logistics sentences', () => {
    assert.equal(
      sanitizeDescription('Parkovanie je zadarmo. Formát AME 16 hráčov.'),
      'Formát AME 16 hráčov.',
    );
  });

  it('nulls pure marketing', () => {
    assert.equal(sanitizeDescription('Pridajte sa k nám ešte dnes!'), null);
  });
});

describe('sanitizeTitle', () => {
  it('rejects cenník / kontakt / brigáda', () => {
    assert.equal(sanitizeTitle('Cenník prenájmu kurtov'), null);
    assert.equal(sanitizeTitle('Kontakt'), null);
    assert.equal(sanitizeTitle('Brigáda – stavanie haly'), null);
  });

  it('rejects nav hub titles', () => {
    assert.equal(sanitizeTitle('Turnaje'), null);
    assert.equal(sanitizeTitle('Kurzy'), null);
  });

  it('strips trailing doprava clause', () => {
    assert.equal(
      sanitizeTitle('Padel turnaj - doprava 15min'),
      'Padel turnaj',
    );
  });
});

describe('news / result headlines', () => {
  it('rejects match-result titles', () => {
    const { event, rejected } = guardScrapedEventFields(
      base({
        title: 'Pohánková postúpila do osmičky',
        isTournament: false,
        isGroupClass: true,
        originalUrl: 'http://www.stz.sk/aktuality/pohankova-postupila-do-osmicky',
      }),
    );
    assert.equal(event, null);
    assert.equal(rejected, 'title_news');
  });
});

describe('guardScrapedEventFields', () => {
  it('cleans junk location but keeps the event', () => {
    const { event, rejected, cleaned } = guardScrapedEventFields(
      base({ locationName: 'doprava je 15min od centra' }),
    );
    assert.equal(rejected, null);
    assert.ok(event);
    assert.equal(event!.locationName, '');
    assert.ok(cleaned.includes('locationName'));
  });

  it('rejects listing noise titles', () => {
    const { event, rejected } = guardScrapedEventFields(
      base({ title: 'Otváracie hodiny' }),
    );
    assert.equal(event, null);
    assert.equal(rejected, 'title_noise');
  });

  it('rejects social / mailto URLs', () => {
    const { rejected } = guardScrapedEventFields(
      base({ originalUrl: 'mailto:info@example.com' }),
    );
    assert.equal(rejected, 'bad_url');
  });
});

describe('applyFieldGuards', () => {
  it('filters a mixed batch', () => {
    const out = applyFieldGuards([
      base(),
      base({ title: 'Cenník', originalUrl: 'https://example.com/cennik' }),
      base({
        title: 'Yoga Ranná',
        locationName: 'MOVE Academy | parkovanie P+R',
        priceText: 'Vstupné 8 € platba len kartou na recepcii pred lekciou prosím',
      }),
    ]);
    assert.equal(out.length, 2);
    const yoga = out.find((e) => e.title === 'Yoga Ranná');
    assert.ok(yoga);
    assert.equal(yoga!.locationName, 'MOVE Academy');
    assert.equal(yoga!.priceText, '8 €');
  });
});
