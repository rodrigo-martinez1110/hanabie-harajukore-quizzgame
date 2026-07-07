import { t } from './i18n.mjs';

export function formatAnswerFeedback({ correct, points, combo, correctChoice, language = 'pt-BR' }) {
  if (correct) {
    return t('answerCorrect', language, { points, combo });
  }

  return t('answerWrong', language, { answer: correctChoice });
}

export function formatDifficultyLabel(difficulty, language = 'pt-BR') {
  const level = Number.isInteger(Number(difficulty)) ? Number(difficulty) : 1;
  return t('difficulty', language, { level });
}
