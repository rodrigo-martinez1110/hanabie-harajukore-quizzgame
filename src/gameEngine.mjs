import { calculateAnswerScore, calculateFanRank, getNextCombo } from './scoring.mjs';

const DEFAULT_DURATION_MS = 90_000;
const DEFAULT_QUESTION_TIME_LIMIT_MS = 10_000;
const FEVER_DURATION_MS = 10_000;
const CROWD_ENERGY_PER_CORRECT = 25;

export function createGameSession(questions, options = {}) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('createGameSession requires at least one question.');
  }

  const startedAtMs = Number(options.startedAtMs) || 0;
  const durationMs = Number(options.durationMs) || DEFAULT_DURATION_MS;
  const questionTimeLimitMs = Number(options.questionTimeLimitMs) || DEFAULT_QUESTION_TIME_LIMIT_MS;

  return {
    questions,
    startedAtMs,
    durationMs,
    questionTimeLimitMs,
    questionStartedAtMs: startedAtMs,
    questionIndex: 0,
    currentQuestion: questions[0],
    score: 0,
    combo: 1,
    maxCombo: 1,
    answeredCount: 0,
    correctCount: 0,
    crowdEnergy: 0,
    feverEndsAtMs: 0,
    lastFeedback: null
  };
}

export function answerCurrentQuestion(state, answerIndex, answeredAtMs) {
  const currentQuestion = state.currentQuestion;
  const isCorrect = Number(answerIndex) === currentQuestion.answerIndex;
  const nextCombo = getNextCombo(state.combo, isCorrect);
  const feverActive = state.feverEndsAtMs > answeredAtMs;
  const answerTimeMs = Math.max(0, answeredAtMs - state.questionStartedAtMs);
  const scoreResult = calculateAnswerScore({
    isCorrect,
    answerTimeMs,
    questionTimeLimitMs: state.questionTimeLimitMs,
    combo: nextCombo,
    feverActive,
    difficulty: currentQuestion.difficulty
  });

  const nextQuestionIndex = (state.questionIndex + 1) % state.questions.length;
  const nextCrowdEnergy = calculateCrowdEnergy(state, isCorrect, answeredAtMs);
  const feverTriggered = nextCrowdEnergy >= 100 && !feverActive;
  const feverEndsAtMs = feverTriggered ? answeredAtMs + FEVER_DURATION_MS : state.feverEndsAtMs;
  const crowdEnergy = feverTriggered ? 0 : nextCrowdEnergy;
  const answeredCount = state.answeredCount + 1;
  const correctCount = state.correctCount + (isCorrect ? 1 : 0);
  const score = state.score + scoreResult.points;
  const maxCombo = Math.max(state.maxCombo, nextCombo);
  const accuracy = answeredCount === 0 ? 0 : correctCount / answeredCount;

  return {
    ...state,
    questionIndex: nextQuestionIndex,
    currentQuestion: state.questions[nextQuestionIndex],
    questionStartedAtMs: answeredAtMs,
    score,
    combo: nextCombo,
    maxCombo,
    answeredCount,
    correctCount,
    crowdEnergy,
    feverEndsAtMs,
    lastFeedback: {
      correct: isCorrect,
      selectedIndex: answerIndex,
      correctIndex: currentQuestion.answerIndex,
      points: scoreResult.points,
      speedBonus: scoreResult.speedBonus,
      multiplier: scoreResult.multiplier,
      explanation: currentQuestion.explanation || '',
      rank: calculateFanRank({ score, accuracy, maxCombo })
    }
  };
}

export function getTimeRemaining(state, nowMs) {
  const elapsed = Math.max(0, Number(nowMs) - state.startedAtMs);
  return Math.max(0, state.durationMs - elapsed);
}

function calculateCrowdEnergy(state, isCorrect, answeredAtMs) {
  if (!isCorrect) {
    return Math.max(0, state.crowdEnergy - 15);
  }

  const feverActive = state.feverEndsAtMs > answeredAtMs;
  if (feverActive) {
    return state.crowdEnergy;
  }

  const difficultyBonus = Math.max(0, (state.currentQuestion.difficulty || 1) - 1) * 5;
  return Math.min(100, state.crowdEnergy + CROWD_ENERGY_PER_CORRECT + difficultyBonus);
}
