import test from 'node:test';
import assert from 'node:assert/strict';

import { formatAnswerFeedback, formatDifficultyLabel } from '../src/feedback.mjs';

test('formatAnswerFeedback includes points, combo, and explanation for correct answers', () => {
  const text = formatAnswerFeedback({
    correct: true,
    points: 320,
    combo: 4,
    correctChoice: 'Pardon Me, I Have to Go Now',
    explanation: 'Uma explosao de cansaco social e vontade de escapar do expediente.'
  });

  assert.equal(
    text,
    '+320 Combo x4 - Uma explosao de cansaco social e vontade de escapar do expediente.'
  );
});

test('formatAnswerFeedback includes the right answer and explanation for misses', () => {
  const text = formatAnswerFeedback({
    correct: false,
    points: 0,
    combo: 1,
    correctChoice: 'WE LOVE SWEETS',
    explanation: 'Uma celebracao hiperativa de doces, desejo e energia kawaii pesada.'
  });

  assert.equal(
    text,
    'Combo quebrou. Resposta: WE LOVE SWEETS - Uma celebracao hiperativa de doces, desejo e energia kawaii pesada.'
  );
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

  assert.equal(
    text,
    'Combo broke. Answer: WE LOVE SWEETS - A hyperactive celebration of sweets and heavy kawaii energy.'
  );
});

test('formatDifficultyLabel names the five-point scale', () => {
  assert.equal(formatDifficultyLabel(1), 'Nivel 1/5');
  assert.equal(formatDifficultyLabel(5), 'Nivel 5/5');
  assert.equal(formatDifficultyLabel(5, 'en'), 'Level 5/5');
});
