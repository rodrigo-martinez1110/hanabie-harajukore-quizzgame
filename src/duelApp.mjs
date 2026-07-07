import { answerCurrentQuestion, createGameSession, getTimeRemaining } from './gameEngine.mjs';
import { formatAnswerFeedback } from './feedback.mjs';
import { DEFAULT_LANGUAGE, getLanguage, localizeQuestion } from './i18n.mjs';
import { createUuid } from './leaderboard.mjs';
import { getPlayerProfile } from './leaderboardClient.mjs';
import { normalizeQuestionBank } from './questionBank.mjs';
import { shuffleQuestionChoices } from './questionShuffle.mjs';
import { DUEL_QUESTION_COUNT } from './duel.mjs';
import { createDuelChallenge, fetchDuelChallenge, submitDuelResult } from './duelClient.mjs';

const LANGUAGE_STORAGE_KEY = 'hanabie-quiz-language';
const DUEL_DURATION_MS = 150_000;

const homeEl = document.querySelector('#duel-home');
const gameEl = document.querySelector('#duel-game');
const statusEl = document.querySelector('#duel-status');
const createButton = document.querySelector('#create-duel-button');
const startButton = document.querySelector('#start-duel-button');
const copyButton = document.querySelector('#copy-duel-button');
const scoreboardEl = document.querySelector('#duel-scoreboard');
const timerEl = document.querySelector('#duel-timer');
const scoreEl = document.querySelector('#duel-score');
const comboEl = document.querySelector('#duel-combo');
const progressEl = document.querySelector('#duel-progress');
const roundEl = document.querySelector('#duel-round');
const questionEl = document.querySelector('#duel-question');
const answersEl = document.querySelector('#duel-answers');
const feedbackEl = document.querySelector('#duel-feedback');

const profile = getPlayerProfile();
const currentLanguage = getStoredLanguage();
const params = new URLSearchParams(location.search);

let questionBank = [];
let duel = null;
let currentSlot = 'creator';
let state = null;
let timerHandle = null;
let feedbackHandle = null;

createButton.addEventListener('click', createAndStartDuel);
startButton.addEventListener('click', () => startDuel('challenger'));
copyButton.addEventListener('click', copyDuelLink);

await boot();

async function boot() {
  try {
    questionBank = await loadQuestions();
    const duelId = params.get('id');
    if (duelId) {
      duel = await fetchDuelChallenge(duelId);
      currentSlot = 'challenger';
      createButton.hidden = true;
      startButton.hidden = Boolean(duel.challenger);
      copyButton.hidden = false;
      statusEl.textContent = duel.challenger
        ? 'Esse desafio ja foi respondido. Confira o placar.'
        : `${duel.creator?.nickname || 'Um fã'} te chamou para um X1 de 20 perguntas.`;
      renderScoreboard(duel);
      return;
    }

    statusEl.textContent = 'Crie um desafio de 20 perguntas e mande o link para outro fã tentar bater seu score.';
  } catch (error) {
    statusEl.textContent = `Erro: ${error.message}`;
    createButton.disabled = true;
    startButton.disabled = true;
  }
}

async function createAndStartDuel() {
  createButton.disabled = true;
  statusEl.textContent = 'Criando desafio...';

  try {
    duel = await createDuelChallenge({
      creatorPlayerId: profile.playerId,
      creatorNickname: profile.nickname || 'Fan',
      countryCode: profile.countryCode,
      language: currentLanguage
    });
    currentSlot = 'creator';
    copyButton.hidden = false;
    startDuel('creator');
  } catch (error) {
    createButton.disabled = false;
    statusEl.textContent = `Erro: ${error.message}`;
  }
}

function startDuel(slot) {
  currentSlot = slot;
  const duelQuestions = getDuelQuestions();
  if (duelQuestions.length !== DUEL_QUESTION_COUNT) {
    statusEl.textContent = 'Nao consegui montar as 20 perguntas desse desafio.';
    return;
  }

  clearInterval(timerHandle);
  clearTimeout(feedbackHandle);
  state = createGameSession(duelQuestions, {
    startedAtMs: performance.now(),
    durationMs: DUEL_DURATION_MS
  });
  homeEl.classList.remove('is-active');
  homeEl.style.display = 'none';
  gameEl.classList.add('is-active');
  renderQuestion();
  renderHud();
  timerHandle = setInterval(tick, 180);
}

function tick() {
  if (!state) {
    return;
  }

  renderHud();
  if (getTimeRemaining(state, performance.now()) <= 0) {
    endDuel();
  }
}

function renderQuestion() {
  const question = state.currentQuestion;
  answersEl.innerHTML = '';
  feedbackEl.textContent = '';
  roundEl.textContent = `X1 ${String(state.answeredCount + 1).padStart(2, '0')}/${DUEL_QUESTION_COUNT}`;
  questionEl.textContent = question.prompt;

  question.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.className = 'answer-button';
    button.type = 'button';
    button.textContent = `${String.fromCharCode(65 + index)}. ${choice}`;
    button.addEventListener('click', () => submitAnswer(index));
    answersEl.append(button);
  });
}

function submitAnswer(answerIndex) {
  if (!state || getTimeRemaining(state, performance.now()) <= 0) {
    return;
  }

  const previousQuestion = state.currentQuestion;
  state = answerCurrentQuestion(state, answerIndex, performance.now());
  Array.from(answersEl.querySelectorAll('button')).forEach((button, index) => {
    button.disabled = true;
    if (index === previousQuestion.answerIndex) {
      button.classList.add('is-correct');
    }
    if (index === answerIndex && index !== previousQuestion.answerIndex) {
      button.classList.add('is-wrong');
    }
  });

  const feedback = state.lastFeedback;
  feedbackEl.textContent = formatAnswerFeedback({
    correct: feedback.correct,
    points: feedback.points,
    combo: state.combo,
    correctChoice: previousQuestion.choices[previousQuestion.answerIndex],
    explanation: feedback.explanation,
    language: currentLanguage
  });

  renderHud();
  clearTimeout(feedbackHandle);
  feedbackHandle = setTimeout(() => {
    if (!state) {
      return;
    }
    if (state.answeredCount >= DUEL_QUESTION_COUNT || getTimeRemaining(state, performance.now()) <= 0) {
      endDuel();
      return;
    }
    renderQuestion();
  }, 620);
}

async function endDuel() {
  clearInterval(timerHandle);
  clearTimeout(feedbackHandle);

  const finalState = state;
  state = null;
  const answered = finalState?.answeredCount ?? 0;
  const correct = finalState?.correctCount ?? 0;
  const accuracy = answered === 0 ? 0 : correct / answered;

  questionEl.textContent = 'Enviando resultado do X1...';
  answersEl.innerHTML = '';
  feedbackEl.textContent = '';

  try {
    duel = await submitDuelResult({
      challengeId: duel.id,
      slot: currentSlot,
      playerId: profile.playerId,
      nickname: profile.nickname || 'Fan',
      countryCode: profile.countryCode,
      score: finalState?.score ?? 0,
      accuracy,
      maxCombo: finalState?.maxCombo ?? 1,
      answered: DUEL_QUESTION_COUNT,
      language: currentLanguage
    });

    gameEl.classList.remove('is-active');
    homeEl.style.display = '';
    homeEl.classList.add('is-active');
    createButton.hidden = true;
    startButton.hidden = true;
    copyButton.hidden = false;
    statusEl.textContent = currentSlot === 'creator'
      ? 'Seu resultado foi salvo. Agora copie o link e desafie outro fã.'
      : getResultText(duel);
    renderScoreboard(duel);
  } catch (error) {
    feedbackEl.textContent = `Erro: ${error.message}`;
  }
}

function renderHud() {
  const remainingMs = state ? getTimeRemaining(state, performance.now()) : DUEL_DURATION_MS;
  timerEl.textContent = formatTime(remainingMs);
  scoreEl.textContent = String(state?.score ?? 0);
  comboEl.textContent = `x${state?.combo ?? 1}`;
  progressEl.textContent = `${Math.min(state?.answeredCount ?? 0, DUEL_QUESTION_COUNT)}/${DUEL_QUESTION_COUNT}`;
}

function renderScoreboard(currentDuel) {
  const creator = currentDuel.creator;
  const challenger = currentDuel.challenger;
  scoreboardEl.innerHTML = `
    ${renderPlayerCard('Criador', creator)}
    ${renderPlayerCard('Desafiante', challenger)}
    <article class="duel-result-card">
      <span>Resultado</span>
      <strong>${escapeHtml(formatWinner(currentDuel))}</strong>
    </article>
  `;
}

function renderPlayerCard(label, player) {
  if (!player) {
    return `
      <article class="duel-player-card is-empty">
        <span>${label}</span>
        <strong>Aguardando</strong>
        <p>Sem resultado ainda.</p>
      </article>
    `;
  }

  return `
    <article class="duel-player-card">
      <span>${label}</span>
      <strong>${escapeHtml(player.nickname)}</strong>
      <p>${Number(player.score || 0)} pts · ${Math.round(Number(player.accuracy || 0) * 100)}% · x${Number(player.maxCombo || 1)}</p>
    </article>
  `;
}

function getResultText(currentDuel) {
  if (currentDuel.winner === 'challenger') {
    return 'Você venceu o X1.';
  }
  if (currentDuel.winner === 'creator') {
    return 'O criador venceu o X1.';
  }
  if (currentDuel.winner === 'tie') {
    return 'Empate absurdo no X1.';
  }
  return 'Resultado enviado.';
}

function formatWinner(currentDuel) {
  if (!currentDuel.creator || !currentDuel.challenger) {
    return 'Aguardando desafiante';
  }
  if (currentDuel.winner === 'creator') {
    return `${currentDuel.creator.nickname} venceu`;
  }
  if (currentDuel.winner === 'challenger') {
    return `${currentDuel.challenger.nickname} venceu`;
  }
  return 'Empate';
}

async function copyDuelLink() {
  const link = `${location.origin}${location.pathname}?id=${duel.id}`;
  try {
    await navigator.clipboard.writeText(link);
    statusEl.textContent = 'Link do X1 copiado.';
  } catch {
    statusEl.textContent = link;
  }
}

async function loadQuestions() {
  const response = await fetch('./data/questions.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Nao consegui carregar perguntas (${response.status}).`);
  }
  const rawQuestions = await response.json();
  const result = normalizeQuestionBank(rawQuestions);
  return result.questions;
}

function getDuelQuestions() {
  const byId = new Map(questionBank.map((question) => [question.id, question]));
  return duel.questionIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((question) => shuffleQuestionChoices(localizeQuestion(question, currentLanguage), Math.random));
}

function getStoredLanguage() {
  try {
    return getLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
