import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateAnswerScore,
  calculateFanRank,
  getNextCombo
} from '../src/scoring.mjs';

test('getNextCombo grows correct streaks and caps at five', () => {
  assert.equal(getNextCombo(1, true), 2);
  assert.equal(getNextCombo(4, true), 5);
  assert.equal(getNextCombo(5, true), 5);
});

test('getNextCombo resets to one after a wrong answer', () => {
  assert.equal(getNextCombo(4, false), 1);
});

test('calculateAnswerScore applies base, speed, combo, and fever multipliers', () => {
  const result = calculateAnswerScore({
    isCorrect: true,
    answerTimeMs: 2500,
    questionTimeLimitMs: 10000,
    combo: 3,
    feverActive: true
  });

  assert.equal(result.basePoints, 100);
  assert.equal(result.speedBonus, 38);
  assert.equal(result.multiplier, 6);
  assert.equal(result.points, 828);
});

test('calculateAnswerScore gives zero for wrong answers', () => {
  const result = calculateAnswerScore({
    isCorrect: false,
    answerTimeMs: 1000,
    questionTimeLimitMs: 10000,
    combo: 5,
    feverActive: true
  });

  assert.equal(result.points, 0);
  assert.equal(result.speedBonus, 0);
  assert.equal(result.multiplier, 0);
});

test('calculateFanRank combines score accuracy and combo', () => {
  assert.equal(calculateFanRank({ score: 250, accuracy: 0.35, maxCombo: 1 }).label, 'First Show Curious');
  assert.equal(calculateFanRank({ score: 1600, accuracy: 0.75, maxCombo: 4 }).label, 'Mosh Pit Captain');
  assert.equal(calculateFanRank({ score: 3800, accuracy: 0.92, maxCombo: 5 }).label, 'True Harajuku-Core Maniac');
});
