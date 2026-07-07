import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_LANGUAGE,
  getLanguage,
  getDocumentLanguage,
  localizeQuestion,
  localizeText,
  t
} from '../src/i18n.mjs';

test('getLanguage accepts supported languages and falls back to PT-BR', () => {
  assert.equal(getLanguage('en'), 'en');
  assert.equal(getLanguage('es'), 'es');
  assert.equal(getLanguage('ja'), 'ja');
  assert.equal(getLanguage('pt-BR'), 'pt-BR');
  assert.equal(getLanguage('fr'), DEFAULT_LANGUAGE);
});

test('getDocumentLanguage returns valid html lang values', () => {
  assert.equal(getDocumentLanguage('pt-BR'), 'pt-BR');
  assert.equal(getDocumentLanguage('en'), 'en');
  assert.equal(getDocumentLanguage('es'), 'es');
  assert.equal(getDocumentLanguage('ja'), 'ja');
  assert.equal(getDocumentLanguage('fr'), DEFAULT_LANGUAGE);
});

test('localizeText reads localized values and falls back to PT-BR', () => {
  const value = { 'pt-BR': 'Jogar', en: 'Play' };

  assert.equal(localizeText(value, 'en'), 'Play');
  assert.equal(localizeText(value, 'pt-BR'), 'Jogar');
  assert.equal(localizeText({ 'pt-BR': 'Somente PT' }, 'en'), 'Somente PT');
  assert.equal(localizeText('Texto legado', 'en'), 'Texto legado');
});

test('localizeQuestion localizes prompt, choices, and explanation', () => {
  const question = {
    id: 'members-chika-role',
    category: 'members',
    difficulty: 1,
    prompt: { 'pt-BR': 'Qual instrumento Chika toca?', en: 'Which instrument does Chika play?' },
    choices: {
      'pt-BR': ['Baixo', 'Bateria', 'Guitarra', 'Sampler'],
      en: ['Bass', 'Drums', 'Guitar', 'Sampler']
    },
    answerIndex: 1,
    explanation: { 'pt-BR': 'Chika e baterista.', en: 'Chika is the drummer.' }
  };

  const localized = localizeQuestion(question, 'en');

  assert.equal(localized.prompt, 'Which instrument does Chika play?');
  assert.deepEqual(localized.choices, ['Bass', 'Drums', 'Guitar', 'Sampler']);
  assert.equal(localized.explanation, 'Chika is the drummer.');
  assert.equal(localized.answerIndex, 1);
});

test('t returns UI copy for all supported languages', () => {
  assert.equal(t('startButton', 'pt-BR'), 'Jogar');
  assert.equal(t('startButton', 'en'), 'Play');
  assert.equal(t('startButton', 'es'), 'Jugar');
  assert.equal(t('startButton', 'ja'), 'プレイ');
  assert.equal(t('missing.key', 'en'), 'missing.key');
});
