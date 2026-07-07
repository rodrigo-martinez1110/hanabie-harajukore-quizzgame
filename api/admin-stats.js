import {
  buildAnalyticsEventsQuery,
  isAuthorizedAdminRequest
} from './_analyticsShared.mjs';
import {
  createJsonResponse,
  getSupabaseConfig,
  getSupabaseHeaders
} from './_leaderboardShared.mjs';
import { summarizeAnalyticsEvents } from '../src/analytics.mjs';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    createJsonResponse(response, 405, { error: 'Method not allowed.' });
    return;
  }

  if (!isAuthorizedAdminRequest(request, process.env.ADMIN_PASSWORD)) {
    createJsonResponse(response, 401, { error: 'Unauthorized.' });
    return;
  }

  try {
    const config = getSupabaseConfig();
    const requestUrl = new URL(request.url, 'https://hanabie.local');
    const query = buildAnalyticsEventsQuery(requestUrl);
    const supabaseResponse = await fetch(`${config.url}/rest/v1/analytics_events?${query}`, {
      headers: getSupabaseHeaders(config.serviceRoleKey)
    });

    if (!supabaseResponse.ok) {
      throw new Error(`Supabase analytics query failed with ${supabaseResponse.status}.`);
    }

    const rows = await supabaseResponse.json();
    createJsonResponse(response, 200, {
      period: requestUrl.searchParams.get('period') || '7d',
      generatedAt: new Date().toISOString(),
      summary: summarizeAnalyticsEvents(rows)
    });
  } catch (error) {
    console.error(error);
    createJsonResponse(response, 500, { error: 'Could not load admin stats.' });
  }
}
