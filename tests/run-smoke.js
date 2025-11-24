#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict'

const { exec } = require('child_process');
const axios = require('axios');

function runMonitor() {
  console.log('Running monitor smoke test (this will execute scrapers once)...');
  return new Promise((resolve, reject) => {
    const child = exec('npm run monitor:run', { cwd: process.cwd(), env: process.env, timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('monitor:run failed:', err);
        console.error(stderr);
        return reject(err);
      }
      console.log(stdout);
      resolve();
    });

    if (child.stdout) child.stdout.pipe(process.stdout);
    if (child.stderr) child.stderr.pipe(process.stderr);
  });
}

async function checkHealth() {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const healthUrl = `${url.replace(/\/$/, '')}/api/health`;
  console.log(`Checking health endpoint at ${healthUrl} (if available)...`);
  try {
    const res = await axios.get(healthUrl, { timeout: 5000 });
    if (res.status === 200) {
      console.log('Health endpoint OK');
      return;
    }
    console.warn('Health endpoint returned status:', res.status);
  } catch (e) {
    // ignore health check failures (server may not be running)
    console.warn('Health check skipped or failed (server may not be running):', e && e.message ? e.message : String(e));
  }
}

async function checkReady() {
  const url = process.env.API_URL || 'http://localhost:5555';
  const readyUrl = `${url.replace(/\/$/, '')}/ready`;
  console.log(`Checking backend readiness at ${readyUrl}...`);
  try {
    const res = await axios.get(readyUrl, { timeout: 5000 });
    if (res.status === 200) {
      console.log('Backend readiness OK');
      return;
    }
    console.warn('Readiness endpoint returned status:', res.status);
  } catch (e) {
    console.warn('Readiness check failed:', e && e.message ? e.message : String(e));
    // Rethrow so smoke test fails early if backend not ready
    throw e;
  }
}

(async () => {
  try {
  await checkReady();
  await runMonitor();
  await checkHealth();
    console.log('SMOKE TESTS PASSED');
    process.exit(0);
  } catch (err) {
    console.error('SMOKE TESTS FAILED', err && err.message ? err.message : String(err));
    process.exit(1);
  }
})();
