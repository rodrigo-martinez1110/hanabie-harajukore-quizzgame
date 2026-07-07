import test from 'node:test';
import assert from 'node:assert/strict';

import {
  explainGameScore,
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

test('explainGameScore explains the visible match score instead of rank rating', () => {
  const explanation = explainGameScore({
    score: 24033,
    accuracy: 0.96,
    maxCombo: 5,
    answered: 25
  }, 'pt-BR');

  assert.equal(explanation.score, 24033);
  assert.equal(explanation.formulaLabel, 'Como esse score foi feito');
  assert.match(explanation.summary, /Score final: 24033/);
  assert.match(explanation.detail, /acertos rapidos/i);
  assert.match(explanation.detail, /dificuldade/i);
  assert.match(explanation.detail, /combo/i);
  assert.doesNotMatch(explanation.summary, /26618|rating/i);
});

test('explainGameScore localizes the score explanation copy', () => {
  const explanation = explainGameScore({
    score: 5000,
    accuracy: 0.5,
    maxCombo: 3,
    answered: 10
  }, 'en');

  assert.equal(explanation.score, 5000);
  assert.equal(explanation.formulaLabel, 'How this score happened');
  assert.match(explanation.summary, /Final score: 5000/);
  assert.match(explanation.detail, /fast correct answers/i);
});
