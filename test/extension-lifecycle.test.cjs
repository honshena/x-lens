const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const Module = require('node:module');

test('opens the bundled service on its announced port and disposes it', async () => {
  const child = new EventEmitter();
  let killed = false;
  child.kill = () => { killed = true; };
  let startOptions;
  let command;
  let panel;
  const vscode = {
    commands: { registerCommand: (_name, handler) => { command = handler; return { dispose() {} }; } },
    window: {
      createWebviewPanel: (_type, _title, _column, options) => {
        panel = { options, webview: {} };
        return panel;
      },
      showErrorMessage: (message) => { throw new Error(message); },
    },
    ViewColumn: { One: 1 },
  };
  const original = Module._load;
  Module._load = function (name, ...args) {
    if (name === 'vscode') return vscode;
    if (name === 'node:child_process') return {
      fork: (_file, _args, options) => {
        startOptions = options;
        process.nextTick(() => child.emit('message', { type: 'ready', port: 45678 }));
        return child;
      },
    };
    return original.call(this, name, ...args);
  };
  let extension;
  try { extension = require('../vscode-extension/extension.cjs'); } finally { Module._load = original; }
  const context = {
    subscriptions: [], extensionPath: __dirname, globalStorageUri: { fsPath: require('node:os').tmpdir() },
  };
  extension.activate(context);
  await command();
  assert.equal(startOptions.env.FEEDLENS_PORT, '0');
  assert.match(startOptions.env.FEEDLENS_ENV_FILE, /\.env$/);
  assert.deepEqual(panel.options.portMapping, [{ webviewPort: 45678, extensionHostPort: 45678 }]);
  assert.match(panel.webview.html, /127\.0\.0\.1:45678/);
  context.subscriptions.forEach((item) => item.dispose());
  assert.equal(killed, true);
});
