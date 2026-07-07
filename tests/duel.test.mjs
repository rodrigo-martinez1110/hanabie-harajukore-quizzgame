import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DUEL_QUESTION_COUNT,
  getDuelStatus,
  selectDuelQuestionIds,
  validateDuelCreatePayload,
  validateDuelSubmitPayload
} from '../src/duel.mjs';

test('selectDuelQuestionIds returns exactly twenty unique ids', () => {
  const questions = Array.from({ length: 25 }, (_, index) => ({ id: `question-${index + 1}` }));
  const ids = selectDuelQuestionIds(questions, () => 0.42);

  assert.equal(DUEL_QUESTION_COUNT, 20);
  assert.equal(ids.length, 20);
  assert.equal(new Set(ids).size, 20);
});

test('validateDuelCreatePayload normalizes creator data', () => {
  const result = validateDuelCreatePayload({
    creatorPlayerId: '018fb6af-9cb8-75ba-9f40-97fcb2f9e111',
    creatorNickname: '  YukinaFan  ',
    countryCode: 'br',
    language: 'pt-BR'
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.creatorNickname, 'YukinaFan');
  assert.equal(result.value.countryCode, 'BR');
});

test('validateDuelSubmitPayload accepts a twenty-question duel result', () => {
  const result = validateDuelSubmitPayload({
    challengeId: '018fb6af-9cb8-75ba-9f40-97fcb2f9e333',
    slot: 'challenger',
    playerId: '018fb6af-9cb8-75ba-9f40-97fcb2f9e111',
    nickname: 'HettsuMain',
    countryCode: 'US',
    score: 18000,
    accuracy: 0.9,
    maxCombo: 5,
    answered: 20,
    language: 'en'
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.slot, 'challenger');
  assert.equal(result.value.answered, 20);
});

test('validateDuelSubmitPayload rejects partial or malformed duel results', () => {
  const result = validateDuelSubmitPayload({
    challengeId: 'bad',
    slot: 'viewer',
    playerId: 'bad',
    countryCode: 'USA',
    score: 999999,
    accuracy: 3,
    maxCombo: 9,
    answered: 12
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /challengeId/i);
  assert.match(result.errors.join(' '), /slot/i);
  assert.match(result.errors.join(' '), /answered/i);
});

test('getDuelStatus compares completed players by score, accuracy, combo, and created order', () => {
  const creator = { score: 1000, accuracy: 0.8, maxCombo: 4, submittedAt: '2026-07-07T10:00:00Z' };
  const challenger = { score: 1000, accuracy: 0.8, maxCombo: 5, submittedAt: '2026-07-07T10:01:00Z' };

  assert.equal(getDuelStatus({ creator, challenger }).winner, 'challenger');
  assert.equal(getDuelStatus({ creator, challenger: null }).status, 'waiting');
  assert.equal(getDuelStatus({ creator: { ...creator, maxCombo: 5 }, challenger }).winner, 'creator');
});
