import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeSponsors, sponsorChannels } from '../src/sponsors.mjs';

test('keeps approved ranking order without exposing amounts or unsafe avatar URLs', () => {
  assert.deepEqual(normalizeSponsors({ sponsors: [
    { name: 'Alice', avatar: 'https://example.com/a.png', amount: 100 },
    { name: 'Bob', avatar: 'javascript:alert(1)', amount: 1 },
    { name: '', avatar: 'https://example.com/a.png' },
  ] }), [
    { name: 'Alice', avatar: 'https://example.com/a.png' },
    { name: 'Bob', avatar: '' },
  ]);
});

test('rejects missing or invalid lists', () => {
  assert.deepEqual(normalizeSponsors(null), []);
  assert.deepEqual(normalizeSponsors({ sponsors: 'invalid' }), []);
});

test('channels use independent public sponsor lists', async () => {
  assert.deepEqual(sponsorChannels.map(({ key, label }) => ({ key, label })), [
    { key: 'afdian', label: '爱发电' }, { key: 'kofi', label: 'Ko-fi' },
  ]);
  assert.notEqual(sponsorChannels[0].url, sponsorChannels[1].url);
  const koFi = JSON.parse(await readFile(new URL('../sponsors/kofi.json', import.meta.url), 'utf8'));
  assert.ok(Array.isArray(koFi.sponsors));
});

test('sponsor interface uses the requested title and notice', async () => {
  const sponsor = await readFile(new URL('../src/sponsor.jsx', import.meta.url), 'utf8');
  const settings = await readFile(new URL('../src/settings.jsx', import.meta.url), 'utf8');
  assert.match(sponsor, /<h3>赞助用户<\/h3>/);
  assert.match(sponsor, /href="https:\/\/ko-fi\.com\/honshen"/);
  assert.match(settings, /<label>赞助用户<\/label>/);
  assert.match(sponsor, /<p>昵称和头像不得包含敏感或不适宜内容，违规信息可能被下架。<\/p>/);
  assert.doesNotMatch(sponsor + settings, /赞助排行|排行榜仅显示/);
});

test('sponsors flow from left to right without visible ranking numbers', async () => {
  const sponsor = await readFile(new URL('../src/sponsor.jsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/enhancements.css', import.meta.url), 'utf8');
  assert.doesNotMatch(sponsor, /sponsor-rank[" ]/);
  assert.match(styles, /\.sponsor-ranking ul\s*\{[^}]*display:\s*flex/s);
  assert.match(styles, /\.sponsor-ranking ul\s*\{[^}]*flex-wrap:\s*wrap/s);
});
