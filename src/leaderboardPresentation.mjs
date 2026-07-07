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

const SCORE_EXPLANATION_COPY = {
  'pt-BR': {
    formulaLabel: 'Como esse score foi feito',
    detail: 'Esse e o score final da partida. Ele cresce com acertos rapidos, dificuldade das perguntas, combo e fever. Como o ranking salva o resultado final e nao cada resposta, aqui mostramos os fatores da partida, nao uma divisao exata por pergunta.',
    summaryLabel: 'Score final'
  },
  en: {
    formulaLabel: 'How this score happened',
    detail: 'This is the final match score. It grows from fast correct answers, question difficulty, combo, and fever. The leaderboard stores the final result, not each answer, so this shows the run factors, not an exact per-answer split.',
    summaryLabel: 'Final score'
  },
  es: {
    formulaLabel: 'Como se hizo este score',
    detail: 'Este es el score final de la partida. Sube con aciertos rapidos, dificultad de las preguntas, combo y fever. El ranking guarda el resultado final y no cada respuesta, asi que esto muestra los factores de la partida, no una division exacta por pregunta.',
    summaryLabel: 'Score final'
  },
  ja: {
    formulaLabel: 'How this score happened',
    detail: 'This is the final match score. It grows from fast correct answers, question difficulty, combo, and fever. The leaderboard stores the final result, not each answer, so this shows the run factors, not an exact per-answer split.',
    summaryLabel: 'Final score'
  }
};

export function getLeaderboardEntryClasses(position) {
  return PODIUM_CLASSES[position] || 'leaderboard-entry';
}

export function getLeaderboardPositionLabel(position) {
  return PODIUM_LABELS[position] || `#${position}`;
}

export function explainGameScore(score, language = 'pt-BR') {
  const finalScore = clampInteger(score?.score, 0, 100_000);
  const accuracy = Math.round(clampNumber(score?.accuracy, 0, 1) * 100);
  const maxCombo = clampInteger(score?.maxCombo, 0, 5);
  const answered = clampInteger(score?.answered, 0, 80);
  const copy = SCORE_EXPLANATION_COPY[language] || SCORE_EXPLANATION_COPY['pt-BR'];

  return {
    score: finalScore,
    accuracy,
    maxCombo,
    answered,
    formulaLabel: copy.formulaLabel,
    detail: copy.detail,
    summary: `${copy.summaryLabel}: ${finalScore} (${accuracy}% / x${maxCombo} / ${answered})`
  };
}

function clampInteger(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
