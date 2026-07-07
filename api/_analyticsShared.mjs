import { getAdminPeriodStart } from '../src/analytics.mjs';

export const ANALYTICS_SELECT =
  'event_type,player_id,country_code,language,score,accuracy,max_combo,answered,fan_rank,question_id,question_category,question_difficulty,correct,created_at';

export function isAuthorizedAdminRequest(request, adminPassword) {
  if (!adminPassword) {
    return false;
  }

  const headerPassword = request.headers?.['x-admin-password'] || request.headers?.['X-Admin-Password'];
  const authorization = request.headers?.authorization || request.headers?.Authorization || '';
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';

  return constantTimeEqual(String(headerPassword || bearerToken || ''), String(adminPassword));
}

export function buildAnalyticsEventsQuery(url, now = new Date()) {
  const period = url.searchParams.get('period') || '7d';
  const params = new URLSearchParams({
    select: ANALYTICS_SELECT,
    order: 'created_at.desc',
    limit: '5000'
  });
  const minDate = getAdminPeriodStart(period, now);

  if (minDate) {
    params.set('created_at', `gte.${minDate.toISOString()}`);
  }

  return params.toString();
}

export function mapAnalyticsEventToRow(event) {
  return {
    event_type: event.eventType,
    player_id: event.playerId,
    country_code: event.countryCode,
    language: event.language,
    score: event.score,
    accuracy: event.accuracy,
    max_combo: event.maxCombo,
    answered: event.answered,
    fan_rank: event.fanRank || null,
    question_id: event.questionId || null,
    question_category: event.questionCategory || null,
    question_difficulty: event.questionDifficulty,
    correct: event.correct
  };
}

function constantTimeEqual(left, right) {
  const maxLength = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return diff === 0;
}
