export function formatAnswerFeedback({ correct, points, combo, correctChoice, explanation }) {
  const detail = explanation ? ` - ${explanation}` : '';
  if (correct) {
    return `+${points} Combo x${combo}${detail}`;
  }

  return `Combo quebrou. Resposta: ${correctChoice}${detail}`;
}

export function formatDifficultyLabel(difficulty) {
  const level = Number.isInteger(Number(difficulty)) ? Number(difficulty) : 1;
  return `Nivel ${level}/5`;
}
