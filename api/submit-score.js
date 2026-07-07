import {
  createJsonResponse,
  getSupabaseConfig,
  getSupabaseHeaders,
  mapScoreRow,
  parseJsonBody
} from './_leaderboardShared.mjs';
import { validateScoreSubmission } from '../src/leaderboard.mjs';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    createJsonResponse(response, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const rawPayload = await parseJsonBody(request);
    const validation = validateScoreSubmission(rawPayload);
    if (!validation.ok) {
      createJsonResponse(response, 400, { errors: validation.errors });
      return;
    }

    const config = getSupabaseConfig();
    const payload = toScoreRow(validation.value);
    const supabaseResponse = await fetch(`${config.url}/rest/v1/leaderboard_scores`, {
      method: 'POST',
      headers: getSupabaseHeaders(config.serviceRoleKey, {
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify(payload)
    });

    if (!supabaseResponse.ok) {
      const message = await supabaseResponse.text();
      throw new Error(`Supabase score insert failed with ${supabaseResponse.status}: ${message}`);
    }

    const [row] = await supabaseResponse.json();
    createJsonResponse(response, 201, { score: mapScoreRow(row) });
  } catch (error) {
    createJsonResponse(response, 500, { error: error.message });
  }
}

function toScoreRow(value) {
  return {
    player_id: value.playerId,
    run_id: value.runId,
    nickname: value.nickname,
    country_code: value.countryCode,
    score: value.score,
    accuracy: value.accuracy,
    max_combo: value.maxCombo,
    answered: value.answered,
    rating: value.rating,
    fan_rank: value.fanRank,
    language: value.language
  };
}
