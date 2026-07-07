import test from 'node:test';
import assert from 'node:assert/strict';

import {
  answerCurrentQuestion,
  createGameSession,
  getTimeRemaining
} from '../src/gameEngine.mjs';

const questions = [
  {
    id: 'members-yukina-role',
    category: 'members',
    difficulty: 1,
    prompt: 'Qual e o papel principal de Yukina?',
    choices: ['Guitarra', 'Vocal', 'Bateria', 'Baixo'],
    answerIndex: 1
  },
  {
    id: 'members-chika-role',
    category: 'members',
    difficulty: 1,
    prompt: 'Qual instrumento Chika toca?',
    choices: ['Bateria', 'Baixo', 'Guitarra', 'Teclado'],
    answerIndex: 0
  }
];

test('createGameSession starts with the first question and default stats', () => {
  const state = createGameSession(questions, { startedAtMs: 1000 });

  assert.equal(state.currentQuestion.id, 'members-yukina-role');
  assert.equal(state.score, 0);
  assert.equal(state.combo, 1);
  assert.equal(state.durationMs, 90000);
});

test('answerCurrentQuestion updates score, stats, combo, and current question on correct answer', () => {
  const state = createGameSession(questions, { startedAtMs: 0 });
  const next = answerCurrentQuestion(state, 1, 2500);

  assert.equal(next.correctCount, 1);
  assert.equal(next.answeredCount, 1);
  assert.equal(next.combo, 2);
  assert.equal(next.maxCombo, 2);
  assert.equal(next.score, 276);
  assert.equal(next.currentQuestion.id, 'members-chika-role');
  assert.equal(next.lastFeedback.correct, true);
});

test('answerCurrentQuestion resets combo on wrong answer and loops question queue', () => {
  let state = createGameSession(questions, { startedAtMs: 0 });
  state = answerCurrentQuestion(state, 1, 1000);
  state = answerCurrentQuestion(state, 2, 2000);

  assert.equal(state.correctCount, 1);
  assert.equal(state.answeredCount, 2);
  assert.equal(state.combo, 1);
  assert.equal(state.currentQuestion.id, 'members-yukina-role');
  assert.equal(state.lastFeedback.correct, false);
});

test('getTimeRemaining clamps values between zero and duration', () => {
  const state = createGameSession(questions, { startedAtMs: 1000, durationMs: 90000 });

  assert.equal(getTimeRemaining(state, 0), 90000);
  assert.equal(getTimeRemaining(state, 46000), 45000);
  assert.equal(getTimeRemaining(state, 100000), 0);
});
