export function shuffleQuestionChoices(question, random = Math.random) {
  const choicesWithAnswer = question.choices.map((choice, index) => ({
    choice,
    isAnswer: index === question.answerIndex
  }));

  const shuffledChoices = shuffleArray(choicesWithAnswer, random);
  const answerIndex = shuffledChoices.findIndex((entry) => entry.isAnswer);

  return {
    ...question,
    choices: shuffledChoices.map((entry) => entry.choice),
    answerIndex
  };
}

export function shuffleQuestions(source, random = Math.random, options = {}) {
  const recentQuestionIds = new Set(options.recentQuestionIds || []);
  const preferredFreshCount = Math.max(0, Number(options.preferredFreshCount) || 0);
  const shuffled = shuffleArray(source, random);

  if (recentQuestionIds.size === 0 || preferredFreshCount === 0) {
    return shuffled.map((question) => shuffleQuestionChoices(question, random));
  }

  const freshQuestions = shuffled.filter((question) => !recentQuestionIds.has(question.id));
  const recentQuestions = shuffled.filter((question) => recentQuestionIds.has(question.id));
  const enoughFreshQuestions = freshQuestions.length >= preferredFreshCount;
  const orderedQuestions = enoughFreshQuestions
    ? [...freshQuestions, ...recentQuestions]
    : shuffled;

  return orderedQuestions.map((question) => shuffleQuestionChoices(question, random));
}

function shuffleArray(source, random) {
  const items = [...source];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(clampRandom(random()) * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function clampRandom(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return Math.max(0, Math.min(0.999999, number));
}
