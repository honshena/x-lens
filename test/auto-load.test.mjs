import test from 'node:test';
import assert from 'node:assert/strict';
import { observeMore } from '../src/auto-load.mjs';

test('loads only on intersection and disconnects on cleanup', () => {
  let callback;
  let observed;
  let disconnected = false;
  let calls = 0;
  class Observer {
    constructor(handler) { callback = handler; }
    observe(target) { observed = target; }
    disconnect() { disconnected = true; }
  }
  const sentinel = {};
  const cleanup = observeMore(sentinel, () => { calls += 1; }, Observer);
  assert.equal(observed, sentinel);
  callback([{ isIntersecting: false }]);
  callback([{ isIntersecting: true }]);
  assert.equal(calls, 1);
  cleanup();
  assert.equal(disconnected, true);
});

test('does not observe when loading is disabled', () => {
  let constructed = false;
  class Observer { constructor() { constructed = true; } }
  observeMore(null, () => {}, Observer)();
  assert.equal(constructed, false);
});

test('uses the supplied scroll container as the observer root', () => {
  const root = {};
  let options;
  class Observer {
    constructor(_handler, settings) { options = settings; }
    observe() {}
    disconnect() {}
  }
  observeMore({}, () => {}, Observer, root)();
  assert.equal(options.root, root);
});
