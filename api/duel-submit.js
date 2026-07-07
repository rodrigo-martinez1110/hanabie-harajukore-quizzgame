import {
  buildDuelLookupQuery,
  getDuelSubmitPatch,
  getSlotIsEmpty,
  mapDuelRow
} from './_duelShared.mjs';
import {
  createJsonResponse,
  createRateLimiter,
  getRequestClientKey,
  getSupabaseConfig,
  getSupabaseHeaders,
  parseJsonBody,
  PayloadTooLargeError
} from './_leaderboardShared.mjs';
import { getDuelStatus, validateDuelSubmitPayload } from '../src/duel.mjs';

const submitDuelLimiter = createRateLimiter({
  maxAttempts: 16,
  windowMs: 60_000
});

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    createJsonResponse(response, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const rawPayload = await parseJsonBody(request);
    const clientKey = getRequestClientKey(request);
    const playerKey = typeof rawPayload.playerId === 'string' ? rawPayload.playerId : 'no-player';
    const rateLimit = submitDuelLimiter(`${clientKey}:${playerKey}`);
    if (!rateLimit.allowed) {
      response.setHeader('Retry-After', String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
      createJsonResponse(response, 429, { error: 'Too many duel submissions. Try again soon.' });
      return;
    }

    const validation = validateDuelSubmitPayload(rawPayload);
    if (!validation.ok) {
      createJsonResponse(response, 400, { errors: validation.errors });
      return;
    }

    const config = getSupabaseConfig();
    const existing = await fetchExistingDuel(config, validation.value.challengeId);
    if (!existing) {
      createJsonResponse(response, 404, { error: 'Duel not found.' });
      return;
    }
    if (!getSlotIsEmpty(existing, validation.value.slot)) {
      createJsonResponse(response, 409, { error: 'This duel slot already has a result.' });
      return;
    }

    const submittedAt = new Date().toISOString();
    const patch = {
      ...getDuelSubmitPatch(validation.value),
      [`${validation.value.slot}_submitted_at`]: submittedAt
    };
    const simulatedRow = { ...existing, ...patch };
    patch.winner = getDuelStatus(mapDuelRow(simulatedRow)).winner;

    const slotScoreColumn = validation.value.slot === 'creator' ? 'creator_score' : 'challenger_score';
    const params = new URLSearchParams({
      id: `eq.${validation.value.challengeId}`,
      [slotScoreColumn]: 'is.null'
    });
    const supabaseResponse = await fetch(`${config.url}/rest/v1/duel_challenges?${params.toString()}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(config.serviceRoleKey, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify(patch)
    });

    if (!supabaseResponse.ok) {
      const message = await supabaseResponse.text();
      throw new Error(`Supabase duel update failed with ${supabaseResponse.status}: ${message}`);
    }

    const rows = await supabaseResponse.json();
    if (!rows[0]) {
      createJsonResponse(response, 409, { error: 'This duel slot already has a result.' });
      return;
    }

    createJsonResponse(response, 200, { duel: mapDuelRow(rows[0]) });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      createJsonResponse(response, 413, { error: 'Request body is too large.' });
      return;
    }
    if (error instanceof SyntaxError) {
      createJsonResponse(response, 400, { error: 'Invalid JSON payload.' });
      return;
    }

    console.error(error);
    createJsonResponse(response, 500, { error: 'Could not submit duel result.' });
  }
}

async function fetchExistingDuel(config, challengeId) {
  const response = await fetch(`${config.url}/rest/v1/duel_challenges?${buildDuelLookupQuery(challengeId)}`, {
    headers: getSupabaseHeaders(config.serviceRoleKey)
  });

  if (!response.ok) {
    throw new Error(`Supabase duel query failed with ${response.status}.`);
  }

  const rows = await response.json();
  return rows[0] || null;
}
