import {
  calculateLeaderboardRating,
  getFanRankTier,
  sanitizeNickname,
  validateCountryCode
} from './leaderboard.mjs';

export const DUEL_QUESTION_COUNT = 20;

const MAX_SCORE = 100_000;
const MAX_COMBO = 5;
const SUPPORTED_LANGUAGES = ['pt-BR', 'en', 'es', 'ja'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_SLOTS = ['creator', 'challenger'];

export function selectDuelQuestionIds(questions, random = Math.random) {
  if (!Array.isArray(questions) || questions.length < DUEL_QUESTION_COUNT) {
    throw new Error(`Duel mode needs at least ${DUEL_QUESTION_COUNT} questions.`);
  }

  return shuffle([...questions], random)
    .slice(0, DUEL_QUESTION_COUNT)
    .map((question) => question.id);
}

export function validateDuelCreatePayload(raw) {
  const errors = [];
  const creatorPlayerId = String(raw?.creatorPlayerId ?? '').trim();
  const creatorNickname = sanitizeNickname(raw?.creatorNickname);
  const countryCode = validateCountryCode(raw?.countryCode);
  const language = SUPPORTED_LANGUAGES.includes(raw?.language) ? raw.language : 'pt-BR';

  if (!UUID_PATTERN.test(creatorPlayerId)) {
    errors.push('creatorPlayerId must be a UUID.');
  }
  if (!countryCode) {
    errors.push('countryCode must use two letters.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      creatorPlayerId,
      creatorNickname,
      countryCode,
      language
    }
  };
}

export function validateDuelSubmitPayload(raw) {
  const errors = [];
  const challengeId = String(raw?.challengeId ?? '').trim();
  const slot = String(raw?.slot ?? '').trim();
  const playerId = String(raw?.playerId ?? '').trim();
  const nickname = sanitizeNickname(raw?.nickname);
  const countryCode = validateCountryCode(raw?.countryCode);
  const score = Number(raw?.score);
  const accuracy = Number(raw?.accuracy);
  const maxCombo = Number(raw?.maxCombo);
  const answered = Number(raw?.answered);
  const language = SUPPORTED_LANGUAGES.includes(raw?.language) ? raw.language : 'pt-BR';

  if (!UUID_PATTERN.test(challengeId)) {
    errors.push('challengeId must be a UUID.');
  }
  if (!VALID_SLOTS.includes(slot)) {
    errors.push('slot must be creator or challenger.');
  }
  if (!UUID_PATTERN.test(playerId)) {
    errors.push('playerId must be a UUID.');
  }
  if (!countryCode) {
    errors.push('countryCode must use two letters.');
  }
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    errors.push(`score must be an integer between 0 and ${MAX_SCORE}.`);
  }
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    errors.push('accuracy must be between 0 and 1.');
  }
  if (!Number.isInteger(maxCombo) || maxCombo < 1 || maxCombo > MAX_COMBO) {
    errors.push(`maxCombo must be between 1 and ${MAX_COMBO}.`);
  }
  if (answered !== DUEL_QUESTION_COUNT) {
    errors.push(`answered must be exactly ${DUEL_QUESTION_COUNT}.`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const rating = calculateLeaderboardRating({ score, accuracy, maxCombo, answered });
  const fanRank = getFanRankTier(rating).label;

  return {
    ok: true,
    value: {
      challengeId,
      slot,
      playerId,
      nickname,
      countryCode,
      score,
      accuracy,
      maxCombo,
      answered,
      rating,
      fanRank,
      language
    }
  };
}

export function getDuelStatus(duel) {
  if (!duel?.creator || !duel?.challenger) {
    return { status: 'waiting', winner: null };
  }

  const comparison = compareDuelPlayers(duel.creator, duel.challenger);
  if (comparison === 0) {
    return { status: 'complete', winner: 'tie' };
  }

  return { status: 'complete', winner: comparison > 0 ? 'creator' : 'challenger' };
}

export function compareDuelPlayers(left, right) {
  const fields = [
    ['score', 1],
    ['accuracy', 1],
    ['maxCombo', 1],
    ['submittedAt', -1]
  ];

  for (const [field, direction] of fields) {
    const leftValue = field === 'submittedAt' ? Date.parse(left?.[field] || 0) : Number(left?.[field] || 0);
    const rightValue = field === 'submittedAt' ? Date.parse(right?.[field] || 0) : Number(right?.[field] || 0);
    if (leftValue > rightValue) {
      return direction;
    }
    if (leftValue < rightValue) {
      return -direction;
    }
  }

  return 0;
}

function shuffle(items, random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}
