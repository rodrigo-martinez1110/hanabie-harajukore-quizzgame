export const SUPPORTED_CATEGORIES = ['music', 'video', 'members', 'history', 'hardcore'];
const DEFAULT_LANGUAGE = 'pt-BR';

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

  const prompt = normalizeLocalizedText(raw.prompt);
  if (!prompt) {
    return { ok: false, error: `Question ${id} is missing prompt.` };
  }

  const choices = normalizeLocalizedChoices(raw.choices);
  if (!hasExactlyFourChoices(choices)) {
    return { ok: false, error: `Question ${id} must have exactly 4 choices.` };
  }

  if (hasEmptyChoice(choices)) {
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
      explanation: normalizeLocalizedText(raw.explanation),
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

function normalizeLocalizedText(value) {
  if (typeof value === 'string') {
    return normalizeText(value);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }

  const localized = {};
  for (const [language, text] of Object.entries(value)) {
    const normalized = normalizeText(text);
    if (normalized) {
      localized[language] = normalized;
    }
  }

  return localized[DEFAULT_LANGUAGE] ? localized : '';
}

function normalizeLocalizedChoices(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeText);
  }
  if (!value || typeof value !== 'object') {
    return [];
  }

  const localized = {};
  for (const [language, choices] of Object.entries(value)) {
    if (Array.isArray(choices)) {
      localized[language] = choices.map(normalizeText);
    }
  }

  return Array.isArray(localized[DEFAULT_LANGUAGE]) ? localized : [];
}

function hasExactlyFourChoices(value) {
  if (Array.isArray(value)) {
    return value.length === 4;
  }

  return Object.values(value).every((choices) => Array.isArray(choices) && choices.length === 4);
}

function hasEmptyChoice(value) {
  if (Array.isArray(value)) {
    return value.some((choice) => !choice);
  }

  return Object.values(value).some((choices) => choices.some((choice) => !choice));
}
