import { readFile } from 'node:fs/promises';

import { mapDuelRow } from './_duelShared.mjs';
import {
  createJsonResponse,
  createRateLimiter,
  getRequestClientKey,
  getSupabaseConfig,
  getSupabaseHeaders,
  parseJsonBody,
  PayloadTooLargeError
} from './_leaderboardShared.mjs';
import { DUEL_QUESTION_COUNT, selectDuelQuestionIds, validateDuelCreatePayload } from '../src/duel.mjs';
import { normalizeQuestionBank } from '../src/questionBank.mjs';

const createDuelLimiter = createRateLimiter({
  maxAttempts: 12,
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
    const playerKey = typeof rawPayload.creatorPlayerId === 'string' ? rawPayload.creatorPlayerId : 'no-player';
    const rateLimit = createDuelLimiter(`${clientKey}:${playerKey}`);
    if (!rateLimit.allowed) {
      response.setHeader('Retry-After', String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
      createJsonResponse(response, 429, { error: 'Too many duel creations. Try again soon.' });
      return;
    }

    const validation = validateDuelCreatePayload(rawPayload);
    if (!validation.ok) {
      createJsonResponse(response, 400, { errors: validation.errors });
      return;
    }

    const questionIds = await loadQuestionIds();
    const config = getSupabaseConfig();
    const supabaseResponse = await fetch(`${config.url}/rest/v1/duel_challenges`, {
      method: 'POST',
      headers: getSupabaseHeaders(config.serviceRoleKey, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify({
        question_ids: questionIds,
        creator_player_id: validation.value.creatorPlayerId,
        creator_nickname: validation.value.creatorNickname,
        creator_country_code: validation.value.countryCode,
        language: validation.value.language
      })
    });

    if (!supabaseResponse.ok) {
      const message = await supabaseResponse.text();
      throw new Error(`Supabase duel insert failed with ${supabaseResponse.status}: ${message}`);
    }

    const [row] = await supabaseResponse.json();
    createJsonResponse(response, 201, { duel: mapDuelRow(row) });
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
    createJsonResponse(response, 500, { error: 'Could not create duel.' });
  }
}

async function loadQuestionIds() {
  const raw = JSON.parse(await readFile(new URL('../data/questions.json', import.meta.url), 'utf8'));
  const result = normalizeQuestionBank(raw);
  if (result.questions.length < DUEL_QUESTION_COUNT) {
    throw new Error(`Need at least ${DUEL_QUESTION_COUNT} valid questions for duel mode.`);
  }
  return selectDuelQuestionIds(result.questions);
}
