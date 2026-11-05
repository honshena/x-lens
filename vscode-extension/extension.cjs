const vscode = require('vscode');
const { fork } = require('node:child_process');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');

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
  context.subscriptions.push(vscode.commands.registerCommand('twView.open', async () => {
    try {
      const port = await start();
      if (disposed) return;
      const url = `http://127.0.0.1:${port}`;
      const panel = vscode.window.createWebviewPanel('twView', 'X-Lens', vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
        portMapping: [{ webviewPort: port, extensionHostPort: port }],
      });
      panel.webview.html = `<!doctype html><html><head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${url}; style-src 'unsafe-inline'">
        <style>html,body,iframe{width:100%;height:100%;margin:0;padding:0;border:0;overflow:hidden}</style>
        </head><body><iframe src="${url}/" title="X-Lens"></iframe></body></html>`;
    } catch (error) {
      vscode.window.showErrorMessage(`X-Lens: ${error.message}`);
    }
  }));
}

module.exports = { activate };
