import { execFileSync } from 'node:child_process';

export function parseWindowsProxy(output) {
  if (!/ProxyEnable\s+REG_DWORD\s+0x1\b/i.test(output)) return undefined;
  const setting = output.match(/ProxyServer\s+REG_SZ\s+([^\r\n]+)/i)?.[1]?.trim();
  const address = setting?.includes('=')
    ? setting.split(';').find((part) => part.toLowerCase().startsWith('https='))?.slice(6)
    : setting;
  if (!address) return undefined;
  try {
    const url = new URL(address.includes('://') ? address : `http://${address}`);
    if (url.protocol !== 'http:' || !url.port || url.username || url.password) return undefined;
    return { protocol: 'http', host: url.hostname, port: Number(url.port) };
  } catch { return undefined; }
}

export function systemProxy() {
  if (process.platform !== 'win32' || process.env.HTTPS_PROXY || process.env.https_proxy) return undefined;
  try {
    const output = execFileSync('reg.exe', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'], {
      encoding: 'utf8', timeout: 3000, windowsHide: true,
    });
    return parseWindowsProxy(output);
  } catch { return undefined; }
}
