import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('feed posts show an icon detail entry in the reply heading', async () => {
  const source = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  const replies = source.slice(source.indexOf('function Replies('), source.indexOf('function Post('));
  const post = source.slice(source.indexOf('function Post('), source.indexOf('function Detail('));
  assert.match(replies, /className="replies-heading"[\s\S]*aria-label="查看帖子详情"[\s\S]*onClick=\{\(\) => onOpen\(post\)\}[\s\S]*<PanelTopOpen/);
  assert.match(post, /<Replies post=\{post\} onOpen=\{onOpen\} \/>/);
  assert.doesNotMatch(post, /className="replies-detail"/);
});
