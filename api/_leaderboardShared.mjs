import { validateCountryCode } from '../src/leaderboard.mjs';

export const SCORE_SELECT =
  'nickname,country_code,score,accuracy,max_combo,answered,rating,fan_rank,language,created_at';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildLeaderboardQuery(url, now = new Date()) {
  const scope = url.searchParams.get('scope') || 'global';
  const period = url.searchParams.get('period') || 'all';
  const params = new URLSearchParams({
    select: SCORE_SELECT,
    order: 'score.desc,accuracy.desc,max_combo.desc,created_at.asc',
    limit: scope === 'mine' ? '1' : '10'
  });

  if (scope === 'country') {
    const countryCode = validateCountryCode(url.searchParams.get('country'));
    if (countryCode) {
      params.set('country_code', `eq.${countryCode}`);
    }
  }

  if (scope === 'mine') {
    const playerId = String(url.searchParams.get('playerId') || '');
    if (UUID_PATTERN.test(playerId)) {
      params.set('player_id', `eq.${playerId}`);
    } else {
      params.set('player_id', 'eq.00000000-0000-4000-8000-000000000000');
    }
  }

  const minDate = getPeriodStart(period, now);
  if (minDate) {
    params.set('created_at', `gte.${minDate.toISOString()}`);
  }

  return params.toString();
}

export function mapScoreRow(row) {
  return {
    nickname: row.nickname,
    countryCode: row.country_code,
    score: Number(row.score),
    accuracy: Number(row.accuracy),
    maxCombo: Number(row.max_combo),
    answered: Number(row.answered),
    rating: Number(row.rating),
    fanRank: row.fan_rank,
    language: row.language,
    createdAt: row.created_at
  };
}

export async function parseJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  return rawBody ? JSON.parse(rawBody) : {};
}

export function createJsonResponse(response, statusCode, payload) {
  response.status(statusCode);
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase environment variables are missing.');
  }

  return {
    url: url.replace(/\/$/, ''),
    serviceRoleKey
  };
}

export function getSupabaseHeaders(serviceRoleKey, extra = {}) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    ...extra
  };
}

function getPeriodStart(period, now) {
  if (period === 'today') {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  if (period === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return null;
}
