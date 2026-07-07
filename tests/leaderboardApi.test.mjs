import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLeaderboardQuery,
  createJsonResponse,
  mapScoreRow,
  parseJsonBody
} from '../api/_leaderboardShared.mjs';

test('buildLeaderboardQuery creates a top 10 global query by default', () => {
  const query = buildLeaderboardQuery(new URL('https://game.test/api/leaderboard'));

  assert.match(query, /select=/);
  assert.match(query, /order=score.desc/);
  assert.match(query, /limit=10/);
  assert.doesNotMatch(query, /country_code=eq/);
});

test('buildLeaderboardQuery filters by country and week', () => {
  const query = buildLeaderboardQuery(
    new URL('https://game.test/api/leaderboard?scope=country&period=week&country=br')
  );

  assert.match(query, /country_code=eq.BR/);
  assert.match(query, /created_at=gte/);
  assert.match(query, /limit=10/);
});

test('buildLeaderboardQuery filters my best score by player id', () => {
  const query = buildLeaderboardQuery(
    new URL('https://game.test/api/leaderboard?scope=mine&playerId=018fb6af-9cb8-75ba-9f40-97fcb2f9e111')
  );

  assert.match(query, /player_id=eq.018fb6af-9cb8-75ba-9f40-97fcb2f9e111/);
  assert.match(query, /limit=1/);
});

test('mapScoreRow exposes leaderboard fields for the client', () => {
  assert.deepEqual(
    mapScoreRow({
      nickname: 'MatsuriFan',
      country_code: 'JP',
      score: 4200,
      accuracy: 0.91,
      max_combo: 5,
      answered: 24,
      rating: 5230,
      fan_rank: 'Fever Headliner',
      language: 'ja',
      created_at: '2026-07-07T12:00:00Z'
    }),
    {
      nickname: 'MatsuriFan',
      countryCode: 'JP',
      score: 4200,
      accuracy: 0.91,
      maxCombo: 5,
      answered: 24,
      rating: 5230,
      fanRank: 'Fever Headliner',
      language: 'ja',
      createdAt: '2026-07-07T12:00:00Z'
    }
  );
});

test('parseJsonBody reads request body chunks', async () => {
  const body = await parseJsonBody({
    [Symbol.asyncIterator]: async function* iterator() {
      yield Buffer.from('{"score":');
      yield Buffer.from('123}');
    }
  });

  assert.deepEqual(body, { score: 123 });
});

test('createJsonResponse sends status and json payload', () => {
  const calls = [];
  const response = {
    status(code) {
      calls.push(['status', code]);
      return this;
    },
    setHeader(name, value) {
      calls.push(['header', name, value]);
    },
    end(payload) {
      calls.push(['end', payload]);
    }
  };

  createJsonResponse(response, 201, { ok: true });

  assert.deepEqual(calls, [
    ['status', 201],
    ['header', 'Content-Type', 'application/json; charset=utf-8'],
    ['end', '{"ok":true}']
  ]);
});
