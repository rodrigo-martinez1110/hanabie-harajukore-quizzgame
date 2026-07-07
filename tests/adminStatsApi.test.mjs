import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAnalyticsEventsQuery,
  isAuthorizedAdminRequest,
  mapAnalyticsEventToRow
} from '../api/_analyticsShared.mjs';

test('isAuthorizedAdminRequest accepts matching header or bearer token', () => {
  assert.equal(
    isAuthorizedAdminRequest({ headers: { 'x-admin-password': 'secret' } }, 'secret'),
    true
  );
  assert.equal(
    isAuthorizedAdminRequest({ headers: { authorization: 'Bearer secret' } }, 'secret'),
    true
  );
  assert.equal(
    isAuthorizedAdminRequest({ headers: { 'x-admin-password': 'wrong' } }, 'secret'),
    false
  );
});

test('isAuthorizedAdminRequest ignores accidental surrounding spaces', () => {
  assert.equal(
    isAuthorizedAdminRequest({ headers: { 'x-admin-password': 'secret' } }, ' secret '),
    true
  );
  assert.equal(
    isAuthorizedAdminRequest({ headers: { authorization: 'Bearer secret ' } }, 'secret'),
    true
  );
});

test('buildAnalyticsEventsQuery selects owner stats for a period', () => {
  const query = buildAnalyticsEventsQuery(
    new URL('https://game.test/api/admin-stats?period=7d'),
    new Date('2026-07-07T12:00:00Z')
  );

  assert.match(query, /select=/);
  assert.match(query, /created_at=gte.2026-06-30T12%3A00%3A00.000Z/);
  assert.match(query, /order=created_at.desc/);
  assert.match(query, /limit=5000/);
});

test('mapAnalyticsEventToRow stores only anonymous event fields', () => {
  assert.deepEqual(
    mapAnalyticsEventToRow({
      eventType: 'question_answered',
      playerId: '018fb6af-9cb8-75ba-9f40-97fcb2f9e111',
      countryCode: 'BR',
      language: 'pt-BR',
      questionId: 'music-test',
      questionCategory: 'music',
      questionDifficulty: 3,
      correct: false,
      score: null,
      accuracy: null,
      maxCombo: null,
      answered: null,
      fanRank: ''
    }),
    {
      event_type: 'question_answered',
      player_id: '018fb6af-9cb8-75ba-9f40-97fcb2f9e111',
      country_code: 'BR',
      language: 'pt-BR',
      score: null,
      accuracy: null,
      max_combo: null,
      answered: null,
      fan_rank: null,
      question_id: 'music-test',
      question_category: 'music',
      question_difficulty: 3,
      correct: false
    }
  );
});
