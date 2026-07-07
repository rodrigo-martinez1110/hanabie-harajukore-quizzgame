export async function createDuelChallenge(payload) {
  const response = await fetch('/api/duel-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.errors?.join(' ') || 'Could not create duel.');
  }
  return data.duel;
}

export async function fetchDuelChallenge(challengeId) {
  const response = await fetch(`/api/duel?id=${encodeURIComponent(challengeId)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Could not load duel.');
  }
  return data.duel;
}

export async function submitDuelResult(payload) {
  const response = await fetch('/api/duel-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.errors?.join(' ') || 'Could not submit duel result.');
  }
  return data.duel;
}
