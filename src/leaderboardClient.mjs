import {
  COUNTRY_STORAGE_KEY,
  NICKNAME_STORAGE_KEY,
  PLAYER_ID_STORAGE_KEY,
  createUuid,
  sanitizeNickname,
  validateCountryCode
} from './leaderboard.mjs';

export function getPlayerProfile(storage = localStorage) {
  let playerId = storage.getItem(PLAYER_ID_STORAGE_KEY);
  if (!playerId) {
    playerId = createUuid();
    storage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
  }

  return {
    playerId,
    nickname: storage.getItem(NICKNAME_STORAGE_KEY) || '',
    countryCode: validateCountryCode(storage.getItem(COUNTRY_STORAGE_KEY)) || 'BR'
  };
}

export function savePlayerProfile(profile, storage = localStorage) {
  storage.setItem(NICKNAME_STORAGE_KEY, sanitizeNickname(profile.nickname));
  storage.setItem(COUNTRY_STORAGE_KEY, validateCountryCode(profile.countryCode) || 'BR');
}

export async function submitLeaderboardScore(score) {
  const response = await fetch('/api/submit-score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(score)
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || payload.errors?.join(' ') || 'Could not submit score.');
  }

  return payload.score;
}

export async function fetchLeaderboard(options = {}) {
  const params = new URLSearchParams({
    scope: options.scope || 'global',
    period: options.period || 'all'
  });

  if (options.countryCode) {
    params.set('country', options.countryCode);
  }
  if (options.playerId) {
    params.set('playerId', options.playerId);
  }

  const response = await fetch(`/api/leaderboard?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Could not load leaderboard.');
  }

  return payload.scores;
}
