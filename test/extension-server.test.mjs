import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { request } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const server = process.env.FEEDLENS_TEST_SERVER || fileURLToPath(new URL('../server/index.mjs', import.meta.url));

async function startServer() {
  const directory = await mkdtemp(path.join(tmpdir(), 'feedlens-test-'));
  const envFile = path.join(directory, '.env');
  await writeFile(path.join(directory, 'index.html'), '<h1>FeedLens test</h1>');
  const env = { ...process.env, FEEDLENS_PORT: '0', FEEDLENS_ENV_FILE: envFile, FEEDLENS_STATIC_DIR: directory };
  delete env.X_AUTH_TOKEN;
  delete env.X_CT0;
  const child = fork(server, [], { env, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not announce a port')), 10000);
    child.once('exit', () => { clearTimeout(timer); reject(new Error('server exited before starting')); });
    child.on('message', (message) => {
      if (message?.type === 'ready') { clearTimeout(timer); resolve(message.port); }
    });
  }).catch((error) => { child.kill(); throw error; });
  return { child, port, envFile };
}

test('extension servers choose independent ports and serve the bundled frontend', async (context) => {
  const first = await startServer();
  context.after(() => first.child.kill());
  const second = await startServer();
  context.after(() => second.child.kill());
  assert.notEqual(first.port, second.port);
  const response = await fetch(`http://127.0.0.1:${first.port}/`);
  assert.match(await response.text(), /FeedLens test/);
  assert.equal((await fetch(`http://127.0.0.1:${first.port}/api/settings`)).status, 200);
});

test('extension server isolates settings and rejects untrusted origins and hosts', async (context) => {
  const { child, port, envFile } = await startServer();
  context.after(() => child.kill());
  const url = `http://127.0.0.1:${port}`;
  const headers = { 'content-type': 'application/json', 'x-tw-view': 'settings', origin: url };
  const body = JSON.stringify({ authToken: 'test-token', ct0: 'test-ct0' });
  assert.equal((await fetch(`${url}/api/settings`, { method: 'PUT', headers, body })).status, 200);
  assert.match(await readFile(envFile, 'utf8'), /X_AUTH_TOKEN=test-token/);
  assert.equal((await fetch(`${url}/api/settings`, {
    method: 'PUT', headers: { ...headers, origin: 'https://evil.example' }, body,
  })).status, 403);
  const status = await new Promise((resolve, reject) => {
    const req = request(`${url}/api/settings`, { headers: { host: `evil.example:${port}` } },
      (response) => { response.resume(); resolve(response.statusCode); });
    req.on('error', reject);
    req.end();
  });
  assert.equal(status, 403);
});

test('extension preferences persist independently of the random port', async (context) => {
  const { child, port, envFile } = await startServer();
  context.after(() => child.kill());
  const url = `http://127.0.0.1:${port}`;
  const preferences = { language: 'ja', theme: 'light', shortcut: 'Ctrl+Q' };
  const response = await fetch(`${url}/api/preferences`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-tw-view': 'preferences', origin: url },
    body: JSON.stringify(preferences),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(await readFile(path.join(path.dirname(envFile), 'preferences.json'), 'utf8')), preferences);
  assert.deepEqual(await (await fetch(`${url}/api/preferences`)).json(), { persistent: true, preferences });
});
