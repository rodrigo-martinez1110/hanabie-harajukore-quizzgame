import { t } from './i18n.mjs';

export function formatAnswerFeedback({ correct, points, combo, correctChoice, explanation, language = 'pt-BR' }) {
  const detail = explanation ? ` - ${explanation}` : '';
  if (correct) {
    return `${t('answerCorrect', language, { points, combo })}${detail}`;
  }

  return `${t('answerWrong', language, { answer: correctChoice })}${detail}`;
}

export function formatDifficultyLabel(difficulty, language = 'pt-BR') {
  const level = Number.isInteger(Number(difficulty)) ? Number(difficulty) : 1;
  return t('difficulty', language, { level });
}
