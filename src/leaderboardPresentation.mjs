const PODIUM_CLASSES = {
  1: 'leaderboard-entry leaderboard-entry--podium leaderboard-entry--first',
  2: 'leaderboard-entry leaderboard-entry--podium leaderboard-entry--second',
  3: 'leaderboard-entry leaderboard-entry--podium leaderboard-entry--third'
};

const PODIUM_LABELS = {
  1: 'Fever Crown',
  2: 'Harajuku Star',
  3: 'Mosh Hero'
};

const EXPLANATION_COPY = {
  'pt-BR': {
    detail: 'Rating = Score bruto + bonus de precisao + bonus de combo + bonus de respostas. Precisao vale ate 1000 pontos, combo vale 200 por nivel e cada resposta vale 25.',
    formulaLabel: 'Calculo do rating'
  },
  en: {
    detail: 'Rating = Raw score + accuracy bonus + combo bonus + answered bonus. Accuracy is worth up to 1000 points, combo is worth 200 per level, and each answer is worth 25.',
    formulaLabel: 'Rating calculation'
  },
  es: {
    detail: 'Rating = score bruto + bonus de precision + bonus de combo + bonus de respuestas. La precision vale hasta 1000 puntos, el combo vale 200 por nivel y cada respuesta vale 25.',
    formulaLabel: 'Calculo del rating'
  },
  ja: {
    detail: 'Rating = Raw score + accuracy bonus + combo bonus + answered bonus. Accuracyは最大1000点、comboは1段階ごとに200点、回答数は1問ごとに25点です。',
    formulaLabel: 'Rating calculation'
  }
};

export function getLeaderboardEntryClasses(position) {
  return PODIUM_CLASSES[position] || 'leaderboard-entry';
}

export function getLeaderboardPositionLabel(position) {
  return PODIUM_LABELS[position] || `#${position}`;
}

export function explainLeaderboardScore(score, language = 'pt-BR') {
  const rawScore = clampInteger(score?.score, 0, 100_000);
  const accuracyBonus = Math.round(clampNumber(score?.accuracy, 0, 1) * 1000);
  const comboBonus = clampInteger(score?.maxCombo, 0, 5) * 200;
  const answeredBonus = clampInteger(score?.answered, 0, 80) * 25;
  const rating = rawScore + accuracyBonus + comboBonus + answeredBonus;
  const copy = EXPLANATION_COPY[language] || EXPLANATION_COPY['pt-BR'];

  return {
    rating,
    parts: {
      score: rawScore,
      accuracy: accuracyBonus,
      combo: comboBonus,
      answered: answeredBonus
    },
    formulaLabel: copy.formulaLabel,
    detail: copy.detail,
    summary: `${rawScore} + ${accuracyBonus} + ${comboBonus} + ${answeredBonus} = ${rating}`
  };
}

function clampInteger(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
