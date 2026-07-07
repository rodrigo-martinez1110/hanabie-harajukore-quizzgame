import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FAN_RANK_TIERS,
  calculateLeaderboardRating,
  getFanRankTier,
  getRankMeaning,
  sanitizeNickname,
  validateCountryCode,
  validateScoreSubmission
} from '../src/leaderboard.mjs';

test('calculateLeaderboardRating rewards score accuracy combo and answered count', () => {
  assert.equal(
    calculateLeaderboardRating({ score: 3000, accuracy: 0.8, maxCombo: 5, answered: 18 }),
    5250
  );
});

test('getFanRankTier returns HANABIE themed ranked tiers', () => {
  assert.equal(FAN_RANK_TIERS.length, 7);
  assert.equal(getFanRankTier(0).id, 'sweet-rookie');
  assert.equal(getFanRankTier(2250).id, 'harajuku-core-spark');
  assert.equal(getFanRankTier(6500).id, 'hanabie-legend');
});

test('getRankMeaning localizes tier descriptions and falls back to PT-BR', () => {
  const tier = getFanRankTier(3900);

  assert.equal(tier.label, 'Mosh Pit Royalty');
  assert.match(getRankMeaning(tier, 'pt-BR'), /pit/i);
  assert.match(getRankMeaning(tier, 'en'), /strong fan/i);
  assert.match(getRankMeaning(tier, 'fr'), /pit/i);
});

test('sanitizeNickname keeps display names short and fan safe', () => {
  assert.equal(sanitizeNickname('  Yukina Fan!!  '), 'Yukina Fan!!');
  assert.equal(sanitizeNickname('a'), 'Fan');
  assert.equal(sanitizeNickname('x'.repeat(40)), 'x'.repeat(18));
});

test('validateCountryCode accepts two letter country codes only', () => {
  assert.equal(validateCountryCode('br'), 'BR');
  assert.equal(validateCountryCode('JP'), 'JP');
  assert.equal(validateCountryCode('Brazil'), '');
  assert.equal(validateCountryCode('1A'), '');
});

test('validateScoreSubmission normalizes a valid score payload', () => {
  const result = validateScoreSubmission({
    playerId: '018fb6af-9cb8-75ba-9f40-97fcb2f9e111',
    runId: '018fb6af-9cb8-75ba-9f40-97fcb2f9e222',
    nickname: '  ChikaMain  ',
    countryCode: 'br',
    score: 3200,
    accuracy: 0.86,
    maxCombo: 5,
    answered: 21,
    language: 'pt-BR'
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.nickname, 'ChikaMain');
  assert.equal(result.value.countryCode, 'BR');
  assert.equal(result.value.rating, 5585);
  assert.equal(result.value.fanRank, 'Fever Headliner');
});

test('validateScoreSubmission accepts high legitimate fever scores', () => {
  const result = validateScoreSubmission({
    playerId: '018fb6af-9cb8-75ba-9f40-97fcb2f9e111',
    runId: '018fb6af-9cb8-75ba-9f40-97fcb2f9e222',
    nickname: 'Jillinflames',
    countryCode: 'US',
    score: 24033,
    accuracy: 0.96,
    maxCombo: 5,
    answered: 25,
    language: 'en'
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.score, 24033);
  assert.equal(result.value.fanRank, 'Hanabie. Legend');
});

test('validateScoreSubmission rejects impossible or malformed scores', () => {
  const result = validateScoreSubmission({
    playerId: 'bad',
    runId: '018fb6af-9cb8-75ba-9f40-97fcb2f9e222',
    nickname: 'ok name',
    countryCode: 'BR',
    score: 999999,
    accuracy: 2,
    maxCombo: 99,
    answered: 999,
    language: 'pt-BR'
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /playerId/i);
  assert.match(result.errors.join(' '), /score/i);
});
