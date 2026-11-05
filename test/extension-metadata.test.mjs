import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('extension metadata identifies X-Lens consistently', async () => {
  const manifest = JSON.parse(await readFile(new URL('../vscode-extension/package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.name, 'x-lens');
  assert.equal(manifest.displayName, 'X-Lens');
  assert.match(manifest.description, /X/);
  assert.match(manifest.contributes.commands[0].title, /X-Lens/);
});
