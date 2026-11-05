import test from 'node:test';
import assert from 'node:assert/strict';
import { shortcutMatches, hasForeignText } from '../src/preferences.mjs';

test('shortcut requires the configured modifiers and key', () => {
  assert.equal(shortcutMatches({ key: 'a', ctrlKey: true }, 'Ctrl+A'), true);
  assert.equal(shortcutMatches({ key: 'a', ctrlKey: false }, 'Ctrl+A'), false);
  assert.equal(shortcutMatches({ key: 'a', ctrlKey: true, shiftKey: true }, 'Ctrl+A'), false);
});

test('selection translation ignores Chinese-only text', () => {
  assert.equal(hasForeignText('你好，世界！'), false);
  assert.equal(hasForeignText('hello world'), true);
  assert.equal(hasForeignText('こんにちは'), true);
});
