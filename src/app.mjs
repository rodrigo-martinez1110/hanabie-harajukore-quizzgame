import { createGeneratedDemoAnalyser, createLocalAudioAnalyser, smoothSpectrum } from './audioReactive.mjs';
import { answerCurrentQuestion, createGameSession, getTimeRemaining } from './gameEngine.mjs';
import { formatAnswerFeedback, formatDifficultyLabel } from './feedback.mjs';
import {
  CATEGORY_LABELS,
  DEFAULT_LANGUAGE,
  getDocumentLanguage,
  getLanguage,
  localizeQuestion,
  t
} from './i18n.mjs';
import { normalizeQuestionBank } from './questionBank.mjs';
import { shuffleQuestions } from './questionShuffle.mjs';
import { calculateFanRank } from './scoring.mjs';

const LANGUAGE_STORAGE_KEY = 'hanabie-quiz-language';

const app = document.querySelector('#app');
const screens = {
  start: document.querySelector('#start-screen'),
  game: document.querySelector('#game-screen'),
  results: document.querySelector('#results-screen')
};
const startButton = document.querySelector('#start-button');
const playAgainButton = document.querySelector('#play-again-button');
const howButton = document.querySelector('#how-button');
const howDialog = document.querySelector('#how-dialog');
const audioInput = document.querySelector('#audio-file-input');
const audioStatus = document.querySelector('#audio-status');
const demoTrackButton = document.querySelector('#demo-track-button');
const clearAudioButton = document.querySelector('#clear-audio-button');
const gameClearAudioButton = document.querySelector('#game-clear-audio-button');
const menuButton = document.querySelector('#menu-button');
const restartButton = document.querySelector('#restart-button');
const resultMenuButton = document.querySelector('#result-menu-button');
const languageButtons = Array.from(document.querySelectorAll('[data-language]'));
const timerEl = document.querySelector('#timer');
const scoreEl = document.querySelector('#score');
const comboEl = document.querySelector('#combo');
const crowdMeterEl = document.querySelector('#crowd-meter');
const categoryLabelEl = document.querySelector('#category-label');
const difficultyLabelEl = document.querySelector('#difficulty-label');
const feverLabelEl = document.querySelector('#fever-label');
const roundLabelEl = document.querySelector('#round-label');
const questionTextEl = document.querySelector('#question-text');
const answersEl = document.querySelector('#answers');
const feedbackEl = document.querySelector('#feedback');
const visualizer = document.querySelector('#visualizer');
const visualizerContext = visualizer.getContext('2d');
const resultRankEl = document.querySelector('#rank-title');
const resultScoreEl = document.querySelector('#result-score');
const resultAccuracyEl = document.querySelector('#result-accuracy');
const resultComboEl = document.querySelector('#result-combo');
const resultAnsweredEl = document.querySelector('#result-answered');

let questions = [];
let state = null;
let timerHandle = null;
let feedbackHandle = null;
let audioAnalyser = null;
let audioSpectrum = { bass: 0.22, mid: 0.22, treble: 0.22, pulse: 0.22 };
let autoPulseTime = 0;
let currentLanguage = getStoredLanguage();

startButton.addEventListener('click', startGame);
playAgainButton.addEventListener('click', startGame);
howButton.addEventListener('click', () => howDialog.showModal());
audioInput.addEventListener('change', handleAudioSelection);
demoTrackButton.addEventListener('click', handleDemoTrackSelection);
clearAudioButton.addEventListener('click', clearAudio);
gameClearAudioButton.addEventListener('click', clearAudio);
menuButton.addEventListener('click', returnToMenu);
restartButton.addEventListener('click', startGame);
resultMenuButton.addEventListener('click', returnToMenu);
languageButtons.forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.dataset.language));
});

applyLanguage();
await boot();
requestAnimationFrame(animateVisuals);

async function boot() {
  try {
    const response = await fetch('./data/questions.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Nao consegui carregar data/questions.json (${response.status}).`);
    }

    const rawQuestions = await response.json();
    const result = normalizeQuestionBank(rawQuestions);
    questions = result.questions;

    if (result.errors.length > 0) {
      console.warn('Algumas perguntas foram ignoradas:', result.errors);
    }
    if (questions.length === 0) {
      throw new Error('Nenhuma pergunta valida encontrada em data/questions.json.');
    }

    audioStatus.textContent = t('audioLoaded', currentLanguage, { count: questions.length });
    startButton.disabled = false;
  } catch (error) {
    startButton.disabled = true;
    audioStatus.textContent = t('runLocalServer', currentLanguage, { message: error.message });
  }
}

function startGame() {
  if (questions.length === 0) {
    return;
  }

  clearInterval(timerHandle);
  clearTimeout(feedbackHandle);
  const localizedQuestions = questions.map((question) => localizeQuestion(question, currentLanguage));
  const shuffledQuestions = shuffleQuestions(localizedQuestions);
  state = createGameSession(shuffledQuestions, { startedAtMs: performance.now() });
  setScreen('game');
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
    endGame();
  }
}

function renderQuestion() {
  const question = state.currentQuestion;
  answersEl.innerHTML = '';
  feedbackEl.textContent = '';
  roundLabelEl.textContent = t('round', currentLanguage, {
    number: String(state.answeredCount + 1).padStart(2, '0')
  });
  questionTextEl.textContent = question.prompt;
  categoryLabelEl.textContent = localizeCategory(question.category);
  difficultyLabelEl.textContent = formatDifficultyLabel(question.difficulty, currentLanguage);

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
  const buttons = Array.from(answersEl.querySelectorAll('button'));
  buttons.forEach((button, index) => {
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
    if (state && getTimeRemaining(state, performance.now()) > 0) {
      renderQuestion();
    }
  }, 780);
}

function renderHud() {
  const now = performance.now();
  const remainingMs = state ? getTimeRemaining(state, now) : 90_000;
  const feverActive = state ? state.feverEndsAtMs > now : false;
  timerEl.textContent = formatTime(remainingMs);
  scoreEl.textContent = String(state?.score ?? 0);
  comboEl.textContent = `x${state?.combo ?? 1}`;
  crowdMeterEl.style.width = `${state?.crowdEnergy ?? 0}%`;
  feverLabelEl.textContent = feverActive ? t('feverMode', currentLanguage) : t('feverReady', currentLanguage);
  feverLabelEl.classList.toggle('is-hot', feverActive);
  app.style.setProperty('--fever-pulse', feverActive ? '1' : '0');
}

function endGame() {
  clearInterval(timerHandle);
  clearTimeout(feedbackHandle);

  const answered = state?.answeredCount ?? 0;
  const correct = state?.correctCount ?? 0;
  const accuracy = answered === 0 ? 0 : correct / answered;
  const rank = calculateFanRank({
    score: state?.score ?? 0,
    accuracy,
    maxCombo: state?.maxCombo ?? 1
  });

  resultRankEl.textContent = rank.label;
  resultScoreEl.textContent = String(state?.score ?? 0);
  resultAccuracyEl.textContent = `${Math.round(accuracy * 100)}%`;
  resultComboEl.textContent = `x${state?.maxCombo ?? 1}`;
  resultAnsweredEl.textContent = String(answered);
  setScreen('results');
}

async function handleAudioSelection(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    disposeAudioAnalyser();
    const nextAudioElement = new Audio();
    audioAnalyser = await createLocalAudioAnalyser(file, nextAudioElement);
    await audioAnalyser.play();
    audioStatus.textContent = t('audioPlaying', currentLanguage, { name: file.name });
  } catch (error) {
    audioAnalyser = null;
    audioStatus.textContent = t('audioUnavailable', currentLanguage, { message: error.message });
  }
}

async function handleDemoTrackSelection() {
  try {
    disposeAudioAnalyser();
    audioInput.value = '';
    audioAnalyser = await createGeneratedDemoAnalyser();
    await audioAnalyser.play();
    audioStatus.textContent = t('demoPlaying', currentLanguage, { name: audioAnalyser.title });
  } catch (error) {
    audioAnalyser = null;
    audioStatus.textContent = t('audioUnavailable', currentLanguage, { message: error.message });
  }
}

function clearAudio() {
  disposeAudioAnalyser();
  audioInput.value = '';
  audioStatus.textContent = t('audioCleared', currentLanguage);
}

function disposeAudioAnalyser() {
  audioAnalyser?.dispose();
  audioAnalyser = null;
}

function returnToMenu() {
  clearInterval(timerHandle);
  clearTimeout(feedbackHandle);
  state = null;
  answersEl.innerHTML = '';
  feedbackEl.textContent = '';
  questionTextEl.textContent = t('loadingQuestion', currentLanguage);
  setScreen('start');
  applyLanguage();
}

function setLanguage(language) {
  currentLanguage = getLanguage(language);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  applyLanguage();
  if (state) {
    endGame();
  }
}

function applyLanguage() {
  document.documentElement.lang = getDocumentLanguage(currentLanguage);
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n, currentLanguage);
  });
  languageButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.language === currentLanguage);
  });

  if (!startButton.disabled && questions.length > 0) {
    audioStatus.textContent = t('audioLoaded', currentLanguage, { count: questions.length });
  }
  if (!state) {
    questionTextEl.textContent = t('loadingQuestion', currentLanguage);
    difficultyLabelEl.textContent = formatDifficultyLabel(1, currentLanguage);
    categoryLabelEl.textContent = localizeCategory('music');
    feverLabelEl.textContent = t('feverReady', currentLanguage);
  }
}

function getStoredLanguage() {
  try {
    return getLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function localizeCategory(category) {
  return CATEGORY_LABELS[category]?.[currentLanguage] || CATEGORY_LABELS[category]?.[DEFAULT_LANGUAGE] || category;
}

function animateVisuals() {
  autoPulseTime += 0.045 + audioSpectrum.pulse * 0.035;
  const nextSpectrum = getNextSpectrum();
  audioSpectrum = smoothSpectrum(audioSpectrum, nextSpectrum, { rise: 0.42, fall: 0.16 });
  app.style.setProperty('--audio-pulse', String(audioSpectrum.pulse));
  drawVisualizer(audioSpectrum);
  requestAnimationFrame(animateVisuals);
}

function getNextSpectrum() {
  if (audioAnalyser) {
    return audioAnalyser.getSpectrum();
  }

  const bass = 0.22 + Math.abs(Math.sin(autoPulseTime * 0.92)) * 0.42;
  const mid = 0.18 + Math.abs(Math.sin(autoPulseTime * 1.34 + 0.8)) * 0.36;
  const treble = 0.14 + Math.abs(Math.sin(autoPulseTime * 2.1 + 1.7)) * 0.28;
  const pulse = roundToTwoDecimals(bass * 0.5 + mid * 0.32 + treble * 0.18);
  return { bass, mid, treble, pulse };
}

function drawVisualizer(currentSpectrum) {
  const width = visualizer.width;
  const height = visualizer.height;
  visualizerContext.clearRect(0, 0, width, height);
  visualizerContext.fillStyle = `rgba(57, 236, 255, ${0.08 + currentSpectrum.pulse * 0.16})`;
  visualizerContext.fillRect(0, 0, width, height);

  const bars = 64;
  const gap = 3;
  const barWidth = (width - gap * (bars - 1)) / bars;

  for (let index = 0; index < bars; index += 1) {
    const position = bars === 1 ? 0 : index / (bars - 1);
    const bandLevel = getBarBandLevel(currentSpectrum, position);
    const shimmer = Math.sin(autoPulseTime * (1.2 + position) + index * 0.42) * 0.5 + 0.5;
    const localPulse = currentSpectrum.pulse * (0.16 + position * 0.12);
    const intensity = Math.max(0.06, bandLevel * (0.62 + shimmer * 0.42) + localPulse);
    const barHeight = Math.min(height - 10, intensity * height);
    const x = index * (barWidth + gap);
    const y = height - barHeight;
    visualizerContext.fillStyle = getBarColor(position, currentSpectrum);
    visualizerContext.fillRect(x, y, barWidth, barHeight);
  }
}

function getBarBandLevel(spectrum, position) {
  if (position < 0.32) {
    return spectrum.bass;
  }
  if (position < 0.72) {
    return spectrum.mid;
  }
  return spectrum.treble;
}

function getBarColor(position, spectrum) {
  if (position < 0.32) {
    return `rgba(255, 76, 168, ${0.72 + spectrum.bass * 0.28})`;
  }
  if (position < 0.72) {
    return `rgba(57, 236, 255, ${0.68 + spectrum.mid * 0.32})`;
  }
  return `rgba(255, 232, 84, ${0.64 + spectrum.treble * 0.36})`;
}

function setScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove('is-active'));
  screens[name].classList.add('is-active');
}

function formatTime(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}
