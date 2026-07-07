export const DEFAULT_LANGUAGE = 'pt-BR';
export const SUPPORTED_LANGUAGES = ['pt-BR', 'en'];

const UI_COPY = {
  unofficialQuiz: {
    'pt-BR': 'Fan quiz nao oficial',
    en: 'Unofficial fan quiz'
  },
  startButton: {
    'pt-BR': 'Jogar',
    en: 'Play'
  },
  playAgainButton: {
    'pt-BR': 'Jogar de novo',
    en: 'Play again'
  },
  audioButton: {
    'pt-BR': 'Carregar minha musica',
    en: 'Load my music'
  },
  demoTrackButton: {
    'pt-BR': 'Tocar faixa demo',
    en: 'Play demo track'
  },
  clearAudioButton: {
    'pt-BR': 'Remover musica',
    en: 'Remove music'
  },
  menuButton: {
    'pt-BR': 'Menu',
    en: 'Menu'
  },
  restartButton: {
    'pt-BR': 'Reiniciar',
    en: 'Restart'
  },
  howButton: {
    'pt-BR': 'Como funciona',
    en: 'How it works'
  },
  audioIdle: {
    'pt-BR': 'Audio local opcional. Nada e enviado.',
    en: 'Optional local audio. Nothing is uploaded.'
  },
  audioLoaded: {
    'pt-BR': '{count} perguntas carregadas. Audio local opcional.',
    en: '{count} questions loaded. Optional local audio.'
  },
  audioPlaying: {
    'pt-BR': '{name} tocando localmente. Nada e enviado.',
    en: '{name} playing locally. Nothing is uploaded.'
  },
  demoPlaying: {
    'pt-BR': '{name} tocando em tempo real. Sem arquivo MP3 no app.',
    en: '{name} playing in real time. No MP3 file in the app.'
  },
  audioCleared: {
    'pt-BR': 'Musica removida. Animacao automatica ativada.',
    en: 'Music removed. Automatic animation enabled.'
  },
  audioUnavailable: {
    'pt-BR': 'Audio local indisponivel: {message}',
    en: 'Local audio unavailable: {message}'
  },
  runLocalServer: {
    'pt-BR': '{message} Rode por um servidor local.',
    en: '{message} Run it through a local server.'
  },
  time: {
    'pt-BR': 'Tempo',
    en: 'Time'
  },
  score: {
    'pt-BR': 'Score',
    en: 'Score'
  },
  combo: {
    'pt-BR': 'Combo',
    en: 'Combo'
  },
  crowd: {
    'pt-BR': 'Crowd',
    en: 'Crowd'
  },
  feverReady: {
    'pt-BR': 'Fever pronto',
    en: 'Fever ready'
  },
  feverMode: {
    'pt-BR': 'FEVER MODE',
    en: 'FEVER MODE'
  },
  round: {
    'pt-BR': 'Round {number}',
    en: 'Round {number}'
  },
  loadingQuestion: {
    'pt-BR': 'Carregando pergunta...',
    en: 'Loading question...'
  },
  difficulty: {
    'pt-BR': 'Nivel {level}/5',
    en: 'Level {level}/5'
  },
  answerCorrect: {
    'pt-BR': '+{points} Combo x{combo}',
    en: '+{points} Combo x{combo}'
  },
  answerWrong: {
    'pt-BR': 'Combo quebrou. Resposta: {answer}',
    en: 'Combo broke. Answer: {answer}'
  },
  result: {
    'pt-BR': 'Resultado',
    en: 'Result'
  },
  accuracy: {
    'pt-BR': 'Precisao',
    en: 'Accuracy'
  },
  maxCombo: {
    'pt-BR': 'Max combo',
    en: 'Max combo'
  },
  answered: {
    'pt-BR': 'Respondidas',
    en: 'Answered'
  },
  officialLinks: {
    'pt-BR': 'Links oficiais',
    en: 'Official links'
  },
  howTitle: {
    'pt-BR': '90 segundos. Combo. Fever.',
    en: '90 seconds. Combo. Fever.'
  },
  howBody: {
    'pt-BR': 'Responda rapido, mantenha a sequencia e suba a Crowd Energy. O audio local, se carregado, anima a tela e fica so no seu dispositivo.',
    en: 'Answer fast, keep your streak, and raise Crowd Energy. Local audio, if loaded, animates the screen and stays on your device.'
  },
  close: {
    'pt-BR': 'Fechar',
    en: 'Close'
  }
};

export const CATEGORY_LABELS = {
  music: {
    'pt-BR': 'Discografia',
    en: 'Discography'
  },
  video: {
    'pt-BR': 'Music Videos',
    en: 'Music Videos'
  },
  members: {
    'pt-BR': 'Integrantes',
    en: 'Member Rush'
  },
  history: {
    'pt-BR': 'Historia',
    en: 'Origin Story'
  },
  hardcore: {
    'pt-BR': 'Fa Hardcore',
    en: 'Hardcore Fan'
  }
};

export function getLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

export function t(key, language = DEFAULT_LANGUAGE, replacements = {}) {
  const template = localizeText(UI_COPY[key], language) || key;
  return interpolate(template, replacements);
}

export function localizeText(value, language = DEFAULT_LANGUAGE) {
  const normalizedLanguage = getLanguage(language);
  if (typeof value === 'string') {
    return value;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }

  return value[normalizedLanguage] || value[DEFAULT_LANGUAGE] || value.en || '';
}

export function localizeChoices(value, language = DEFAULT_LANGUAGE) {
  if (Array.isArray(value)) {
    return value;
  }
  const normalizedLanguage = getLanguage(language);
  if (!value || typeof value !== 'object') {
    return [];
  }

  return value[normalizedLanguage] || value[DEFAULT_LANGUAGE] || value.en || [];
}

export function localizeQuestion(question, language = DEFAULT_LANGUAGE) {
  return {
    ...question,
    prompt: localizeText(question.prompt, language),
    choices: localizeChoices(question.choices, language),
    explanation: localizeText(question.explanation, language)
  };
}

function interpolate(template, replacements) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(replacements[key] ?? `{${key}}`));
}
