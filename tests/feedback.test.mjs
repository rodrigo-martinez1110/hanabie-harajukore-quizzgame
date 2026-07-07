import test from 'node:test';
import assert from 'node:assert/strict';

import { formatAnswerFeedback, formatDifficultyLabel } from '../src/feedback.mjs';

test('formatAnswerFeedback keeps correct-answer feedback short during timed play', () => {
  const text = formatAnswerFeedback({
    correct: true,
    points: 320,
    combo: 4,
    correctChoice: 'Pardon Me, I Have to Go Now',
    explanation: 'Uma explosao de cansaco social e vontade de escapar do expediente.'
  });

  assert.equal(text, '+320 Combo x4');
});

test('formatAnswerFeedback keeps miss feedback short during timed play', () => {
  const text = formatAnswerFeedback({
    correct: false,
    points: 0,
    combo: 1,
    correctChoice: 'WE LOVE SWEETS',
    explanation: 'Uma celebracao hiperativa de doces, desejo e energia kawaii pesada.'
  });

  assert.equal(text, 'Combo quebrou. Resposta: WE LOVE SWEETS');
});

test('formatAnswerFeedback supports English copy', () => {
  const text = formatAnswerFeedback({
    correct: false,
    points: 0,
    combo: 1,
    correctChoice: 'WE LOVE SWEETS',
    explanation: 'A hyperactive celebration of sweets and heavy kawaii energy.',
    language: 'en'
  });

  assert.equal(text, 'Combo broke. Answer: WE LOVE SWEETS');
});

test('formatDifficultyLabel names the five-point scale', () => {
  assert.equal(formatDifficultyLabel(1), 'Nivel 1/5');
  assert.equal(formatDifficultyLabel(5), 'Nivel 5/5');
  assert.equal(formatDifficultyLabel(5, 'en'), 'Level 5/5');
});
