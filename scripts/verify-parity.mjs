#!/usr/bin/env node
import fs from 'fs';
import { load as cheerioLoad } from 'cheerio';

function formatLocalTime(iso) {
  const d = new Date(iso);
  try {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  } catch {
    return d.toLocaleTimeString();
  }
}

function humanizeStatus(status) {
  if (!status) return '';
  const map = { operational: 'Operational', major_outage: 'Major Outage', partial_outage: 'Partial Outage' };
  return map[status] || status;
}

async function fetchBackend(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`backend fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchFrontendHtml(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`frontend fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

function parseFrontendServices(html) {
  const $ = cheerioLoad(html);
  const services = [];
  // Each card is a direct child of the grid
  $('.grid > div').each((i, el) => {
    const card = $(el);
    const name = card.find('h3').first().text().trim();
    const statusLabel = card.find('span.text-sm').first().text().trim();
    const lastCheckedText = card.find('div.text-xs span').text().trim();
    // lastCheckedText often like 'Last checked: 10:38:01 PM'
    const lastMatch = lastCheckedText.replace(/\s+/g, ' ').trim().replace(/^Last checked:\s*/i, '');
    const dot = card.find('div.w-3.h-3').first().attr('class') || '';
    const isUp = dot.includes('bg-green');
    services.push({ name, statusLabel, lastCheckedText: lastMatch, isUp });
  });
  return services;
}

function compare(backendList, frontendList) {
  const byName = new Map(frontendList.map(s => [s.name, s]));
  const diffs = [];
  for (const b of backendList) {
    const f = byName.get(b.name);
    if (!f) {
      diffs.push({ type: 'missing_frontend', name: b.name });
      continue;
    }
    const expectedStatus = humanizeStatus(b.status);
    if ((f.statusLabel || '').toLowerCase() !== (expectedStatus || '').toLowerCase()) {
      diffs.push({ type: 'status_mismatch', name: b.name, backend: expectedStatus, frontend: f.statusLabel });
    }
    const expectedTime = formatLocalTime(b.lastChecked);
    // Allow second-level tolerance: exact string compare
    if (f.lastCheckedText !== expectedTime) {
      diffs.push({ type: 'time_mismatch', name: b.name, backend: expectedTime, frontend: f.lastCheckedText });
    }
    if (Boolean(b.isUp) !== Boolean(f.isUp)) {
      diffs.push({ type: 'isUp_mismatch', name: b.name, backend: b.isUp, frontend: f.isUp });
    }
  }
  return diffs;
}

async function main() {
  const backendUrl = process.env.BACKEND_API || 'http://localhost:5555/api/dashboard/summary';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001/dashboard';
  console.log(`Fetching backend: ${backendUrl}`);
  let backendJson;
  try {
    backendJson = await fetchBackend(backendUrl);
  } catch (err) {
    console.error('Error fetching backend:', err.message || err);
    try {
      fs.mkdirSync('./logs', { recursive: true });
      fs.writeFileSync('./logs/backend-fetch-error.txt', String(err.stack || err));
    } catch {
      // ignore filesystem write errors
    }
    process.exit(2);
  }
  if (!backendJson || !backendJson.data) {
    console.error('Backend returned unexpected payload');
    try { fs.mkdirSync('./logs', { recursive: true }); fs.writeFileSync('./logs/backend-raw.json', JSON.stringify(backendJson)); } catch {}
    process.exit(2);
  }
  console.log(`Fetching frontend: ${frontendUrl}`);
  let html;
  try {
    html = await fetchFrontendHtml(frontendUrl);
  } catch (err) {
    console.error('Error fetching frontend:', err.message || err);
    try {
      fs.mkdirSync('./logs', { recursive: true });
      fs.writeFileSync('./logs/frontend-fetch-error.txt', String(err.stack || err));
  } catch {}
    process.exit(2);
  }

  // persist raw responses to help CI debugging
  try {
    fs.mkdirSync('./logs', { recursive: true });
    fs.writeFileSync('./logs/backend-raw.json', JSON.stringify(backendJson, null, 2));
    fs.writeFileSync('./logs/frontend-raw.html', String(html));
  } catch {
    // ignore write errors
  }

  const frontendServices = parseFrontendServices(html);
  const diffs = compare(backendJson.data, frontendServices);

  const out = { backendCount: backendJson.data.length, frontendCount: frontendServices.length, diffs };
  const reportPath = './logs/parity-report.json';
  try { fs.mkdirSync('./logs', { recursive: true }); fs.writeFileSync(reportPath, JSON.stringify(out, null, 2)); } catch {
    // ignore
  }
  console.log('\nParity report written to', reportPath);
  if (diffs.length === 0) {
    console.log('\nPARITY OK ✅ — no differences found.');
    process.exit(0);
  }
  console.log('\nPARITY ISSUES ❌');
  for (const d of diffs) {
    if (d.type === 'missing_frontend') console.log(`- missing in frontend: ${d.name}`);
    if (d.type === 'status_mismatch') console.log(`- status mismatch ${d.name}: backend='${d.backend}' frontend='${d.frontend}'`);
    if (d.type === 'time_mismatch') console.log(`- time mismatch ${d.name}: backend='${d.backend}' frontend='${d.frontend}'`);
    if (d.type === 'isUp_mismatch') console.log(`- isUp mismatch ${d.name}: backend=${d.backend} frontend=${d.frontend}`);
  }
  process.exit(3);
}

main();
