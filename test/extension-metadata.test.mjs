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

test('contributes an X-Lens activity bar view and includes its icon', async () => {
  const manifest = JSON.parse(await readFile(new URL('../vscode-extension/package.json', import.meta.url), 'utf8'));
  const container = manifest.contributes.viewsContainers.activitybar.find((entry) => entry.id === 'xLens');
  assert.equal(container.title, 'X-Lens');
  assert.ok(manifest.contributes.views.xLens.some((view) => view.id === 'xLens.open' && view.type === 'webview'));
  assert.ok(manifest.files.includes(container.icon));
  assert.match(await readFile(new URL(`../vscode-extension/${container.icon}`, import.meta.url), 'utf8'), /<svg/);
});
