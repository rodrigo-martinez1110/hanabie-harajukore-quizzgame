import test from 'node:test';
import assert from 'node:assert/strict';

import {
  explainLeaderboardScore,
  getLeaderboardEntryClasses,
  getLeaderboardPositionLabel
} from '../src/leaderboardPresentation.mjs';

test('getLeaderboardEntryClasses highlights the podium positions', () => {
  assert.equal(getLeaderboardEntryClasses(1), 'leaderboard-entry leaderboard-entry--podium leaderboard-entry--first');
  assert.equal(getLeaderboardEntryClasses(2), 'leaderboard-entry leaderboard-entry--podium leaderboard-entry--second');
  assert.equal(getLeaderboardEntryClasses(3), 'leaderboard-entry leaderboard-entry--podium leaderboard-entry--third');
  assert.equal(getLeaderboardEntryClasses(4), 'leaderboard-entry');
});

test('getLeaderboardPositionLabel gives top three a stage label', () => {
  assert.equal(getLeaderboardPositionLabel(1), 'Fever Crown');
  assert.equal(getLeaderboardPositionLabel(2), 'Harajuku Star');
  assert.equal(getLeaderboardPositionLabel(3), 'Mosh Hero');
  assert.equal(getLeaderboardPositionLabel(4), '#4');
});

test('explainLeaderboardScore breaks down the rating formula', () => {
  const explanation = explainLeaderboardScore({
    score: 24033,
    accuracy: 0.96,
    maxCombo: 5,
    answered: 25
  }, 'pt-BR');

  assert.equal(explanation.rating, 26618);
  assert.deepEqual(explanation.parts, {
    score: 24033,
    accuracy: 960,
    combo: 1000,
    answered: 625
  });
  assert.match(explanation.summary, /24033 \+ 960 \+ 1000 \+ 625 = 26618/);
  assert.match(explanation.detail, /Score bruto/);
});

test('explainLeaderboardScore localizes the explanation copy', () => {
  const explanation = explainLeaderboardScore({
    score: 5000,
    accuracy: 0.5,
    maxCombo: 3,
    answered: 10
  }, 'en');

  assert.equal(explanation.rating, 6350);
  assert.match(explanation.detail, /Raw score/);
  assert.match(explanation.summary, /5000 \+ 500 \+ 600 \+ 250 = 6350/);
});
