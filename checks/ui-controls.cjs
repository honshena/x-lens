const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('settings alignment, image cursor and reply detail action', async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const post = {
    id: '1', text: 'Test post', author: { name: 'Author', handle: 'author' },
    createdAt: new Date().toISOString(), replies: 1, reposts: 0, likes: 0, views: 0,
    media: [{ url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=' }],
  };
  try {
    await page.route('**/api/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const body = pathname === '/api/settings' ? { configured: true }
        : pathname === '/api/feed' ? { posts: [post], nextCursor: null }
          : pathname === '/api/preferences' ? { persistent: false }
            : { replies: [], nextCursor: null };
      await route.fulfill({ json: body });
    });
    await page.goto('http://127.0.0.1:5173/');
    await page.getByRole('button', { name: '设置' }).click();
    const item = page.locator('.settings-form .ant-segmented-item').first();
    await item.waitFor();
    assert.equal(await item.evaluate((element) => getComputedStyle(element).marginTop), '0px');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    const image = page.locator('.media .ant-image img').first();
    await image.waitFor();
    assert.equal(await image.evaluate((element) => getComputedStyle(element).cursor), 'pointer');
    await image.click();
    await page.locator('.ant-image-preview-wrap').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.ant-image-preview-wrap').waitFor({ state: 'hidden' });
    const button = page.locator('.replies-heading button[aria-label="查看帖子详情"]');
    assert.equal(await button.count(), 1);
    await button.click();
    await page.getByRole('dialog', { name: '帖子详情' }).waitFor();
    const scrollbar = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement, '::-webkit-scrollbar');
      const overlay = getComputedStyle(document.querySelector('.detail-overlay'), '::-webkit-scrollbar');
      const rootStyle = getComputedStyle(document.documentElement);
      const overlayStyle = getComputedStyle(document.querySelector('.detail-overlay'));
      return {
        rootWidth: root.width, overlayWidth: overlay.width,
        rootColor: rootStyle.scrollbarColor, overlayColor: overlayStyle.scrollbarColor,
        rootSize: rootStyle.scrollbarWidth, overlaySize: overlayStyle.scrollbarWidth,
      };
    });
    assert.equal(scrollbar.rootWidth, scrollbar.overlayWidth);
    assert.equal(scrollbar.rootColor, scrollbar.overlayColor);
    assert.equal(scrollbar.rootSize, scrollbar.overlaySize);
  } finally {
    await browser.close();
  }
});
