import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWindowsProxy } from '../server/proxy.mjs';

test('parses enabled Windows HTTP proxy settings', () => {
  assert.deepEqual(parseWindowsProxy('ProxyEnable REG_DWORD 0x1\nProxyServer REG_SZ 127.0.0.1:7890'), {
    protocol: 'http', host: '127.0.0.1', port: 7890,
  });
});

test('ignores disabled or invalid Windows proxy settings', () => {
  assert.equal(parseWindowsProxy('ProxyEnable REG_DWORD 0x0\nProxyServer REG_SZ 127.0.0.1:7890'), undefined);
  assert.equal(parseWindowsProxy('ProxyEnable REG_DWORD 0x1\nProxyServer REG_SZ invalid'), undefined);
});
