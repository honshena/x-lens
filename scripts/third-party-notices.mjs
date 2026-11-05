import { readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const modules = path.join(root, 'node_modules');
const seen = new Set();
const notices = [];

async function scan(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (!item.isDirectory() || item.name === '.bin') continue;
    const folder = path.join(directory, item.name);
    if (item.name.startsWith('@')) { await scan(folder); continue; }
    let pkg;
    try { pkg = JSON.parse(await readFile(path.join(folder, 'package.json'), 'utf8')); }
    catch { continue; }
    const key = `${pkg.name}@${pkg.version}`;
    if (!seen.has(key)) {
      seen.add(key);
      const files = await readdir(folder);
      const license = files.find((name) => /^(license|licence|copying)(\.(md|txt|markdown))?$/i.test(name));
      const text = license ? await readFile(path.join(folder, license), 'utf8') : `License: ${pkg.license || 'not specified'}; see package distribution for details.`;
      notices.push({ key, text });
    }
    try { await scan(path.join(folder, 'node_modules')); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

await scan(modules);
notices.sort((first, second) => first.key.localeCompare(second.key));
const output = notices.map(({ key, text }) => `===== ${key} =====\n\n${text.trim()}\n`).join('\n');
await writeFile(path.join(root, 'vscode-extension', 'THIRD_PARTY_NOTICES.txt'), output, 'utf8');
await copyFile(path.join(root, 'LICENSE'), path.join(root, 'vscode-extension', 'LICENSE'));
