import test from 'node:test';
import assert from 'node:assert/strict';
import { installExternalLinkBridge } from '../src/external-links.mjs';

test('forwards approved external links only in the VS Code frame', () => {
  const sent = [];
  let handler;
  const parent = { postMessage: (message, target) => sent.push({ message, target }) };
  const win = { location: { search: '?host=vscode' }, parent };
  const doc = { addEventListener: (_name, listener) => { handler = listener; } };
  installExternalLinkBridge(win, doc);
  let prevented = false;
  const click = (url) => ({ button: 0, target: { closest: () => ({ href: url }) },
    preventDefault: () => { prevented = true; } });
  handler(click('https://x.com/example/status/123'));
  assert.equal(prevented, true);
  assert.deepEqual(sent[0].message, { type: 'openExternal', url: 'https://x.com/example/status/123' });
  prevented = false;
  handler(click('https://malicious.example/'));
  assert.equal(prevented, false);
  assert.equal(sent.length, 1);
});

test('does not modify standalone browser navigation', () => {
  let installed = false;
  const win = { location: { search: '' } };
  installExternalLinkBridge(win, { addEventListener: () => { installed = true; } });
  assert.equal(installed, false);
});
