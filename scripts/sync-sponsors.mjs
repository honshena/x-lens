import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { normalizeSponsors } from '../src/sponsors.mjs';

export function makeRequest(userId, token, params, timestamp) {
  const serialized = JSON.stringify(params);
  const sign = createHash('md5')
    .update(`${token}params${serialized}ts${timestamp}user_id${userId}`)
    .digest('hex');
  return { user_id: userId, params: serialized, ts: timestamp, sign };
}

export async function fetchSponsors(userId, token, fetcher = fetch) {
  const sponsors = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const response = await fetcher('https://afdian.com/api/open/query-sponsor', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(makeRequest(userId, token, { page }, Math.floor(Date.now() / 1000))),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Afdian request failed: HTTP ${response.status}`);
    const result = await response.json();
    if (result.ec !== 200 || !Array.isArray(result.data?.list)
      || !Number.isInteger(result.data.total_page) || result.data.total_page < 0) {
      throw new Error('Afdian returned an invalid or unsuccessful response');
    }
    totalPages = result.data.total_page;
    sponsors.push(...result.data.list);
  }
  return sponsors;
}

export function makeLeaderboard(rows, blockedIds) {
  if (rows.some((row) => typeof row.user?.user_id !== 'string' || !row.user.user_id.trim())) {
    throw new Error('Afdian returned a sponsor without a user ID');
  }
  const visible = rows.filter((row) => !blockedIds.has(row.user.user_id));
  visible.sort((first, second) => Number(second.all_sum_amount) - Number(first.all_sum_amount));
  return { sponsors: normalizeSponsors({ sponsors: visible.map((row) => ({
    name: row.user.name,
    avatar: row.user.avatar,
  })) }) };
}

async function main() {
  const { AFDIAN_USER_ID, AFDIAN_TOKEN, AFDIAN_BLOCKED_USER_IDS = '' } = process.env;
  if (!AFDIAN_USER_ID || !AFDIAN_TOKEN) {
    throw new Error('Missing Afdian credentials');
  }
  const blockedIds = new Set(AFDIAN_BLOCKED_USER_IDS.split(/[\s,]+/).filter(Boolean));
  const rows = await fetchSponsors(AFDIAN_USER_ID, AFDIAN_TOKEN);
  const leaderboard = makeLeaderboard(rows, blockedIds);
  await writeFile(new URL('../sponsors/leaderboard.json', import.meta.url),
    `${JSON.stringify(leaderboard, null, 2)}\n`, 'utf8');
  console.log(`Updated ${leaderboard.sponsors.length} sponsors.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
