import { createGeneratedDemoAnalyser, createLocalAudioAnalyser, smoothSpectrum } from './audioReactive.mjs';
import { trackAnalyticsEvent } from './analyticsClient.mjs';
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
import { FAN_RANK_TIERS, createUuid, getRankMeaning, sanitizeNickname } from './leaderboard.mjs';
import {
  fetchLeaderboard,
  getPlayerProfile,
  savePlayerProfile,
  submitLeaderboardScore
} from './leaderboardClient.mjs';
import { getLeaderboardEntryClasses, getLeaderboardPositionLabel } from './leaderboardPresentation.mjs';
import { normalizeQuestionBank } from './questionBank.mjs';
import { shuffleQuestions } from './questionShuffle.mjs';
import { calculateFanRank } from './scoring.mjs';

const LANGUAGE_STORAGE_KEY = 'hanabie-quiz-language';
const RECENT_QUESTIONS_STORAGE_KEY = 'hanabie-recent-question-ids';
const DEMO_AUDIO_ENABLED_STORAGE_KEY = 'hanabie-demo-audio-enabled';
const RECENT_QUESTIONS_LIMIT = 48;
const SESSION_RECENT_MARK_COUNT = 24;

const app = document.querySelector('#app');
const screens = {
  start: document.querySelector('#start-screen'),
  game: document.querySelector('#game-screen'),
  results: document.querySelector('#results-screen'),
  leaderboard: document.querySelector('#leaderboard-screen')
};
const startButton = document.querySelector('#start-button');
const playAgainButton = document.querySelector('#play-again-button');
const howButton = document.querySelector('#how-button');
const leaderboardButton = document.querySelector('#leaderboard-button');
const howDialog = document.querySelector('#how-dialog');
const audioInput = document.querySelector('#audio-file-input');
const audioStatus = document.querySelector('#audio-status');
const demoTrackButton = document.querySelector('#demo-track-button');
const clearAudioButton = document.querySelector('#clear-audio-button');
const gameClearAudioButton = document.querySelector('#game-clear-audio-button');
const menuButton = document.querySelector('#menu-button');
const restartButton = document.querySelector('#restart-button');
const resultMenuButton = document.querySelector('#result-menu-button');
const resultLeaderboardButton = document.querySelector('#result-leaderboard-button');
const leaderboardMenuButton = document.querySelector('#leaderboard-menu-button');
const scoreSubmitForm = document.querySelector('#score-submit-form');
const nicknameInput = document.querySelector('#nickname-input');
const countrySelect = document.querySelector('#country-select');
const submitScoreButton = document.querySelector('#submit-score-button');
const submitStatus = document.querySelector('#submit-status');
const leaderboardTabs = Array.from(document.querySelectorAll('[data-board-tab]'));
const leaderboardViews = {
  top10: document.querySelector('#leaderboard-top10-view'),
  mine: document.querySelector('#leaderboard-mine-view'),
  ranks: document.querySelector('#leaderboard-ranks-view')
};
const leaderboardList = document.querySelector('#leaderboard-list');
const leaderboardStatus = document.querySelector('#leaderboard-status');
const leaderboardCountrySelect = document.querySelector('#leaderboard-country-select');
const myBestCard = document.querySelector('#my-best-card');
const myBestStatus = document.querySelector('#my-best-status');
const rankGrid = document.querySelector('#rank-grid');
const scopeButtons = Array.from(document.querySelectorAll('[data-board-scope]'));
const periodButtons = Array.from(document.querySelectorAll('[data-board-period]'));
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
let lastScorePayload = null;
let leaderboardScope = 'global';
let leaderboardPeriod = 'all';
const playerProfile = getPlayerProfile();

startButton.addEventListener('click', startGame);
playAgainButton.addEventListener('click', startGame);
howButton.addEventListener('click', () => howDialog.showModal());
leaderboardButton.addEventListener('click', () => showLeaderboard('top10'));
audioInput.addEventListener('change', handleAudioSelection);
demoTrackButton.addEventListener('click', handleDemoTrackSelection);
clearAudioButton.addEventListener('click', clearAudio);
gameClearAudioButton.addEventListener('click', clearAudio);
menuButton.addEventListener('click', returnToMenu);
restartButton.addEventListener('click', startGame);
resultMenuButton.addEventListener('click', returnToMenu);
resultLeaderboardButton.addEventListener('click', () => showLeaderboard('top10'));
leaderboardMenuButton.addEventListener('click', returnToMenu);
scoreSubmitForm.addEventListener('submit', handleScoreSubmit);
languageButtons.forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.dataset.language));
});
leaderboardTabs.forEach((button) => {
  button.addEventListener('click', () => showLeaderboardTab(button.dataset.boardTab));
});
scopeButtons.forEach((button) => {
  button.addEventListener('click', () => setLeaderboardScope(button.dataset.boardScope));
});
periodButtons.forEach((button) => {
  button.addEventListener('click', () => setLeaderboardPeriod(button.dataset.boardPeriod));
});
leaderboardCountrySelect.addEventListener('change', () => {
  playerProfile.countryCode = leaderboardCountrySelect.value;
  countrySelect.value = playerProfile.countryCode;
  savePlayerProfile(playerProfile);
  loadLeaderboard();
});

applyLanguage();
hydratePlayerForm();
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
    await startDefaultDemoTrack();
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
  const shuffledQuestions = shuffleQuestions(localizedQuestions, Math.random, {
    recentQuestionIds: getRecentQuestionIds(),
    preferredFreshCount: Math.min(SESSION_RECENT_MARK_COUNT, localizedQuestions.length)
  });
  rememberRecentQuestions(shuffledQuestions.slice(0, SESSION_RECENT_MARK_COUNT).map((question) => question.id));
  state = createGameSession(shuffledQuestions, { startedAtMs: performance.now() });
  trackGameEvent('game_started');
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
  trackGameEvent('question_answered', {
    questionId: previousQuestion.id,
    questionCategory: previousQuestion.category,
    questionDifficulty: previousQuestion.difficulty,
    correct: feedback.correct
  });
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
    maxCombo: state?.maxCombo ?? 1,
    answered
  });

  lastScorePayload = {
    playerId: playerProfile.playerId,
    runId: createUuid(),
    nickname: sanitizeNickname(nicknameInput.value || playerProfile.nickname),
    countryCode: countrySelect.value || playerProfile.countryCode,
    score: state?.score ?? 0,
    accuracy,
    maxCombo: state?.maxCombo ?? 1,
    answered,
    language: currentLanguage
  };
  trackGameEvent('game_finished', {
    score: lastScorePayload.score,
    accuracy: lastScorePayload.accuracy,
    maxCombo: lastScorePayload.maxCombo,
    answered: lastScorePayload.answered,
    fanRank: rank.label
  });
  submitScoreButton.disabled = false;
  submitStatus.textContent = t('submitScoreHint', currentLanguage);
  resultRankEl.textContent = rank.label;
  resultScoreEl.textContent = String(state?.score ?? 0);
  resultAccuracyEl.textContent = `${Math.round(accuracy * 100)}%`;
  resultComboEl.textContent = `x${state?.maxCombo ?? 1}`;
  resultAnsweredEl.textContent = String(answered);
  setScreen('results');
}

async function handleScoreSubmit(event) {
  event.preventDefault();
  if (!lastScorePayload) {
    return;
  }

  submitScoreButton.disabled = true;
  submitStatus.textContent = t('submitScoreSending', currentLanguage);
  const nextProfile = {
    nickname: nicknameInput.value,
    countryCode: countrySelect.value
  };
  savePlayerProfile(nextProfile);
  playerProfile.nickname = sanitizeNickname(nextProfile.nickname);
  playerProfile.countryCode = nextProfile.countryCode;

  try {
    const submitted = await submitLeaderboardScore({
      ...lastScorePayload,
      nickname: playerProfile.nickname,
      countryCode: playerProfile.countryCode
    });
    submitStatus.textContent = t('submitScoreSuccess', currentLanguage, {
      rank: submitted.fanRank
    });
    trackGameEvent('score_submitted', {
      score: submitted.score,
      accuracy: submitted.accuracy,
      maxCombo: submitted.maxCombo,
      answered: submitted.answered,
      fanRank: submitted.fanRank
    });
    await loadLeaderboard();
  } catch (error) {
    submitScoreButton.disabled = false;
    submitStatus.textContent = t('submitScoreError', currentLanguage, { message: error.message });
  }
}

async function handleAudioSelection(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  setDemoAudioEnabled(false);
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
  setDemoAudioEnabled(true);
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
  setDemoAudioEnabled(false);
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

function hydratePlayerForm() {
  nicknameInput.value = playerProfile.nickname;
  countrySelect.value = playerProfile.countryCode;
  leaderboardCountrySelect.value = playerProfile.countryCode;
}

function showLeaderboard(tab = 'top10') {
  setScreen('leaderboard');
  showLeaderboardTab(tab);
}

function showLeaderboardTab(tab) {
  const activeTab = leaderboardViews[tab] ? tab : 'top10';
  leaderboardTabs.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.boardTab === activeTab);
  });
  Object.entries(leaderboardViews).forEach(([key, view]) => {
    view.classList.toggle('is-active', key === activeTab);
  });

  if (activeTab === 'top10') {
    loadLeaderboard();
  }
  if (activeTab === 'mine') {
    loadMyBest();
  }
  if (activeTab === 'ranks') {
    renderRankGrid();
  }
}

function setLeaderboardScope(scope) {
  leaderboardScope = scope === 'country' ? 'country' : 'global';
  scopeButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.boardScope === leaderboardScope);
  });
  loadLeaderboard();
}

function setLeaderboardPeriod(period) {
  leaderboardPeriod = ['today', 'week', 'all'].includes(period) ? period : 'all';
  periodButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.boardPeriod === leaderboardPeriod);
  });
  loadLeaderboard();
}

async function loadLeaderboard() {
  leaderboardStatus.textContent = t('leaderboardLoading', currentLanguage);
  leaderboardList.innerHTML = '';

  try {
    const scores = await fetchLeaderboard({
      scope: leaderboardScope,
      period: leaderboardPeriod,
      countryCode: playerProfile.countryCode
    });
    renderScoreList(scores, leaderboardList);
    leaderboardStatus.textContent = scores.length
      ? t('leaderboardLoaded', currentLanguage)
      : t('leaderboardEmpty', currentLanguage);
  } catch (error) {
    leaderboardStatus.textContent = t('leaderboardError', currentLanguage, { message: error.message });
  }
}

async function loadMyBest() {
  myBestStatus.textContent = t('leaderboardLoading', currentLanguage);
  myBestCard.innerHTML = '';

  try {
    const [score] = await fetchLeaderboard({
      scope: 'mine',
      playerId: playerProfile.playerId
    });
    if (!score) {
      myBestStatus.textContent = t('myBestEmpty', currentLanguage);
      return;
    }

    myBestCard.innerHTML = getScoreCardMarkup(score, 1, { showPodiumLabel: false });
    myBestStatus.textContent = t('myBestLoaded', currentLanguage);
  } catch (error) {
    myBestStatus.textContent = t('leaderboardError', currentLanguage, { message: error.message });
  }
}

function renderScoreList(scores, list) {
  list.innerHTML = scores.map((score, index) => `
    <li class="${getLeaderboardEntryClasses(index + 1)}">
      ${getScoreCardMarkup(score, index + 1)}
    </li>
  `).join('');
}

function getScoreCardMarkup(score, position, options = {}) {
  const showPodiumLabel = (options.showPodiumLabel ?? true) && position <= 3;
  const accuracy = Math.round(Number(score.accuracy || 0) * 100);
  return `
    <span class="leaderboard-position">
      <span class="leaderboard-position-number">#${position}</span>
      ${showPodiumLabel ? `<span class="leaderboard-position-title">${escapeHtml(getLeaderboardPositionLabel(position))}</span>` : ''}
    </span>
    <div class="leaderboard-player">
      <strong>${escapeHtml(score.nickname)}</strong>
      <span>${escapeHtml(score.countryCode)} · ${escapeHtml(score.fanRank)}</span>
    </div>
    <div class="leaderboard-score">
      <strong>${Number(score.score || 0)}</strong>
      <span>${accuracy}% · x${Number(score.maxCombo || 1)}</span>
    </div>
  `;
}

function renderRankGrid() {
  rankGrid.innerHTML = FAN_RANK_TIERS.map((tier) => `
    <article class="rank-card">
      <strong>${escapeHtml(tier.label)}</strong>
      <span>${tier.minRating}+ rating</span>
      <p>${escapeHtml(getRankMeaning(tier, currentLanguage))}</p>
    </article>
  `).join('');
}

function trackGameEvent(eventType, details = {}) {
  trackAnalyticsEvent({
    eventType,
    playerId: playerProfile.playerId,
    countryCode: playerProfile.countryCode,
    language: currentLanguage,
    ...details
  });
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
  renderRankGrid();
}

function getStoredLanguage() {
  try {
    return getLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function getRecentQuestionIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_QUESTIONS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function rememberRecentQuestions(questionIds) {
  const mergedIds = [...questionIds, ...getRecentQuestionIds()];
  const uniqueIds = [];
  for (const id of mergedIds) {
    if (id && !uniqueIds.includes(id)) {
      uniqueIds.push(id);
    }
  }
  localStorage.setItem(RECENT_QUESTIONS_STORAGE_KEY, JSON.stringify(uniqueIds.slice(0, RECENT_QUESTIONS_LIMIT)));
}

async function startDefaultDemoTrack() {
  if (!isDemoAudioEnabled() || audioAnalyser) {
    return;
  }

  try {
    audioInput.value = '';
    audioAnalyser = await createGeneratedDemoAnalyser();
    await audioAnalyser.play();
    audioStatus.textContent = t('demoPlaying', currentLanguage, { name: audioAnalyser.title });
  } catch {
    disposeAudioAnalyser();
  }
}

function isDemoAudioEnabled() {
  try {
    return localStorage.getItem(DEMO_AUDIO_ENABLED_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function setDemoAudioEnabled(isEnabled) {
  try {
    localStorage.setItem(DEMO_AUDIO_ENABLED_STORAGE_KEY, isEnabled ? 'true' : 'false');
  } catch {
    // Audio preference is optional; the game works without localStorage.
  }
}

function localizeCategory(category) {
  return CATEGORY_LABELS[category]?.[currentLanguage] || CATEGORY_LABELS[category]?.[DEFAULT_LANGUAGE] || category;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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
