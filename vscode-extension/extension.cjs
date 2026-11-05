const vscode = require('vscode');
const { fork } = require('node:child_process');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

function activate(context) {
  let child;
  let startup;
  let disposed = false;

  async function start() {
    if (startup) return startup;
    startup = (async () => {
      await mkdir(context.globalStorageUri.fsPath, { recursive: true });
      if (disposed) throw new Error('Extension is shutting down.');
      const env = {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        FEEDLENS_PORT: '0',
        FEEDLENS_ENV_FILE: path.join(context.globalStorageUri.fsPath, '.env'),
        FEEDLENS_STATIC_DIR: path.join(context.extensionPath, 'bundled', 'web'),
      };
      delete env.X_AUTH_TOKEN;
      delete env.X_CT0;
      const current = fork(path.join(context.extensionPath, 'bundled', 'server.cjs'), [], {
        env, execPath: process.execPath, execArgv: [], stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      });
      child = current;
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          current.kill();
          reject(new Error('Local service startup timed out.'));
        }, 15000);
        current.once('error', (error) => { clearTimeout(timeout); reject(error); });
        current.once('exit', () => {
          clearTimeout(timeout);
          if (child === current) { child = undefined; startup = undefined; }
          reject(new Error('Local service stopped.'));
        });
        current.on('message', (message) => {
          if (message?.type === 'ready' && Number.isInteger(message.port)
              && message.port > 0 && message.port <= 65535) {
            clearTimeout(timeout);
            resolve(message.port);
          }
        });
      });
    })().catch((error) => { startup = undefined; throw error; });
    return startup;
  }

  context.subscriptions.push({ dispose() { disposed = true; if (child) child.kill(); } });
  context.subscriptions.push(vscode.window.registerWebviewViewProvider('xLens.open', {
    async resolveWebviewView(view) {
      try {
        const port = await start();
        if (disposed) return;
        const url = `http://127.0.0.1:${port}`;
        const nonce = randomBytes(16).toString('hex');
        view.webview.options = {
          enableScripts: true,
          portMapping: [{ webviewPort: port, extensionHostPort: port }],
        };
        context.subscriptions.push(view.webview.onDidReceiveMessage(async (message) => {
          if (message?.type !== 'openExternal' || typeof message.url !== 'string') return;
          let target;
          try { target = new URL(message.url); } catch { return; }
          if (target.protocol !== 'https:' || target.port || target.username || target.password
            || !['x.com', 'afdian.com', 'ko-fi.com'].includes(target.hostname)) return;
          await vscode.env.openExternal(vscode.Uri.parse(target.href));
        }));
        view.webview.html = `<!doctype html><html><head>
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${url}; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'">
          <style>html,body,iframe{width:100%;height:100%;margin:0;padding:0;border:0;overflow:hidden}</style>
          </head><body><iframe id="reader" src="${url}/?host=vscode" title="X-Lens"></iframe>
          <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            const reader = document.getElementById('reader');
            window.addEventListener('message', (event) => {
              if (event.source === reader.contentWindow && event.origin === '${url}'
                  && event.data?.type === 'openExternal') vscode.postMessage(event.data);
            });
          </script></body></html>`;
      } catch (error) {
        vscode.window.showErrorMessage(`X-Lens: ${error.message}`);
      }
    },
  }, { webviewOptions: { retainContextWhenHidden: true } }));
  context.subscriptions.push(vscode.commands.registerCommand('twView.open', () =>
    vscode.commands.executeCommand('xLens.open.focus')));
}

module.exports = { activate };
