const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('shows sponsorship and the ranking in the modal and settings', async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  try {
    await page.route('**/api/**', (route) => route.fulfill({ json: { configured: false, persistent: false } }));
    await page.route('**/honshena/x-lens/main/sponsors/leaderboard.json', (route) => route.fulfill({
      json: { sponsors: [{ name: 'Supporter', avatar: '', amount: 200 }] },
    }));
    await page.goto('http://127.0.0.1:5173/');
    await page.getByRole('button', { name: '赞助', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByText('Supporter').waitFor();
    assert.equal(await dialog.getByText('200').count(), 0);
    assert.match(await dialog.getByRole('link', { name: '前往爱发电赞助' }).getAttribute('href'), /^https:\/\/afdian\.com/);
    await dialog.getByRole('button', { name: 'Close' }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('dialog').getByText('Supporter').waitFor();
  } finally { await browser.close(); }
});
