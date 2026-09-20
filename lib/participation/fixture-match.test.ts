/**
 * Expectations for Hrať vs Sledovať title classification.
 * Run: npx tsx --test lib/participation/fixture-match.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  titleLooksLikeHeadToHeadFixture,
  listingParticipationMode,
} from './fixture-match';

describe('titleLooksLikeHeadToHeadFixture', () => {
  it('matches explicit vs / proti fixtures', () => {
    assert.equal(titleLooksLikeHeadToHeadFixture('FK Inter Bratislava vs FC Petržalka'), true);
    assert.equal(titleLooksLikeHeadToHeadFixture('Slovan proti Spartak'), true);
    assert.equal(titleLooksLikeHeadToHeadFixture('Home versus Away'), true);
  });

  it('matches club dash fixtures (Petržalka / ViOn style)', () => {
    assert.equal(titleLooksLikeHeadToHeadFixture('FC Petržalka - MŠK Žilina B'), true);
    assert.equal(titleLooksLikeHeadToHeadFixture('MFK Bytča - FC Petržalka'), true);
    assert.equal(titleLooksLikeHeadToHeadFixture('FC Petržalka - OFK Dynamo Malženice'), true);
    assert.equal(
      titleLooksLikeHeadToHeadFixture('FC ViOn Zlaté Moravce - Vráble - FC Petržalka'),
      true,
    );
    assert.equal(titleLooksLikeHeadToHeadFixture('FC ŠTK 1914 Šamorín – FC Petržalka'), true);
  });

  it('rejects class / promo titles that use a dash', () => {
    assert.equal(titleLooksLikeHeadToHeadFixture('SIAM FIGHTERS - Zápasnícky tréning'), false);
    assert.equal(
      titleLooksLikeHeadToHeadFixture('I. liga v curlingu - náhradný herný víkend'),
      false,
    );
    assert.equal(titleLooksLikeHeadToHeadFixture('Thajský box - Skupina B'), false);
    assert.equal(titleLooksLikeHeadToHeadFixture('HARLEM GLOBETROTTERS - 100. výročie'), false);
    assert.equal(titleLooksLikeHeadToHeadFixture('LADIES THAIBOX - BASIC'), false);
    assert.equal(titleLooksLikeHeadToHeadFixture('Klub Muay Thai - Technika a kondícia'), false);
  });

  it('keeps lobby Tím vs Tím joinable', () => {
    assert.equal(titleLooksLikeHeadToHeadFixture('Tím vs Tím'), false);
    assert.equal(titleLooksLikeHeadToHeadFixture('Team vs Team'), false);
  });
});

describe('listingParticipationMode', () => {
  it('forces spectator for dash fixtures even when DB says participate', () => {
    assert.equal(
      listingParticipationMode('FC Petržalka - MŠK Žilina B', 'participate'),
      'spectator',
    );
  });

  it('keeps participate for open classes', () => {
    assert.equal(
      listingParticipationMode('SIAM FIGHTERS - Zápasnícky tréning', 'participate'),
      'participate',
    );
  });

  it('respects stored spectator when title is not a fixture', () => {
    assert.equal(listingParticipationMode('Davis Cup vstupenky', 'spectator'), 'spectator');
  });
});
