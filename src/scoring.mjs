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
  const score = Math.max(0, Number(stats?.score) || 0);
  const accuracy = Math.max(0, Math.min(1, Number(stats?.accuracy) || 0));
  const maxCombo = Math.max(0, Number(stats?.maxCombo) || 0);
  const rating = score + accuracy * 1000 + maxCombo * 200;

  if (rating >= 5000) {
    return { label: 'True Harajuku-Core Maniac', rating };
  }
  if (rating >= 3800) {
    return { label: 'Bucchigiri Fan', rating };
  }
  if (rating >= 3000) {
    return { label: 'Mosh Pit Captain', rating };
  }
  if (rating >= 2100) {
    return { label: 'Crowd Energy Riser', rating };
  }
  if (rating >= 1200) {
    return { label: 'Harajuku-Core Rookie', rating };
  }
  return { label: 'First Show Curious', rating };
}
