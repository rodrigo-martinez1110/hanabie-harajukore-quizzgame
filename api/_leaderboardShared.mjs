import { validateCountryCode } from '../src/leaderboard.mjs';

export const SCORE_SELECT =
  'nickname,country_code,score,accuracy,max_combo,answered,rating,fan_rank,language,created_at';

export const DEFAULT_JSON_BODY_LIMIT_BYTES = 8 * 1024;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PayloadTooLargeError extends Error {
  constructor(message = 'Request body is too large.') {
    super(message);
    this.name = 'PayloadTooLargeError';
    this.statusCode = 413;
  }
}

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

export async function parseJsonBody(request, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_JSON_BODY_LIMIT_BYTES;
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > maxBytes) {
      throw new PayloadTooLargeError();
    }
    chunks.push(buffer);
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

export function createRateLimiter(options = {}) {
  const maxAttempts = options.maxAttempts ?? 12;
  const windowMs = options.windowMs ?? 60_000;
  const now = options.now ?? (() => Date.now());
  const store = options.store ?? new Map();

  return function rateLimit(key) {
    const timestamp = now();
    const record = store.get(key);
    if (!record || timestamp >= record.resetAt) {
      const nextRecord = { count: 1, resetAt: timestamp + windowMs };
      store.set(key, nextRecord);
      return { allowed: true, remaining: maxAttempts - 1, resetAt: nextRecord.resetAt };
    }

    record.count += 1;
    if (record.count > maxAttempts) {
      return { allowed: false, remaining: 0, resetAt: record.resetAt };
    }

    return { allowed: true, remaining: maxAttempts - record.count, resetAt: record.resetAt };
  };
}

export function getRequestClientKey(request, fallback = 'unknown') {
  const forwardedFor = request.headers?.['x-forwarded-for'] || request.headers?.['X-Forwarded-For'];
  const realIp = request.headers?.['x-real-ip'] || request.headers?.['X-Real-Ip'];
  const ip = String(forwardedFor || realIp || request.socket?.remoteAddress || fallback)
    .split(',')[0]
    .trim();

  return ip || fallback;
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
