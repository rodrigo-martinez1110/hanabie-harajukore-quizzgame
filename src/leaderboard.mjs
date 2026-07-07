export const PLAYER_ID_STORAGE_KEY = 'hanabie-player-id';
export const NICKNAME_STORAGE_KEY = 'hanabie-player-nickname';
export const COUNTRY_STORAGE_KEY = 'hanabie-player-country';

export const FAN_RANK_TIERS = [
  {
    id: 'sweet-rookie',
    label: 'Sweet Rookie',
    minRating: 0,
    meanings: {
      'pt-BR': 'Primeiro passo no pit. Ainda esta pegando o ritmo.',
      en: 'First step in the pit. Still finding the rhythm.',
      es: 'Primer paso en el pit. Todavia esta tomando el ritmo.',
      ja: 'ピットへの第一歩。まだリズムをつかんでいる途中。'
    }
  },
  {
    id: 'neet-gamer',
    label: 'NEET Gamer',
    minRating: 1200,
    meanings: {
      'pt-BR': 'Ja conhece musicas e membros, mas ainda tropeça nas dificeis.',
      en: 'Knows songs and members, but still stumbles on the hard ones.',
      es: 'Ya conoce canciones e integrantes, pero tropieza en las dificiles.',
      ja: '曲とメンバーは知っているけど、難問ではまだつまずく。'
    }
  },
  {
    id: 'harajuku-core-spark',
    label: 'Harajuku-Core Spark',
    minRating: 2100,
    meanings: {
      'pt-BR': 'Comecou a entender a mistura caos, kawaii e breakdown.',
      en: 'Starting to understand the chaos, kawaii, and breakdown mix.',
      es: 'Empieza a entender la mezcla de caos, kawaii y breakdown.',
      ja: 'カオス、kawaii、ブレイクダウンの混ざり方が見えてきた。'
    }
  },
  {
    id: 'bucchigiri-breaker',
    label: 'Bucchigiri Breaker',
    minRating: 3000,
    meanings: {
      'pt-BR': 'Acerta bem, mantem combo e joga no ritmo.',
      en: 'Answers well, keeps combo, and plays on beat.',
      es: 'Acierta bien, mantiene combo y juega con ritmo.',
      ja: 'よく当てて、コンボを守り、ビートに乗って遊べている。'
    }
  },
  {
    id: 'mosh-pit-royalty',
    label: 'Mosh Pit Royalty',
    minRating: 3800,
    meanings: {
      'pt-BR': 'Nivel fa forte. Poucos erros e score alto no pit.',
      en: 'Strong fan level. Few misses and a high score in the pit.',
      es: 'Nivel de fan fuerte. Pocos errores y score alto en el pit.',
      ja: '強いファンのレベル。ミスが少なく、ピットで高スコア。'
    }
  },
  {
    id: 'fever-headliner',
    label: 'Fever Headliner',
    minRating: 5000,
    meanings: {
      'pt-BR': 'Joga como quem entrou em modo fever.',
      en: 'Plays like they entered fever mode.',
      es: 'Juega como si hubiera entrado en modo fever.',
      ja: 'Feverモードに入ったみたいなプレイ。'
    }
  },
  {
    id: 'hanabie-legend',
    label: 'Hanabie. Legend',
    minRating: 6500,
    meanings: {
      'pt-BR': 'Ranking absurdo. Coisa de fa que sabe detalhe de tour, lancamento e lore.',
      en: 'Wild ranking. For fans who know tour, release, and lore details.',
      es: 'Ranking absurdo. Para fans que saben detalles de giras, lanzamientos y lore.',
      ja: '圧倒的なランク。ツアー、リリース、ロアまで知るファン向け。'
    }
  }
];

const MAX_SCORE = 100_000;
const MAX_ANSWERED = 80;
const MAX_COMBO = 5;
const SUPPORTED_LANGUAGES = ['pt-BR', 'en', 'es', 'ja'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function calculateLeaderboardRating(input) {
  const score = clampInteger(input?.score, 0, MAX_SCORE);
  const accuracy = clampNumber(input?.accuracy, 0, 1);
  const maxCombo = clampInteger(input?.maxCombo, 0, MAX_COMBO);
  const answered = clampInteger(input?.answered, 0, MAX_ANSWERED);

  return Math.round(score + accuracy * 1000 + maxCombo * 200 + answered * 25);
}

export function getFanRankTier(rating) {
  const normalizedRating = Math.max(0, Number(rating) || 0);
  return FAN_RANK_TIERS.reduce((selected, tier) =>
    normalizedRating >= tier.minRating ? tier : selected
  );
}

export function getRankMeaning(tier, language = 'pt-BR') {
  if (!tier?.meanings) {
    return '';
  }
  return tier.meanings[language] || tier.meanings['pt-BR'] || tier.meanings.en || '';
}

export function sanitizeNickname(value) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 18);

  return normalized.length >= 2 ? normalized : 'Fan';
}

export function validateCountryCode(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : '';
}

export function validateScoreSubmission(raw) {
  const errors = [];
  const playerId = String(raw?.playerId ?? '').trim();
  const runId = String(raw?.runId ?? '').trim();
  const nickname = sanitizeNickname(raw?.nickname);
  const countryCode = validateCountryCode(raw?.countryCode);
  const score = Number(raw?.score);
  const accuracy = Number(raw?.accuracy);
  const maxCombo = Number(raw?.maxCombo);
  const answered = Number(raw?.answered);
  const language = SUPPORTED_LANGUAGES.includes(raw?.language) ? raw.language : 'pt-BR';

  if (!UUID_PATTERN.test(playerId)) {
    errors.push('playerId must be a UUID.');
  }
  if (!UUID_PATTERN.test(runId)) {
    errors.push('runId must be a UUID.');
  }
  if (!countryCode) {
    errors.push('countryCode must use two letters.');
  }
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    errors.push(`score must be an integer between 0 and ${MAX_SCORE}.`);
  }
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    errors.push('accuracy must be between 0 and 1.');
  }
  if (!Number.isInteger(maxCombo) || maxCombo < 1 || maxCombo > MAX_COMBO) {
    errors.push(`maxCombo must be between 1 and ${MAX_COMBO}.`);
  }
  if (!Number.isInteger(answered) || answered < 0 || answered > MAX_ANSWERED) {
    errors.push(`answered must be between 0 and ${MAX_ANSWERED}.`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const rating = calculateLeaderboardRating({ score, accuracy, maxCombo, answered });
  const fanRank = getFanRankTier(rating).label;

  return {
    ok: true,
    value: {
      playerId,
      runId,
      nickname,
      countryCode,
      score,
      accuracy,
      maxCombo,
      answered,
      rating,
      fanRank,
      language
    }
  };
}

export function createUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (character) =>
    (Number(character) ^ (Math.random() * 16) >> (Number(character) / 4)).toString(16)
  );
}

function clampInteger(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
