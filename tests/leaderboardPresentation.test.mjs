import test from 'node:test';
import assert from 'node:assert/strict';

import {
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
