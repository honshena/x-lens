import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const destination = path.join(root, 'vscode-extension', 'bundled');
const webDestination = path.resolve(destination, 'web');
if (path.dirname(webDestination) !== path.resolve(destination)) throw new Error('Invalid build destination');
await mkdir(destination, { recursive: true });
await build({
  entryPoints: [path.join(root, 'server', 'index.mjs')],
  outfile: path.join(destination, 'server.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
});
await rm(webDestination, { recursive: true, force: true });
await cp(path.join(root, 'dist'), webDestination, { recursive: true });
