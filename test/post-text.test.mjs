import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePostText } from '../src/post-text.mjs';

test('keeps short text intact and reports its length', () => {
  assert.deepEqual(summarizePostText('Hello 世界', 10), {
    preview: 'Hello 世界', length: 8, shown: 8, truncated: false,
  });
});

test('truncates long text by Unicode code points without splitting emoji', () => {
  assert.deepEqual(summarizePostText('你好😀abc', 3), {
    preview: '你好😀', length: 6, shown: 3, truncated: true,
  });
});
