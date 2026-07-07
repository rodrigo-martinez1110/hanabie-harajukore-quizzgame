import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DUEL_SELECT,
  buildDuelLookupQuery,
  getDuelSubmitPatch,
  mapDuelRow
} from '../api/_duelShared.mjs';

test('buildDuelLookupQuery selects one duel by id', () => {
  const query = buildDuelLookupQuery('018fb6af-9cb8-75ba-9f40-97fcb2f9e333');

  assert.match(query, /select=/);
  assert.match(query, /id=eq.018fb6af-9cb8-75ba-9f40-97fcb2f9e333/);
  assert.match(query, /limit=1/);
  assert.ok(DUEL_SELECT.includes('question_ids'));
});

test('mapDuelRow exposes safe duel fields', () => {
  const mapped = mapDuelRow({
    id: '018fb6af-9cb8-75ba-9f40-97fcb2f9e333',
    question_ids: ['q1', 'q2'],
    creator_player_id: 'p1',
    creator_nickname: 'Creator',
    creator_country_code: 'BR',
    creator_score: 100,
    creator_accuracy: 0.75,
    creator_max_combo: 3,
    creator_answered: 20,
    creator_fan_rank: 'Rank A',
    creator_submitted_at: '2026-07-07T10:00:00Z',
    challenger_player_id: 'p2',
    challenger_nickname: 'Challenger',
    challenger_country_code: 'US',
    challenger_score: 200,
    challenger_accuracy: 0.8,
    challenger_max_combo: 4,
    challenger_answered: 20,
    challenger_fan_rank: 'Rank B',
    challenger_submitted_at: '2026-07-07T10:01:00Z',
    winner: 'challenger',
    language: 'pt-BR',
    created_at: '2026-07-07T09:00:00Z'
  });

  assert.equal(mapped.id, '018fb6af-9cb8-75ba-9f40-97fcb2f9e333');
  assert.deepEqual(mapped.questionIds, ['q1', 'q2']);
  assert.equal(mapped.creator.score, 100);
  assert.equal(mapped.challenger.score, 200);
  assert.equal(mapped.winner, 'challenger');
});

test('getDuelSubmitPatch writes only the selected player slot', () => {
  assert.deepEqual(
    getDuelSubmitPatch({
      slot: 'challenger',
      playerId: 'player-2',
      nickname: 'Challenger',
      countryCode: 'US',
      score: 200,
      accuracy: 0.8,
      maxCombo: 4,
      answered: 20,
      fanRank: 'Rank B'
    }),
    {
      challenger_player_id: 'player-2',
      challenger_nickname: 'Challenger',
      challenger_country_code: 'US',
      challenger_score: 200,
      challenger_accuracy: 0.8,
      challenger_max_combo: 4,
      challenger_answered: 20,
      challenger_fan_rank: 'Rank B'
    }
  );
});
