import { calculateLeaderboardRating, getFanRankTier } from './leaderboard.mjs';

const BASE_POINTS = 100;
const MAX_SPEED_BONUS = 50;
const MAX_COMBO = 5;
const FEVER_MULTIPLIER = 2;
const DIFFICULTY_MULTIPLIERS = [1, 1.1, 1.25, 1.45, 1.7];

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
  const difficultyMultiplier = getDifficultyMultiplier(input.difficulty);
  const multiplier = comboMultiplier * feverMultiplier * difficultyMultiplier;
  const timeLimit = Math.max(1, Number(input.questionTimeLimitMs) || 1);
  const answerTime = Math.max(0, Math.min(timeLimit, Number(input.answerTimeMs) || 0));
  const speedRatio = 1 - answerTime / timeLimit;
  const speedBonus = Math.round(MAX_SPEED_BONUS * speedRatio);
  const points = Math.round((BASE_POINTS + speedBonus) * multiplier);

  return {
    points,
    basePoints: BASE_POINTS,
    speedBonus,
    multiplier,
    difficultyMultiplier
  };
}

export function calculateFanRank(stats) {
  const rating = calculateLeaderboardRating(stats);
  const tier = getFanRankTier(rating);

  return { label: tier.label, rating };
}

function getDifficultyMultiplier(difficulty) {
  const level = Math.max(1, Math.min(5, Math.round(Number(difficulty) || 1)));
  return DIFFICULTY_MULTIPLIERS[level - 1];
}
