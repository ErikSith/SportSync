/**
 * Run: npx tsx --test lib/scrape/bratislava-location.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  locationKeywordAppearsIn,
  resolveBorough,
  resolveVenueDistrictSlug,
} from './bratislava-location';

describe('locationKeywordAppearsIn', () => {
  it('does not match centrum inside Fitcentrum', () => {
    assert.equal(locationKeywordAppearsIn('Fitcentrum W. M.', 'centrum'), false);
    assert.equal(locationKeywordAppearsIn('fitcentrum', 'centrum'), false);
  });

  it('matches standalone centrum and street prefixes', () => {
    assert.equal(locationKeywordAppearsIn('centrum Bratislava', 'centrum'), true);
    assert.equal(locationKeywordAppearsIn('Tbiliská 15a', 'tbilisk'), true);
    assert.equal(locationKeywordAppearsIn('Bratislava-Rača', 'rača'), true);
  });
});

describe('resolveBorough', () => {
  it('maps Fitcentrum on Tbiliská to Rača, not Staré Mesto', () => {
    const resolved = resolveBorough(
      'Tbiliská 15a, 831 06 Bratislava-Rača',
      'Fitcentrum W. M.',
    );
    assert.equal(resolved?.slug, 'raca');
    assert.equal(resolved?.borough, 'Rača');
  });

  it('keeps Golden gym on Tbiliská in Rača', () => {
    assert.equal(
      resolveVenueDistrictSlug('Tbiliská 15 / a, 831 06 Bratislava-Rača', 'Golden gym Bratislava'),
      'raca',
    );
  });

  it('prefers address borough over name keywords', () => {
    assert.equal(
      resolveVenueDistrictSlug('Pekná cesta 6A, 831 54 Bratislava-Rača', 'Siam Gym'),
      'raca',
    );
  });

  it('still maps Nivy street keywords from address', () => {
    assert.equal(
      resolveVenueDistrictSlug('Mlynské nivy 16, Bratislava', 'Form Factory OC Nivy'),
      'stare-mesto',
    );
  });
});
