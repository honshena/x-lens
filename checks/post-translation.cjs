const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('collapses long feed posts and translates individual preview replies', async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const post = {
    id: '100', text: 'Long text '.repeat(120), author: { name: 'Author', handle: 'author' },
    createdAt: new Date().toISOString(), replies: 1, reposts: 0, likes: 0, views: 0, media: [],
  };
  const reply = { ...post, id: '101', text: 'A foreign reply', replies: 0 };
  try {
    await page.route('**/api/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const body = pathname === '/api/settings' ? { configured: true }
        : pathname === '/api/feed' ? { posts: [post], nextCursor: null }
          : pathname === '/api/preferences' ? { persistent: false }
            : pathname === '/api/translate' ? { text: '翻译结果' }
              : { replies: [reply], nextCursor: null };
      await route.fulfill({ json: body });
    });
    await page.goto('http://127.0.0.1:5173/');
    const article = page.locator('.post').first();
    const text = article.locator('.post-text');
    await text.waitFor();
    assert.ok((await text.textContent()).length <= 1001);
    await article.getByRole('button', { name: '展开全文' }).click();
    assert.equal(await text.textContent(), post.text);
    await article.getByRole('button', { name: '收起全文' }).click();
    assert.ok((await text.textContent()).length <= 1001);
    const comment = article.locator('.reply').first();
    await comment.getByRole('button', { name: '翻译评论' }).click();
    assert.equal(await comment.locator('.translation').textContent(), '翻译结果');
  } finally {
    await browser.close();
  }
});
