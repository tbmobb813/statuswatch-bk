#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
(async function(){
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' ORDER BY ordinal_position`;
    console.log('notifications columns:', rows.map(r => r.column_name));
  } catch (err) {
    console.error('inspect error:', err && err.message ? err.message : err);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
})();
