import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function getSelectOptions(selectId) {
  const selectPattern = new RegExp(`<select[^>]+id="${selectId}"[^>]*>([\\s\\S]*?)<\\/select>`);
  const match = html.match(selectPattern);
  assert.ok(match, `Missing select #${selectId}`);

  return [...match[1].matchAll(/<option value="([A-Z]{2})">([^<]+)<\/option>/g)].map(
    ([, code, label]) => ({ code, label })
  );
}

test('country selectors expose a broad matching international country list', () => {
  const scoreCountries = getSelectOptions('country-select');
  const leaderboardCountries = getSelectOptions('leaderboard-country-select');
  const scoreCodes = scoreCountries.map((country) => country.code);
  const leaderboardCodes = leaderboardCountries.map((country) => country.code);

  assert.deepEqual(leaderboardCodes, scoreCodes);
  assert.ok(scoreCountries.length >= 60);

  for (const code of [
    'BR',
    'US',
    'CA',
    'MX',
    'AR',
    'CL',
    'CO',
    'PE',
    'GB',
    'DE',
    'FR',
    'IT',
    'ES',
    'NL',
    'SE',
    'PL',
    'JP',
    'KR',
    'CN',
    'TW',
    'TH',
    'PH',
    'ID',
    'IN'
  ]) {
    assert.ok(scoreCodes.includes(code), `Missing country ${code}`);
  }
});
