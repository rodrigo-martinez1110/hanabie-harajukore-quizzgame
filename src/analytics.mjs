import { validateCountryCode } from './leaderboard.mjs';

export const ANALYTICS_EVENT_TYPES = [
  'game_started',
  'question_answered',
  'game_finished',
  'score_submitted'
];

const MAX_SCORE = 100_000;
const MAX_ANSWERED = 80;
const MAX_COMBO = 5;
const SUPPORTED_LANGUAGES = ['pt-BR', 'en', 'es', 'ja'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateAnalyticsEvent(raw) {
  const errors = [];
  const eventType = String(raw?.eventType ?? '').trim();
  const playerId = String(raw?.playerId ?? '').trim();
  const countryCode = validateCountryCode(raw?.countryCode);
  const language = SUPPORTED_LANGUAGES.includes(raw?.language) ? raw.language : 'pt-BR';
  const score = optionalInteger(raw?.score, 0, MAX_SCORE);
  const accuracy = optionalNumber(raw?.accuracy, 0, 1);
  const maxCombo = optionalInteger(raw?.maxCombo, 1, MAX_COMBO);
  const answered = optionalInteger(raw?.answered, 0, MAX_ANSWERED);
  const questionDifficulty = optionalInteger(raw?.questionDifficulty, 1, 5);
  const questionId = normalizeShortText(raw?.questionId, 80);
  const questionCategory = normalizeShortText(raw?.questionCategory, 32);
  const fanRank = normalizeShortText(raw?.fanRank, 48);
  const correct = typeof raw?.correct === 'boolean' ? raw.correct : null;

  if (!ANALYTICS_EVENT_TYPES.includes(eventType)) {
    errors.push('eventType must be a supported analytics event.');
  }
  if (!UUID_PATTERN.test(playerId)) {
    errors.push('playerId must be a UUID.');
  }
  if (!countryCode) {
    errors.push('countryCode must use two letters.');
  }
  if (score === false) {
    errors.push(`score must be an integer between 0 and ${MAX_SCORE}.`);
  }
  if (accuracy === false) {
    errors.push('accuracy must be between 0 and 1.');
  }
  if (maxCombo === false) {
    errors.push(`maxCombo must be between 1 and ${MAX_COMBO}.`);
  }
  if (answered === false) {
    errors.push(`answered must be between 0 and ${MAX_ANSWERED}.`);
  }
  if (questionDifficulty === false) {
    errors.push('questionDifficulty must be between 1 and 5.');
  }
  if (eventType === 'question_answered' && (!questionId || correct === null)) {
    errors.push('question_answered events require questionId and correct.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      eventType,
      playerId,
      countryCode,
      language,
      score: score ?? null,
      accuracy: accuracy ?? null,
      maxCombo: maxCombo ?? null,
      answered: answered ?? null,
      fanRank,
      questionId,
      questionCategory,
      questionDifficulty: questionDifficulty ?? null,
      correct
    }
  };
}

export function summarizeAnalyticsEvents(rows) {
  const events = Array.isArray(rows) ? rows : [];
  const uniquePlayers = new Set();
  const countryCounts = new Map();
  const languageCounts = new Map();
  const rankCounts = new Map();
  const questionMap = new Map();
  const finishedScores = [];
  let gamesStarted = 0;
  let gamesFinished = 0;
  let scoreSubmitted = 0;
  let totalAnswered = 0;
  let totalAccuracy = 0;
  let accuracyRows = 0;
  let bestScore = 0;

  for (const row of events) {
    const eventType = row.event_type || row.eventType;
    const playerId = row.player_id || row.playerId;
    const countryCode = row.country_code || row.countryCode;
    const language = row.language;
    const fanRank = row.fan_rank || row.fanRank;
    const score = Number(row.score || 0);
    const accuracy = Number(row.accuracy);
    const answered = Number(row.answered || 0);

    if (playerId) {
      uniquePlayers.add(playerId);
    }
    increment(countryCounts, countryCode || '??');
    increment(languageCounts, language || 'unknown');
    if (fanRank) {
      increment(rankCounts, fanRank);
    }
    if (eventType === 'game_started') {
      gamesStarted += 1;
    }
    if (eventType === 'game_finished') {
      gamesFinished += 1;
      finishedScores.push(score);
      bestScore = Math.max(bestScore, score);
      totalAnswered += answered;
      if (Number.isFinite(accuracy)) {
        totalAccuracy += accuracy;
        accuracyRows += 1;
      }
    }
    if (eventType === 'score_submitted') {
      scoreSubmitted += 1;
    }
    if (eventType === 'question_answered') {
      const questionId = row.question_id || row.questionId || 'unknown';
      const stats = questionMap.get(questionId) || {
        id: questionId,
        category: row.question_category || row.questionCategory || '',
        difficulty: Number(row.question_difficulty || row.questionDifficulty || 0),
        correct: 0,
        wrong: 0,
        total: 0,
        accuracy: 0
      };
      if (row.correct === true) {
        stats.correct += 1;
      } else {
        stats.wrong += 1;
      }
      stats.total += 1;
      stats.accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
      questionMap.set(questionId, stats);
    }
  }

  return {
    totals: {
      events: events.length,
      uniquePlayers: uniquePlayers.size,
      gamesStarted,
      gamesFinished,
      scoreSubmitted,
      averageScore: average(finishedScores),
      bestScore,
      averageAnswered: gamesFinished > 0 ? Math.round(totalAnswered / gamesFinished) : 0,
      averageAccuracy: accuracyRows > 0 ? roundRatio(totalAccuracy / accuracyRows) : 0
    },
    topCountries: mapTopCounts(countryCounts, 'code'),
    topLanguages: mapTopCounts(languageCounts, 'language'),
    topRanks: mapTopCounts(rankCounts, 'rank'),
    questionStats: Array.from(questionMap.values())
      .sort((left, right) => right.wrong - left.wrong || right.total - left.total)
      .slice(0, 12)
  };
}

export function getAdminPeriodStart(period, now = new Date()) {
  if (period === 'today') {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }
  if (period === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

function optionalInteger(value, min, max) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : false;
}

function optionalNumber(value, min, max) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : false;
}

function normalizeShortText(value, maxLength) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, maxLength);
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function average(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  return Math.round(numbers.reduce((total, value) => total + value, 0) / numbers.length);
}

function roundRatio(value) {
  return Math.round(value * 10000) / 10000;
}

function mapTopCounts(map, keyName) {
  return Array.from(map.entries())
    .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
    .slice(0, 8)
    .map(([key, count]) => ({ [keyName]: key, count }));
}
