import { buildDuelLookupQuery, mapDuelRow } from './_duelShared.mjs';
import { createJsonResponse, getSupabaseConfig, getSupabaseHeaders } from './_leaderboardShared.mjs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    createJsonResponse(response, 405, { error: 'Method not allowed.' });
    return;
  }

  const requestUrl = new URL(request.url, 'https://hanabie.local');
  const challengeId = String(requestUrl.searchParams.get('id') || '').trim();
  if (!UUID_PATTERN.test(challengeId)) {
    createJsonResponse(response, 400, { error: 'Invalid duel id.' });
    return;
  }

  try {
    const config = getSupabaseConfig();
    const supabaseResponse = await fetch(`${config.url}/rest/v1/duel_challenges?${buildDuelLookupQuery(challengeId)}`, {
      headers: getSupabaseHeaders(config.serviceRoleKey)
    });

    if (!supabaseResponse.ok) {
      throw new Error(`Supabase duel query failed with ${supabaseResponse.status}.`);
    }

    const rows = await supabaseResponse.json();
    if (!rows[0]) {
      createJsonResponse(response, 404, { error: 'Duel not found.' });
      return;
    }

    createJsonResponse(response, 200, { duel: mapDuelRow(rows[0]) });
  } catch (error) {
    console.error(error);
    createJsonResponse(response, 500, { error: 'Could not load duel.' });
  }
}
