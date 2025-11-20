#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
(async function(){
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.notification.findMany({ select: { id: true, userId: true, attempts: true, lastError: true, sent: true, sentAt: true } });
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('inspect error:', err && err.message ? err.message : err);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
})();
