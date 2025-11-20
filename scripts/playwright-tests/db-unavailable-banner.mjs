#!/usr/bin/env node
import { chromium } from 'playwright';

const BASE = process.env.A11Y_BASE || 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Route state: first request -> 503, subsequent explicit toggles
  let nextShouldSucceed = false;

  await context.route('**/api/proxy/dashboard', async (route) => {
    if (!nextShouldSucceed) {
      await route.fulfill({
        status: 503,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ success: false, code: 'db_unavailable', error: 'Database unavailable (test)' }),
      });
      return;
    }
    // success response
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true, data: {} }),
    });
  });

  const page = await context.newPage();
  console.log('Opening', BASE);
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for banner to appear (role=status, text)
  const banner = await page.waitForSelector('div[role="status"]', { timeout: 5000 });
  if (banner) console.log('Banner appeared'); else throw new Error('Banner did not appear');

  // Verify text content
  const heading = await banner.$('p.font-medium');
  const headingText = heading ? (await heading.innerText()).trim() : '';
  console.log('Banner heading:', headingText);

  // Test: Retry should succeed when backend recovers
  // Prepare next request to succeed
  nextShouldSucceed = true;

  const retryBtn = await page.getByRole('button', { name: /Retry fetching live data/i }).first();
  if (!retryBtn) throw new Error('Retry button not found');
  await retryBtn.click();

  // Wait for banner to disappear after successful retry
  try {
    await page.waitForSelector('div[role="status"]', { state: 'detached', timeout: 5000 });
    console.log('Banner disappeared after successful Retry');
  } catch (e) {
    throw new Error('Banner did not disappear after Retry');
  }

  // Re-trigger banner by setting nextShouldSucceed = false and reloading
  nextShouldSucceed = false;
  await page.reload({ waitUntil: 'networkidle' });
  const banner2 = await page.waitForSelector('div[role="status"]', { timeout: 5000 });
  console.log('Banner re-appeared after reload');

  // Test: Dismiss persists in localStorage
  const dismissBtn = await page.getByRole('button', { name: /Dismiss database unavailable banner/i }).first();
  if (!dismissBtn) throw new Error('Dismiss button not found');
  await dismissBtn.click();
  // Banner should be gone
  await page.waitForSelector('div[role="status"]', { state: 'detached', timeout: 3000 });
  console.log('Banner dismissed');

  // Check localStorage key
  const dismissedFlag = await page.evaluate(() => {
    try { return localStorage.getItem('dbBannerDismissed'); } catch { return null; }
  });
  console.log('localStorage dbBannerDismissed=', dismissedFlag);
  if (dismissedFlag !== '1') throw new Error('Dismiss did not persist to localStorage');

  await browser.close();
  console.log('Playwright banner test PASSED');
}

run().catch((e) => {
  console.error('Playwright banner test FAILED:', e);
  process.exitCode = 1;
});
