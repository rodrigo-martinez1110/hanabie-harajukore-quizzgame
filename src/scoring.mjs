import { calculateLeaderboardRating, getFanRankTier } from './leaderboard.mjs';

const BASE_POINTS = 100;
const MAX_SPEED_BONUS = 50;
const MAX_COMBO = 5;
const FEVER_MULTIPLIER = 2;

export function getNextCombo(currentCombo, isCorrect) {
  if (!isCorrect) {
    return 1;
  }
  return Math.min(MAX_COMBO, Math.max(1, Number(currentCombo) || 1) + 1);
}

export function calculateAnswerScore(input) {
  if (!input?.isCorrect) {
    return {
      points: 0,
      basePoints: 0,
      speedBonus: 0,
      multiplier: 0
    };
  }

  const comboMultiplier = Math.min(MAX_COMBO, Math.max(1, Number(input.combo) || 1));
  const feverMultiplier = input.feverActive ? FEVER_MULTIPLIER : 1;
  const multiplier = comboMultiplier * feverMultiplier;
  const timeLimit = Math.max(1, Number(input.questionTimeLimitMs) || 1);
  const answerTime = Math.max(0, Math.min(timeLimit, Number(input.answerTimeMs) || 0));
  const speedRatio = 1 - answerTime / timeLimit;
  const speedBonus = Math.round(MAX_SPEED_BONUS * speedRatio);
  const points = (BASE_POINTS + speedBonus) * multiplier;

  return {
    points,
    basePoints: BASE_POINTS,
    speedBonus,
    multiplier
  };
}

export function calculateFanRank(stats) {
  const rating = calculateLeaderboardRating(stats);
  const tier = getFanRankTier(rating);

  return { label: tier.label, rating };
}
