import assert from 'node:assert/strict';import { describe, it } from 'node:test';
import {
  feedAreaSelectionLabel,
  nearestBratislavaDistrict,
  parseFeedAreaSelection,
  resolveFeedLocation,
  serializeFeedAreaSelection,
} from '@/lib/cities';
import {
  homeFeedAreaParam,
  parseHomeFeedFilters,
  serializeHomeFeedFilters,
} from '@/lib/home-feed-filters';

describe('multi borough area filter', () => {
  it('parses comma-separated mestské časti', () => {
    const selection = parseFeedAreaSelection('ruzinov,petrzalka,stare-mesto');
    assert.deepEqual(selection, {
      mode: 'districts',
      districtIds: ['ruzinov', 'petrzalka', 'stare-mesto'],
    });
    assert.equal(serializeFeedAreaSelection(selection), 'ruzinov,petrzalka,stare-mesto');
    assert.match(feedAreaSelectionLabel(selection), /Ružinov/);
  });

  it('round-trips home feed filters URL', () => {
    const filters = parseHomeFeedFilters({ area: 'ruzinov,nove-mesto' });
    assert.deepEqual(filters.districts, ['ruzinov', 'nove-mesto']);
    assert.equal(homeFeedAreaParam(filters), 'ruzinov,nove-mesto');
    assert.equal(serializeHomeFeedFilters(filters).get('area'), 'ruzinov,nove-mesto');
  });

  it('resolves multi-district location with districtIds', () => {
    const location = resolveFeedLocation({ areaRaw: 'ruzinov,petrzalka' });
    assert.deepEqual(location.districtIds, ['ruzinov', 'petrzalka']);
    assert.notEqual(location.area, 'bratislava');
    assert.notEqual(location.area, 'near_me');
  });

  it('picks nearest borough centroid for GPS', () => {
    // Ružinov centroid
    const ruzinov = nearestBratislavaDistrict(48.1525, 17.152);
    assert.equal(ruzinov.id, 'ruzinov');
    // Slightly closer to Petržalka than to Staré Mesto
    const petrzalka = nearestBratislavaDistrict(48.125, 17.11);
    assert.equal(petrzalka.id, 'petrzalka');
  });
});
