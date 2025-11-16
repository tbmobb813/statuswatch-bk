#!/usr/bin/env node
'use strict'
import path from 'path';

async function main() {
  try {
    const mod = await import(path.join(process.cwd(), 'src', 'lib', 'monitoring'));
    // module may export as default or named
    const svc = mod.monitoringService ?? (mod.default && mod.default.monitoringService) ?? mod.default ?? mod.monitoringService;
    if (!svc || typeof svc.checkAllServices !== 'function') {
      console.error('Could not find monitoringService in module exports.');
      process.exit(2);
    }
    await svc.checkAllServices();
    console.log('Monitoring run completed');
  } catch (err) {
    console.error('Error running monitoring:', err.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
