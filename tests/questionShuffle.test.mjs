import test from 'node:test';
import assert from 'node:assert/strict';

import { shuffleQuestionChoices, shuffleQuestions } from '../src/questionShuffle.mjs';

const question = {
  id: 'song-meaning-pardon-me',
  category: 'music',
  difficulty: 3,
  prompt: 'Qual tema combina melhor?',
  choices: ['Errada A', 'Errada B', 'Certa', 'Errada D'],
  answerIndex: 2,
  explanation: 'A resposta certa precisa acompanhar a alternativa.',
  tags: ['song-meaning']
};

test('shuffleQuestionChoices moves choices and keeps the correct answer attached', () => {
  const shuffled = shuffleQuestionChoices(question, () => 0);

  assert.deepEqual(shuffled.choices, ['Errada B', 'Certa', 'Errada D', 'Errada A']);
  assert.equal(shuffled.answerIndex, 1);
  assert.equal(shuffled.choices[shuffled.answerIndex], 'Certa');
});

test('shuffleQuestionChoices does not mutate the original question', () => {
  const originalChoices = [...question.choices];

  shuffleQuestionChoices(question, () => 0);

  assert.deepEqual(question.choices, originalChoices);
  assert.equal(question.answerIndex, 2);
});

test('shuffleQuestions randomizes question order and each question choices', () => {
  const secondQuestion = {
    ...question,
    id: 'song-meaning-we-love-sweets',
    choices: ['Certa 2', 'Errada 2A', 'Errada 2B', 'Errada 2C'],
    answerIndex: 0
  };
  const shuffled = shuffleQuestions([question, secondQuestion], () => 0);

  assert.deepEqual(shuffled.map((item) => item.id), ['song-meaning-we-love-sweets', 'song-meaning-pardon-me']);
  assert.equal(shuffled[0].choices[shuffled[0].answerIndex], 'Certa 2');
  assert.equal(shuffled[1].choices[shuffled[1].answerIndex], 'Certa');
});

test('shuffleQuestions can avoid recently seen questions at the front', () => {
  const source = Array.from({ length: 6 }, (_, index) => ({
    ...question,
    id: `question-${index + 1}`
  }));

  const shuffled = shuffleQuestions(source, () => 0.99, {
    recentQuestionIds: ['question-1', 'question-2', 'question-3'],
    preferredFreshCount: 3
  });

  assert.deepEqual(
    shuffled.slice(0, 3).map((item) => item.id),
    ['question-4', 'question-5', 'question-6']
  );
});
