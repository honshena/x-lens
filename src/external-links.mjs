export function installExternalLinkBridge(win, doc) {
  if (new URLSearchParams(win.location.search).get('host') !== 'vscode' || win.parent === win) return;
  doc.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey
      || event.shiftKey || event.altKey) return;
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor) return;
    let url;
    try { url = new URL(anchor.href); } catch { return; }
    if (url.protocol !== 'https:' || url.port || url.username || url.password
      || !['x.com', 'afdian.com', 'ko-fi.com'].includes(url.hostname)) return;
    event.preventDefault();
    win.parent.postMessage({ type: 'openExternal', url: url.href }, '*');
  }, true);
}
