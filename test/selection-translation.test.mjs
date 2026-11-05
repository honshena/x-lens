import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelectionTranslator } from '../src/selection-translation.mjs';

test('starts translating immediately and returns the result', async () => {
  const states = [];
  const translate = createSelectionTranslator(async (text, language) => `${text}:${language}`, (state) => states.push(state));
  await translate.start('hello', 'zh-CN', { x: 20, y: 30 });
  assert.equal(states[0].status, 'loading');
  assert.equal(states[1].result, 'hello:zh-CN');
});

test('ignores stale results after another selection or dismissal', async () => {
  const states = [];
  let resolveFirst;
  const translate = createSelectionTranslator((text) => text === 'first'
    ? new Promise((resolve) => { resolveFirst = resolve; })
    : Promise.resolve('second result'), (state) => states.push(state));
  const first = translate.start('first', 'zh-CN', {});
  await translate.start('second', 'zh-CN', {});
  resolveFirst('stale');
  await first;
  assert.equal(states.at(-1).result, 'second result');
  translate.dismiss();
  assert.equal(states.at(-1), null);
});

test('reports translation errors', async () => {
  const states = [];
  const translate = createSelectionTranslator(async () => { throw new Error('unavailable'); }, (state) => states.push(state));
  await translate.start('hello', 'zh-CN', {});
  assert.equal(states.at(-1).status, 'error');
});
