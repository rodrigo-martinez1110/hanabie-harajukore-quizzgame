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

export function shuffleQuestions(source, random = Math.random) {
  return shuffleArray(source, random).map((question) => shuffleQuestionChoices(question, random));
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
