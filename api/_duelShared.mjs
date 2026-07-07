export const DUEL_SELECT = [
  'id',
  'question_ids',
  'creator_player_id',
  'creator_nickname',
  'creator_country_code',
  'creator_score',
  'creator_accuracy',
  'creator_max_combo',
  'creator_answered',
  'creator_fan_rank',
  'creator_submitted_at',
  'challenger_player_id',
  'challenger_nickname',
  'challenger_country_code',
  'challenger_score',
  'challenger_accuracy',
  'challenger_max_combo',
  'challenger_answered',
  'challenger_fan_rank',
  'challenger_submitted_at',
  'winner',
  'language',
  'created_at'
].join(',');

export function buildDuelLookupQuery(challengeId) {
  return new URLSearchParams({
    select: DUEL_SELECT,
    id: `eq.${challengeId}`,
    limit: '1'
  }).toString();
}

export function mapDuelRow(row) {
  return {
    id: row.id,
    questionIds: Array.isArray(row.question_ids) ? row.question_ids : [],
    creator: mapPlayer(row, 'creator'),
    challenger: mapPlayer(row, 'challenger'),
    winner: row.winner || null,
    language: row.language || 'pt-BR',
    createdAt: row.created_at
  };
}

export function getDuelSubmitPatch(value) {
  const prefix = value.slot === 'creator' ? 'creator' : 'challenger';
  return {
    [`${prefix}_player_id`]: value.playerId,
    [`${prefix}_nickname`]: value.nickname,
    [`${prefix}_country_code`]: value.countryCode,
    [`${prefix}_score`]: value.score,
    [`${prefix}_accuracy`]: value.accuracy,
    [`${prefix}_max_combo`]: value.maxCombo,
    [`${prefix}_answered`]: value.answered,
    [`${prefix}_fan_rank`]: value.fanRank
  };
}

export function getSlotIsEmpty(row, slot) {
  const prefix = slot === 'creator' ? 'creator' : 'challenger';
  return row?.[`${prefix}_score`] === null || row?.[`${prefix}_score`] === undefined;
}

function mapPlayer(row, prefix) {
  const score = row[`${prefix}_score`];
  if (score === null || score === undefined) {
    return null;
  }

  return {
    playerId: row[`${prefix}_player_id`] || '',
    nickname: row[`${prefix}_nickname`] || 'Fan',
    countryCode: row[`${prefix}_country_code`] || '',
    score: Number(score || 0),
    accuracy: Number(row[`${prefix}_accuracy`] || 0),
    maxCombo: Number(row[`${prefix}_max_combo`] || 1),
    answered: Number(row[`${prefix}_answered`] || 0),
    fanRank: row[`${prefix}_fan_rank`] || '',
    submittedAt: row[`${prefix}_submitted_at`] || null
  };
}
