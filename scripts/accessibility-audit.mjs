#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const OUTDIR = path.resolve('logs');
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

const seedUrl = 'http://localhost:3000/';
const pages = [seedUrl, 'http://localhost:3000/dashboard', 'http://localhost:3000/incidents'];

const AXE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.6.3/axe.min.js';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  for (const p of pages) {
    const page = await context.newPage();
    try {
      console.log('Visiting', p.url);
      const res = await page.goto(p, { waitUntil: 'networkidle', timeout: 30000 });
      if (!res || res.status() >= 400) {
        console.warn(`Page ${p.url} returned status ${res ? res.status() : 'NO-RESPONSE'}`);
      }

      // Inject axe
      await page.addScriptTag({ url: AXE_CDN });

      // Run axe
      const result = await page.evaluate(async () => {
         
        return await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2aa', 'best-practice'] } });
      });

      const name = new URL(p).pathname.replace(/\//g, '_') || 'home';
      const outPath = path.join(OUTDIR, `accessibility-${name || 'home'}.json`);
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
      console.log('Saved', outPath);
    } catch (err) {
      console.error('Error auditing', p.url, String(err));
      fs.writeFileSync(path.join(OUTDIR, `accessibility-${p.name}-error.txt`), String(err));
    } finally {
      await page.close();
    }
  }
  
  // Crawl seed page for same-origin links and audit them too (up to 10)
  try {
    const page = await context.newPage();
    await page.goto(seedUrl, { waitUntil: 'networkidle' });
    const hrefs = await page.$$eval('a[href^="/"]', (els) => Array.from(new Set(els.map(e => e.href))));
    await page.close();

    const toVisit = hrefs.slice(0, 10).filter(u => !pages.includes(u));
    for (const u of toVisit) {
      const page2 = await context.newPage();
      try {
        console.log('Crawled visit', u);
        const res = await page2.goto(u, { waitUntil: 'networkidle', timeout: 30000 });
        if (!res || res.status() >= 400) {
          console.warn(`Page ${u} returned status ${res ? res.status() : 'NO-RESPONSE'}`);
        }
        await page2.addScriptTag({ url: AXE_CDN });
        const result = await page2.evaluate(async () => {
          return await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2aa', 'best-practice'] } });
        });
        const name = new URL(u).pathname.replace(/\//g, '_') || 'home';
        const outPath = path.join(OUTDIR, `accessibility-${name || 'page'}.json`);
        fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
        console.log('Saved', outPath);
      } catch (err) {
        console.error('Error auditing crawled page', u, String(err));
      } finally {
        await page2.close();
      }
    }
  } catch (e) {
    console.warn('Crawl step failed:', String(e));
  }

  // Aggregate simple markdown summary of top failures
  try {
    const files = fs.readdirSync(OUTDIR).filter(f => f.endsWith('.json'));
    const summary = [];
    for (const f of files) {
      const content = JSON.parse(fs.readFileSync(path.join(OUTDIR, f)));
      const failures = content.violations || [];
      if (failures.length > 0) {
        summary.push({ file: f, count: failures.length, top: failures.slice(0,3).map(v => ({ id: v.id, impact: v.impact, help: v.help })) });
      }
    }
    const md = ['# Accessibility Audit Summary', '', `Generated: ${new Date().toISOString()}`, ''];
    if (summary.length === 0) md.push('No violations found in scanned pages.');
    for (const s of summary) {
      md.push(`## ${s.file}`);
      md.push(`- Violations: ${s.count}`);
      for (const t of s.top) {
        md.push(`  - ${t.id} (${t.impact}) — ${t.help}`);
      }
      md.push('');
    }
    fs.writeFileSync(path.join(OUTDIR, 'accessibility-summary.md'), md.join('\n'));
    console.log('Wrote accessibility-summary.md');
  } catch (e) {
    console.warn('Could not write summary:', String(e));
  }
  await browser.close();
}

run().catch((e) => {
  console.error('Audit failed:', e);
  process.exitCode = 1;
});
