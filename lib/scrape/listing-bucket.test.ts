/**
 * Run: npx tsx --test lib/scrape/listing-bucket.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyListingHubBucket } from './listing-bucket';

describe('classifyListingHubBucket — 4 SportSync hubs', () => {
  it('routes marathon / Red Bull night to Eventy', () => {
    assert.equal(
      classifyListingHubBucket({ title: 'ČSOB Bratislava Marathon 2026' }).bucket,
      'event',
    );
    assert.equal(
      classifyListingHubBucket({ title: 'Red Bull Night Run Bratislava' }).bucket,
      'event',
    );
  });

  it('routes open-entry cups to Turnaje, not Eventy', () => {
    const r = classifyListingHubBucket({
      title: 'Open Padel Cup Bratislava',
      isTournament: true,
    });
    assert.equal(r.bucket, 'tournament');
  });

  it('routes A vs B fixtures to Eventy (Sledovať), never Turnaje', () => {
    const r = classifyListingHubBucket({
      title: 'FC Petržalka - MŠK Žilina B',
    });
    assert.equal(r.bucket, 'event');
    assert.equal(r.reason, 'fixture_watch');
  });

  it('routes pilates / rozvrh slots to Skupinové', () => {
    assert.equal(
      classifyListingHubBucket({
        title: 'Pilates — Skupina A',
        isGroupClass: true,
      }).bucket,
      'group_class',
    );
    assert.equal(
      classifyListingHubBucket({
        title: 'Body Pump',
        sourceUrl: 'https://formfactory.sk/ruzinov/rozvrh',
        forceGroupClass: true,
      }).bucket,
      'group_class',
    );
  });

  it('routes camps / workshops / krúžky to Programy', () => {
    assert.equal(
      classifyListingHubBucket({
        title: 'Letný športový tábor',
        isCamp: true,
      }).bucket,
      'program',
    );
    assert.equal(
      classifyListingHubBucket({
        title: 'Yoga workshop pre začiatočníkov',
        isWorkshop: true,
      }).bucket,
      'program',
    );
    assert.equal(
      classifyListingHubBucket({
        title: 'Curling krúžok',
        scrapePageKind: 'kids_clubs',
      }).bucket,
      'program',
    );
  });

  it('skips news headlines and nav chrome', () => {
    assert.equal(
      classifyListingHubBucket({
        title: 'Výsledky: Novák vyhral finále',
      }).bucket,
      'skip',
    );
    assert.equal(
      classifyListingHubBucket({ title: 'Turnaje' }).bucket,
      'skip',
    );
  });

  it('skips weak PODUJATIE without special / class / program signals', () => {
    const r = classifyListingHubBucket({
      title: 'Športové popoludnie v parku',
    });
    assert.equal(r.bucket, 'skip');
    assert.equal(r.reason, 'no_hub_signal');
  });

  it('does not let group class steal a one-off special on a schedule page', () => {
    const r = classifyListingHubBucket({
      title: 'Open Air Festival FitCamp',
      forceGroupClass: true,
      sourceUrl: 'https://example.com/rozvrh',
    });
    assert.equal(r.bucket, 'event');
  });
});
