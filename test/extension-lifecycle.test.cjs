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
  let provider;
  let providerOptions;
  let focused;
  const opened = [];
  let onMessage;
  const vscode = {
    Uri: { parse: (value) => new URL(value) },
    env: { openExternal: async (value) => { opened.push(value.href); } },
    commands: {
      registerCommand: (_name, handler) => { command = handler; return { dispose() {} }; },
      executeCommand: async (name) => { focused = name; },
    },
    window: {
      registerWebviewViewProvider: (id, value, options) => {
        assert.equal(id, 'xLens.open');
        provider = value;
        providerOptions = options;
        return { dispose() {} };
      },
      showErrorMessage: (message) => { throw new Error(message); },
    },
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
  assert.equal(providerOptions.webviewOptions.retainContextWhenHidden, true);
  await command();
  assert.equal(focused, 'xLens.open.focus');
  const view = { webview: { onDidReceiveMessage: (handler) => {
    onMessage = handler;
    return { dispose() {} };
  } } };
  await provider.resolveWebviewView(view);
  assert.equal(startOptions.env.FEEDLENS_PORT, '0');
  assert.match(startOptions.env.FEEDLENS_ENV_FILE, /\.env$/);
  assert.deepEqual(view.webview.options.portMapping, [{ webviewPort: 45678, extensionHostPort: 45678 }]);
  assert.match(view.webview.html, /127\.0\.0\.1:45678/);
  assert.match(view.webview.html, /width:100%;height:100%/);
  assert.match(view.webview.html, /host=vscode/);
  await onMessage({ type: 'openExternal', url: 'https://x.com/example' });
  await onMessage({ type: 'openExternal', url: 'https://afdian.com/a/honshenai/' });
  await onMessage({ type: 'openExternal', url: 'https://x.com.evil.test/' });
  await onMessage({ type: 'openExternal', url: 'javascript:alert(1)' });
  assert.deepEqual(opened, ['https://x.com/example', 'https://afdian.com/a/honshenai/']);
  assert.equal(typeof command, 'function');
  context.subscriptions.forEach((item) => item.dispose());
  assert.equal(killed, true);
});
