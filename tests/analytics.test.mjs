import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAdminPeriodStart,
  summarizeAnalyticsEvents,
  validateAnalyticsEvent
} from '../src/analytics.mjs';

test('validateAnalyticsEvent accepts privacy friendly game events', () => {
  const result = validateAnalyticsEvent({
    eventType: 'game_finished',
    playerId: '018fb6af-9cb8-75ba-9f40-97fcb2f9e111',
    countryCode: 'br',
    language: 'pt-BR',
    score: 24033,
    accuracy: 0.96,
    maxCombo: 5,
    answered: 25,
    fanRank: 'Hanabie. Legend'
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.countryCode, 'BR');
  assert.equal(result.value.score, 24033);
});

test('validateAnalyticsEvent rejects malformed events and unknown types', () => {
  const result = validateAnalyticsEvent({
    eventType: 'page_view',
    playerId: 'bad-player',
    countryCode: 'Brazil',
    language: 'fr',
    score: 999999
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /eventType/i);
  assert.match(result.errors.join(' '), /playerId/i);
  assert.match(result.errors.join(' '), /countryCode/i);
});

test('summarizeAnalyticsEvents builds owner stats from raw rows', () => {
  const summary = summarizeAnalyticsEvents([
    {
      event_type: 'game_started',
      player_id: '018fb6af-9cb8-75ba-9f40-97fcb2f9e111',
      country_code: 'BR',
      language: 'pt-BR',
      created_at: '2026-07-07T10:00:00Z'
    },
    {
      event_type: 'question_answered',
      player_id: '018fb6af-9cb8-75ba-9f40-97fcb2f9e111',
      country_code: 'BR',
      language: 'pt-BR',
      question_id: 'members-yukina-role',
      question_category: 'members',
      question_difficulty: 1,
      correct: true,
      created_at: '2026-07-07T10:00:10Z'
    },
    {
      event_type: 'question_answered',
      player_id: '018fb6af-9cb8-75ba-9f40-97fcb2f9e222',
      country_code: 'US',
      language: 'en',
      question_id: 'setlist-over-200-osaki',
      question_category: 'hardcore',
      question_difficulty: 5,
      correct: false,
      created_at: '2026-07-07T10:00:20Z'
    },
    {
      event_type: 'game_finished',
      player_id: '018fb6af-9cb8-75ba-9f40-97fcb2f9e222',
      country_code: 'US',
      language: 'en',
      score: 24033,
      accuracy: 0.96,
      max_combo: 5,
      answered: 25,
      fan_rank: 'Hanabie. Legend',
      created_at: '2026-07-07T10:01:00Z'
    }
  ]);

  assert.equal(summary.totals.events, 4);
  assert.equal(summary.totals.uniquePlayers, 2);
  assert.equal(summary.totals.gamesStarted, 1);
  assert.equal(summary.totals.gamesFinished, 1);
  assert.equal(summary.totals.averageScore, 24033);
  assert.equal(summary.topCountries[0].code, 'BR');
  assert.equal(summary.questionStats[0].wrong, 1);
});

test('getAdminPeriodStart supports owner dashboard ranges', () => {
  const now = new Date('2026-07-07T12:00:00Z');

  assert.equal(getAdminPeriodStart('today', now).toISOString(), '2026-07-07T00:00:00.000Z');
  assert.equal(getAdminPeriodStart('7d', now).toISOString(), '2026-06-30T12:00:00.000Z');
  assert.equal(getAdminPeriodStart('30d', now).toISOString(), '2026-06-07T12:00:00.000Z');
  assert.equal(getAdminPeriodStart('all', now), null);
});
