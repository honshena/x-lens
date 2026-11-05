const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('detail opens in an independent overlay without changing feed scroll or history', async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  try {
    const posts = Array.from({ length: 100 }, (_, index) => ({
      id: String(index + 1), text: `Post ${index + 1} ` + 'content '.repeat(20 + index % 9 * 20),
      author: { name: `Author ${index + 1}`, handle: `author${index + 1}` },
      createdAt: new Date().toISOString(), media: [], replies: 0, reposts: 0, likes: 0, views: 0,
    }));
    let detailRequests = 0;
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/replies')) detailRequests += 1;
      const body = url.pathname === '/api/settings' ? { configured: true }
        : url.pathname === '/api/feed' ? { posts, nextCursor: null }
          : url.pathname === '/api/preferences' ? { persistent: false }
            : { replies: posts.slice(0, 12), nextCursor: detailRequests === 1 ? 'next' : null };
      await route.fulfill({ json: body });
    });
    await page.goto('http://127.0.0.1:5173/');
    await page.locator('.post-action').first().waitFor();
    await page.evaluate(() => window.scrollTo(0, 5000));
    await page.waitForTimeout(500);
    const button = page.locator('.post-action:visible').nth(2);
    await button.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      document.addEventListener('click', () => {
        window.__feedBeforeDetail = { scroll: window.scrollY, history: history.length, url: location.href };
      }, { capture: true, once: true });
    });
    await button.click();
    const before = await page.evaluate(() => window.__feedBeforeDetail);
    const overlay = page.locator('.detail-overlay');
    await overlay.waitFor({ timeout: 3000 });
    const opened = await page.evaluate(() => ({ scroll: window.scrollY, history: history.length, url: location.href }));
    assert.deepEqual(opened, before);
    await page.waitForFunction(() => document.querySelectorAll('.detail-main .post').length > 1);
    await overlay.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.waitForFunction(() => document.querySelector('.detail-overlay').scrollTop > 0);
    await page.waitForTimeout(300);
    assert.equal(detailRequests, 2);
    assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - before.scroll) <= 10);
    await page.getByRole('button', { name: '返回推荐' }).click();
    await overlay.waitFor({ state: 'detached' });
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.scrollY);
    assert.ok(Math.abs(after - before.scroll) <= 10, `before=${before.scroll}, after=${after}`);
  } finally {
    await browser.close();
  }
});
