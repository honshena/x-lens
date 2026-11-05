import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRequest, fetchSponsors, makeLeaderboard } from '../scripts/sync-sponsors.mjs';

test('signs requests with a deterministic signature', () => {
  assert.equal(makeRequest('abc', '123', { a: 333 }, 1624339905).sign,
    'a4acc28b81598b7e5d84ebdc3e91710c');
});

test('fetches all pages and rejects invalid responses', async () => {
  const calls = [];
  const fetcher = async (_url, options) => {
    const page = JSON.parse(JSON.parse(options.body).params).page;
    calls.push(page);
    return { ok: true, json: async () => ({ ec: 200, data: {
      total_page: 2, list: [{ user: { user_id: String(page) } }],
    } }) };
  };
  assert.equal((await fetchSponsors('id', 'token', fetcher)).length, 2);
  assert.deepEqual(calls, [1, 2]);
  await assert.rejects(fetchSponsors('id', 'token', async () => ({
    ok: true, json: async () => ({ ec: 400005 }),
  })));
});

test('publishes only approved users in amount order without sensitive fields', () => {
  const rows = [
    { all_sum_amount: '2.00', user: { user_id: 'a', name: 'A', avatar: 'https://example.com/a' } },
    { all_sum_amount: '12.00', user: { user_id: 'b', name: 'B', avatar: 'javascript:alert(1)' } },
    { all_sum_amount: '99.00', user: { user_id: 'c', name: 'C' } },
  ];
  assert.deepEqual(makeLeaderboard(rows, new Set(['a', 'b'])), { sponsors: [
    { name: 'B', avatar: '' }, { name: 'A', avatar: 'https://example.com/a' },
  ] });
});
