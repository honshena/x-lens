import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSponsors } from '../src/sponsors.mjs';

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
