import {
  buildLeaderboardQuery,
  createJsonResponse,
  getSupabaseConfig,
  getSupabaseHeaders,
  mapScoreRow
} from './_leaderboardShared.mjs';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    createJsonResponse(response, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const config = getSupabaseConfig();
    const requestUrl = new URL(request.url, 'https://hanabie.local');
    const query = buildLeaderboardQuery(requestUrl);
    const supabaseResponse = await fetch(`${config.url}/rest/v1/leaderboard_scores?${query}`, {
      headers: getSupabaseHeaders(config.serviceRoleKey)
    });

    if (!supabaseResponse.ok) {
      throw new Error(`Supabase leaderboard query failed with ${supabaseResponse.status}.`);
    }

    const rows = await supabaseResponse.json();
    createJsonResponse(response, 200, { scores: rows.map(mapScoreRow) });
  } catch (error) {
    createJsonResponse(response, 500, { error: error.message });
  }
}
