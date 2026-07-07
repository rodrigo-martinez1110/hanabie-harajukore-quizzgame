export const SUPPORTED_CATEGORIES = ['music', 'video', 'members', 'history', 'hardcore'];

export function validateQuestion(raw, seenIds = new Set()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Question must be an object.' };
  }

  const id = normalizeText(raw.id);
  if (!id) {
    return { ok: false, error: 'Question id is required.' };
  }
  if (seenIds.has(id)) {
    return { ok: false, error: `Duplicate id: ${id}` };
  }

  const category = normalizeText(raw.category);
  if (!SUPPORTED_CATEGORIES.includes(category)) {
    return { ok: false, error: `Unsupported category: ${raw.category}` };
  }

  const difficulty = Number(raw.difficulty);
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
    return { ok: false, error: `Invalid difficulty for ${id}; expected 1 to 5.` };
  }

  const prompt = normalizeText(raw.prompt);
  if (!prompt) {
    return { ok: false, error: `Question ${id} is missing prompt.` };
  }

  if (!Array.isArray(raw.choices) || raw.choices.length !== 4) {
    return { ok: false, error: `Question ${id} must have exactly 4 choices.` };
  }

  const choices = raw.choices.map(normalizeText);
  if (choices.some((choice) => !choice)) {
    return { ok: false, error: `Question ${id} has an empty choice.` };
  }

  const answerIndex = Number(raw.answerIndex);
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) {
    return { ok: false, error: `Question ${id} has invalid answerIndex.` };
  }

  return {
    ok: true,
    value: {
      id,
      category,
      difficulty,
      prompt,
      choices,
      answerIndex,
      explanation: normalizeText(raw.explanation),
      sourceUrl: normalizeText(raw.sourceUrl),
      tags: Array.isArray(raw.tags) ? raw.tags.map(normalizeText).filter(Boolean) : []
    }
  };
}

export function normalizeQuestionBank(rawQuestions) {
  if (!Array.isArray(rawQuestions)) {
    return { questions: [], errors: ['Question bank must be a JSON array.'] };
  }

  const seenIds = new Set();
  const questions = [];
  const errors = [];

  for (const rawQuestion of rawQuestions) {
    const result = validateQuestion(rawQuestion, seenIds);
    if (result.ok) {
      questions.push(result.value);
      seenIds.add(result.value.id);
    } else {
      errors.push(result.error);
    }
  }

  return { questions, errors };
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}
