import {
  createJsonResponse,
  createRateLimiter,
  getRequestClientKey,
  getSupabaseConfig,
  getSupabaseHeaders,
  parseJsonBody,
  PayloadTooLargeError
} from './_leaderboardShared.mjs';
import { mapAnalyticsEventToRow } from './_analyticsShared.mjs';
import { validateAnalyticsEvent } from '../src/analytics.mjs';

const analyticsLimiter = createRateLimiter({
  maxAttempts: 140,
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
    const rateLimit = analyticsLimiter(`${clientKey}:${playerKey}`);
    if (!rateLimit.allowed) {
      response.setHeader('Retry-After', String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
      createJsonResponse(response, 429, { error: 'Too many analytics events. Try again soon.' });
      return;
    }

    const validation = validateAnalyticsEvent(rawPayload);
    if (!validation.ok) {
      createJsonResponse(response, 400, { errors: validation.errors });
      return;
    }

    const config = getSupabaseConfig();
    const supabaseResponse = await fetch(`${config.url}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: getSupabaseHeaders(config.serviceRoleKey, {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      }),
      body: JSON.stringify(mapAnalyticsEventToRow(validation.value))
    });

    if (!supabaseResponse.ok) {
      const message = await supabaseResponse.text();
      throw new Error(`Supabase analytics insert failed with ${supabaseResponse.status}: ${message}`);
    }

    createJsonResponse(response, 202, { ok: true });
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
    createJsonResponse(response, 500, { error: 'Could not save analytics event.' });
  }
}
