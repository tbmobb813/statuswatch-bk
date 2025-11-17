import fs from 'fs';
import { chromium } from 'playwright';

(async () => {
  const out = {
    url: 'http://localhost:3000/',
    timestamp: new Date().toISOString(),
    console: [],
    network: [],
    status: 'unknown',
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    out.console.push({ type: msg.type(), text: msg.text() });
  });

  page.on('requestfinished', async request => {
    try {
      const response = await request.response();
      if (!response) return;
      const url = request.url();
      // capture only API paths we care about or page
      if (url.includes('/api/incidents') || url.includes('/api/uptime') || url === out.url) {
        const headers = response.headers();
        let body = null;
        try {
          // attempt to read up to 100KB of text
          body = await response.text();
          if (body && body.length > 100000) body = body.slice(0, 100000) + '...[truncated]';
        } catch (e) {
          body = `unable to read body: ${String(e)}`;
        }
        out.network.push({ url, status: response.status(), headers, body });
      }
    } catch (e) {
      out.network.push({ url: request.url(), error: String(e) });
    }
  });

  try {
    const resp = await page.goto(out.url, { waitUntil: 'networkidle' , timeout: 30000});
    out.status = resp ? `loaded ${resp.status()}` : 'no-response';

    // give client JS a moment to run and trigger fetches
    await page.waitForTimeout(1500);

    // take screenshot
    const screenshotPath = '/tmp/playwright-screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    out.screenshot = screenshotPath;

    // dump a small page DOM snapshot
    const html = await page.content();
    out.domSnapshot = html.slice(0, 200000); // limit size

    // write results
    const outPath = '/tmp/playwright-results.json';
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log('Playwright check done. Results:', outPath, 'screenshot:', screenshotPath);
  } catch (err) {
    console.error('Playwright check failed:', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
