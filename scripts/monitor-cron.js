#!/usr/bin/env node
'use strict'

const { exec } = require('child_process');
const cron = require('node-cron');

function runMonitor() {
  console.log(new Date().toISOString(), 'Running monitoring...');
  const p = exec('npm run monitor:run', { cwd: process.cwd() });

  p.stdout && p.stdout.on('data', (d) => process.stdout.write(d));
  p.stderr && p.stderr.on('data', (d) => process.stderr.write(d));

  p.on('close', (code) => {
    console.log(new Date().toISOString(), `monitor finished with code ${code}`);
  });
}

// run immediately then every 5 minutes
console.log('Starting monitoring cron (every 5 minutes)');
runMonitor();
cron.schedule('*/5 * * * *', runMonitor);
