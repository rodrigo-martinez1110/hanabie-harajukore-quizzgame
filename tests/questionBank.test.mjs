import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  SUPPORTED_CATEGORIES,
  normalizeQuestionBank,
  validateQuestion
} from '../src/questionBank.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const validQuestion = {
  id: 'music-reborn-superstar-release',
  category: 'music',
  difficulty: 1,
  prompt: 'Em que ano Reborn Superstar! foi lancado?',
  choices: ['2021', '2022', '2023', '2024'],
  answerIndex: 2,
  explanation: 'Reborn Superstar! foi lancado em 2023.',
  sourceUrl: 'https://en.wikipedia.org/wiki/Reborn_Superstar%21'
};

test('supported categories include all quiz sections', () => {
  assert.deepEqual(SUPPORTED_CATEGORIES, ['music', 'video', 'members', 'history', 'hardcore']);
});

test('validateQuestion accepts a complete question and trims text fields', () => {
  const result = validateQuestion({ ...validQuestion, id: '  music-reborn-superstar-release  ' });

  assert.equal(result.ok, true);
  assert.equal(result.value.id, 'music-reborn-superstar-release');
  assert.equal(result.value.choices.length, 4);
});

test('validateQuestion rejects questions without exactly four choices', () => {
  const result = validateQuestion({ ...validQuestion, choices: ['A', 'B', 'C'] });

  assert.equal(result.ok, false);
  assert.match(result.error, /exactly 4 choices/i);
});

test('validateQuestion accepts the full 1 to 5 difficulty scale', () => {
  const hardResult = validateQuestion({ ...validQuestion, id: 'music-hard-topic', difficulty: 5 });
  const invalidResult = validateQuestion({ ...validQuestion, id: 'music-too-hard', difficulty: 6 });

  assert.equal(hardResult.ok, true);
  assert.equal(hardResult.value.difficulty, 5);
  assert.equal(invalidResult.ok, false);
  assert.match(invalidResult.error, /expected 1 to 5/i);
});

test('validateQuestion rejects unsupported categories and invalid answer index', () => {
  const categoryResult = validateQuestion({ ...validQuestion, category: 'lyrics' });
  const answerResult = validateQuestion({ ...validQuestion, answerIndex: 7 });

  assert.equal(categoryResult.ok, false);
  assert.match(categoryResult.error, /unsupported category/i);
  assert.equal(answerResult.ok, false);
  assert.match(answerResult.error, /answerIndex/i);
});

test('normalizeQuestionBank keeps valid questions and reports invalid entries', () => {
  const duplicate = { ...validQuestion, id: validQuestion.id };
  const invalid = { ...validQuestion, id: 'bad-question', choices: ['A', 'B'] };
  const result = normalizeQuestionBank([validQuestion, duplicate, invalid]);

  assert.equal(result.questions.length, 1);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0], /duplicate id/i);
  assert.match(result.errors[1], /exactly 4 choices/i);
});

test('seed question bank includes at least thirty valid questions', async () => {
  const filePath = join(__dirname, '..', 'data', 'questions.json');
  const raw = JSON.parse(await readFile(filePath, 'utf8'));
  const result = normalizeQuestionBank(raw);

  assert.equal(result.errors.length, 0);
  assert.ok(result.questions.length >= 30);
});

test('seed question bank includes high-difficulty song meaning questions', async () => {
  const filePath = join(__dirname, '..', 'data', 'questions.json');
  const raw = JSON.parse(await readFile(filePath, 'utf8'));
  const result = normalizeQuestionBank(raw);
  const songMeaningQuestions = result.questions.filter((question) =>
    question.tags.includes('song-meaning')
  );

  assert.equal(result.errors.length, 0);
  assert.ok(songMeaningQuestions.length >= 8);
  assert.ok(songMeaningQuestions.some((question) => question.difficulty >= 5));
});
